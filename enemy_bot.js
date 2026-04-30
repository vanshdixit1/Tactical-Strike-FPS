/* ========================================
   BOT AI SYSTEM - FIXED
   Enemy bots with patrol, chase, combat
   ======================================== */

const BOT_STATES = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    COMBAT: 'combat',
    DEAD: 'dead'
};

const DIFFICULTY_SETTINGS = {
    easy: {
        reactionTime: 1200,
        accuracy: 0.2,
        fireRate: 1200,
        damage: 8,
        moveSpeed: 2.5,
        detectionRange: 30,
        fov: 90,
        health: 80
    },
    normal: {
        reactionTime: 700,
        accuracy: 0.35,
        fireRate: 800,
        damage: 12,
        moveSpeed: 3.5,
        detectionRange: 45,
        fov: 110,
        health: 100
    },
    hard: {
        reactionTime: 350,
        accuracy: 0.55,
        fireRate: 500,
        damage: 18,
        moveSpeed: 4.5,
        detectionRange: 60,
        fov: 140,
        health: 120
    }
};

class Bot {
    constructor(scene, position, difficulty, collisionBoxes, navPoints) {
        this.scene = scene;
        this.difficulty = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.normal;
        this.collisionBoxes = collisionBoxes; // pre-computed AABB array
        this.navPoints = navPoints;

        this.health = this.difficulty.health;
        this.maxHealth = this.difficulty.health;
        this.state = BOT_STATES.PATROL;

        // Position: x,z on ground, y is always 0 (ground level for the group)
        this.position = new THREE.Vector3(position.x, 0, position.z);
        this.velocity = new THREE.Vector3();
        this.rotation = Math.random() * Math.PI * 2;
        this.moveSpeed = this.difficulty.moveSpeed;

        this.patrolTarget = null;
        this.patrolWaitTime = 0;
        this.patrolIndex = Math.floor(Math.random() * navPoints.length);
        this.stuckTimer = 0;

        this.lastFireTime = 0;
        this.lastSeenPlayer = null;
        this.lastSeenTime = 0;
        this.reactionTimer = 0;
        this.hasReacted = false;

        this.bobPhase = Math.random() * Math.PI * 2;

        this.mesh = this.createBotMesh();
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);

        this.radius = 0.5;
        this.bodyBox = new THREE.Box3();
        this.headBox = new THREE.Box3();
        this.updateBoundingBoxes();
    }

    createBotMesh() {
        const group = new THREE.Group();

        const skinMat = new THREE.MeshPhongMaterial({ color: 0xc4956a, specular: 0x222222, shininess: 10 });
        const uniformMat = new THREE.MeshPhongMaterial({ color: 0x4a3728, specular: 0x111111, shininess: 5 });
        const pantsMat = new THREE.MeshPhongMaterial({ color: 0x3a3a2a, specular: 0x111111, shininess: 5 });
        const bootMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, specular: 0x222222, shininess: 20 });
        const vestMat = new THREE.MeshPhongMaterial({ color: 0x2d4a2d, specular: 0x111111, shininess: 10 });
        const helmetMat = new THREE.MeshPhongMaterial({ color: 0x3a4a3a, specular: 0x333333, shininess: 30 });
        const gunMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, specular: 0x666666, shininess: 60 });
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xcc0000, emissiveIntensity: 0.6 });

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), skinMat);
        head.position.y = 1.55;
        head.name = 'head';
        group.add(head);

        // Helmet
        const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.34), helmetMat);
        helmet.position.y = 1.68;
        group.add(helmet);

        // Eyes
        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), eyeMat);
        leftEye.position.set(-0.08, 1.56, -0.16);
        group.add(leftEye);
        const rightEye = leftEye.clone();
        rightEye.position.x = 0.08;
        group.add(rightEye);

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.28), uniformMat);
        torso.position.y = 1.1;
        group.add(torso);

        // Vest
        const vest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.4, 0.32), vestMat);
        vest.position.y = 1.15;
        group.add(vest);

        // Arms
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), uniformMat);
        leftArm.position.set(-0.32, 1.1, -0.05);
        leftArm.name = 'leftArm';
        group.add(leftArm);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), uniformMat);
        rightArm.position.set(0.32, 1.1, -0.05);
        rightArm.name = 'rightArm';
        group.add(rightArm);

        // Hands
        const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), skinMat);
        leftHand.position.set(-0.32, 0.82, -0.1);
        group.add(leftHand);
        const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), skinMat);
        rightHand.position.set(0.32, 0.82, -0.15);
        group.add(rightHand);

        // Weapon
        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.45), gunMat);
        gunBody.position.set(0.25, 0.9, -0.3);
        group.add(gunBody);
        const gunMag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.04), gunMat);
        gunMag.position.set(0.25, 0.82, -0.2);
        group.add(gunMag);

        // Legs
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.45, 0.15), pantsMat);
        leftLeg.position.set(-0.12, 0.5, 0);
        leftLeg.name = 'leftLeg';
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.45, 0.15), pantsMat);
        rightLeg.position.set(0.12, 0.5, 0);
        rightLeg.name = 'rightLeg';
        group.add(rightLeg);

        // Boots
        const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.22), bootMat);
        leftBoot.position.set(-0.12, 0.08, -0.02);
        group.add(leftBoot);
        const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.22), bootMat);
        rightBoot.position.set(0.12, 0.08, -0.02);
        group.add(rightBoot);

        return group;
    }

    updateBoundingBoxes() {
        const p = this.position;
        // Body: from feet to shoulders
        this.bodyBox.min.set(p.x - 0.3, 0.0, p.z - 0.3);
        this.bodyBox.max.set(p.x + 0.3, 1.4, p.z + 0.3);
        // Head: above shoulders
        this.headBox.min.set(p.x - 0.18, 1.4, p.z - 0.18);
        this.headBox.max.set(p.x + 0.18, 1.85, p.z + 0.18);
    }

    canSeePlayer(playerPos) {
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > this.difficulty.detectionRange) return false;

        // FOV check
        const forward = new THREE.Vector3(-Math.sin(this.rotation), 0, -Math.cos(this.rotation));
        const toP = new THREE.Vector3(dx, 0, dz).normalize();
        const dot = forward.dot(toP);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
        if (angle > this.difficulty.fov / 2) return false;

        // Simple line-of-sight using raycaster against colliders
        const origin = new THREE.Vector3(this.position.x, 1.2, this.position.z);
        const dir3d = new THREE.Vector3(playerPos.x - this.position.x, playerPos.y - 1.2 - this.position.y, playerPos.z - this.position.z).normalize();
        const ray = new THREE.Raycaster(origin, dir3d, 0, dist);

        // Only check large colliders (walls/buildings), skip small objects
        const largeColliders = [];
        for (const cb of this.collisionBoxes) {
            const size = Math.max(cb.max.x - cb.min.x, cb.max.z - cb.min.z);
            if (size > 2) largeColliders.push(cb);
        }

        // Manual box-ray intersection for performance
        for (const box of largeColliders) {
            if (this.rayIntersectsBox(origin, dir3d, box, dist)) {
                return false;
            }
        }

        return true;
    }

    rayIntersectsBox(origin, dir, box, maxDist) {
        let tmin = (box.min.x - origin.x) / (dir.x || 0.0001);
        let tmax = (box.max.x - origin.x) / (dir.x || 0.0001);
        if (tmin > tmax) { const t = tmin; tmin = tmax; tmax = t; }

        let tymin = (box.min.y - origin.y) / (dir.y || 0.0001);
        let tymax = (box.max.y - origin.y) / (dir.y || 0.0001);
        if (tymin > tymax) { const t = tymin; tymin = tymax; tymax = t; }

        if (tmin > tymax || tymin > tmax) return false;
        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;

        let tzmin = (box.min.z - origin.z) / (dir.z || 0.0001);
        let tzmax = (box.max.z - origin.z) / (dir.z || 0.0001);
        if (tzmin > tzmax) { const t = tzmin; tzmin = tzmax; tzmax = t; }

        if (tmin > tzmax || tzmin > tmax) return false;
        if (tzmin > tmin) tmin = tzmin;

        return tmin > 0 && tmin < maxDist;
    }

    takeDamage(amount) {
        this.health -= amount;

        // Flash red on hit
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                const origEmissive = child.material.emissive ? child.material.emissive.getHex() : 0;
                child.material.emissive = new THREE.Color(0xff0000);
                child.material.emissiveIntensity = 0.8;
                setTimeout(() => {
                    if (child.material) {
                        child.material.emissive = new THREE.Color(origEmissive);
                        child.material.emissiveIntensity = 0;
                    }
                }, 120);
            }
        });

        if (this.health <= 0) {
            this.die();
            return true;
        }

        // Alert: enter combat even if player not visible
        this.state = BOT_STATES.COMBAT;
        this.hasReacted = true;
        return false;
    }

    die() {
        this.state = BOT_STATES.DEAD;
        this.health = 0;
        audioEngine.playBotDeath();

        // Fall animation
        const fallDir = Math.random() > 0.5 ? 1 : -1;
        let progress = 0;
        const interval = setInterval(() => {
            progress += 0.06;
            this.mesh.rotation.x = fallDir * progress * (Math.PI / 2);
            this.mesh.position.y = Math.max(-0.5, -progress * 0.8);
            if (progress >= 1) clearInterval(interval);
        }, 16);

        setTimeout(() => {
            if (this.mesh.parent) this.scene.remove(this.mesh);
        }, 4000);
    }

    update(deltaTime, playerPos) {
        if (this.state === BOT_STATES.DEAD) return null;

        const dt = deltaTime / 1000;
        let shotFired = null;

        const canSee = this.canSeePlayer(playerPos);

        if (canSee) {
            this.lastSeenPlayer = playerPos.clone();
            this.lastSeenTime = performance.now();

            if (!this.hasReacted) {
                this.reactionTimer += deltaTime;
                if (this.reactionTimer >= this.difficulty.reactionTime) {
                    this.hasReacted = true;
                    this.state = BOT_STATES.COMBAT;
                }
            } else {
                this.state = BOT_STATES.COMBAT;
            }
        } else {
            if (this.state === BOT_STATES.COMBAT) {
                // Lost sight: chase to last known position
                if (this.lastSeenPlayer) {
                    this.state = BOT_STATES.CHASE;
                }
            }
            if (performance.now() - this.lastSeenTime > 4000) {
                this.state = BOT_STATES.PATROL;
                this.hasReacted = false;
                this.reactionTimer = 0;
            }
        }

        switch (this.state) {
            case BOT_STATES.PATROL:
                this.updatePatrol(dt);
                break;
            case BOT_STATES.CHASE:
                this.updateChase(dt, playerPos);
                break;
            case BOT_STATES.COMBAT:
                shotFired = this.updateCombat(dt, playerPos);
                break;
        }

        // Walking animation
        const speed = this.velocity.length();
        if (speed > 0.3) {
            this.bobPhase += dt * 8;
            const legSwing = Math.sin(this.bobPhase * 4) * 0.35;
            const armSwing = Math.sin(this.bobPhase * 4) * 0.25;
            this.mesh.traverse((child) => {
                if (child.name === 'leftLeg') child.rotation.x = legSwing;
                if (child.name === 'rightLeg') child.rotation.x = -legSwing;
                if (child.name === 'leftArm') child.rotation.x = -armSwing;
                if (child.name === 'rightArm') child.rotation.x = armSwing;
            });
        }

        this.mesh.position.set(this.position.x, 0, this.position.z);
        this.mesh.rotation.y = this.rotation;
        this.updateBoundingBoxes();

        return shotFired;
    }

    updatePatrol(dt) {
        if (!this.patrolTarget || this.distXZ(this.position, this.patrolTarget) < 2) {
            this.patrolIndex = (this.patrolIndex + 1) % this.navPoints.length;
            this.patrolTarget = this.navPoints[this.patrolIndex].clone();
            this.patrolWaitTime = 0.5 + Math.random() * 1.5;
        }

        if (this.patrolWaitTime > 0) {
            this.patrolWaitTime -= dt;
            this.velocity.set(0, 0, 0);
            return;
        }

        this.moveToward(this.patrolTarget, dt, this.moveSpeed * 0.5);
    }

    updateChase(dt, playerPos) {
        const target = this.lastSeenPlayer || playerPos;
        if (this.distXZ(this.position, target) < 2) {
            this.state = BOT_STATES.PATROL;
            return;
        }
        this.moveToward(target, dt, this.moveSpeed * 0.8);
    }

    updateCombat(dt, playerPos) {
        if (!this.hasReacted) return null;

        // Face the player
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        this.rotation = Math.atan2(-dx, -dz);

        const dist = Math.sqrt(dx * dx + dz * dz);

        // Strafe while fighting
        const strafePhase = Math.sin(performance.now() * 0.0015 + this.patrolIndex) * 0.7;
        const moveX = Math.cos(this.rotation) * strafePhase;
        const moveZ = -Math.sin(this.rotation) * strafePhase;

        let advanceX = 0, advanceZ = 0;
        if (dist < 6) {
            // Back away
            advanceX = Math.sin(this.rotation) * 0.5;
            advanceZ = Math.cos(this.rotation) * 0.5;
        } else if (dist > 25) {
            // Approach
            advanceX = -Math.sin(this.rotation) * 0.6;
            advanceZ = -Math.cos(this.rotation) * 0.6;
        }

        const newX = this.position.x + (moveX + advanceX) * this.moveSpeed * dt;
        const newZ = this.position.z + (moveZ + advanceZ) * this.moveSpeed * dt;

        if (this.canMoveTo(newX, newZ)) {
            this.position.x = newX;
            this.position.z = newZ;
            this.velocity.set(moveX + advanceX, 0, moveZ + advanceZ);
        }

        // Fire at player
        const now = performance.now();
        if (now - this.lastFireTime > this.difficulty.fireRate) {
            this.lastFireTime = now;
            audioEngine.playRifleShot();
            if (Math.random() < this.difficulty.accuracy) {
                return { damage: this.difficulty.damage, fromPosition: this.position.clone() };
            }
        }

        return null;
    }

    moveToward(target, dt, speed) {
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.5) {
            this.velocity.set(0, 0, 0);
            return;
        }

        const dirX = dx / dist;
        const dirZ = dz / dist;
        this.rotation = Math.atan2(-dirX, -dirZ);

        const newX = this.position.x + dirX * speed * dt;
        const newZ = this.position.z + dirZ * speed * dt;

        if (this.canMoveTo(newX, newZ)) {
            this.position.x = newX;
            this.position.z = newZ;
            this.velocity.set(dirX * speed, 0, dirZ * speed);
            this.stuckTimer = 0;
        } else {
            // Try alternate directions to navigate around obstacle
            this.stuckTimer += dt;
            const angles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI * 0.75, -Math.PI * 0.75];
            for (const angle of angles) {
                const cos = Math.cos(angle), sin = Math.sin(angle);
                const altX = dirX * cos - dirZ * sin;
                const altZ = dirX * sin + dirZ * cos;
                const testX = this.position.x + altX * speed * dt;
                const testZ = this.position.z + altZ * speed * dt;
                if (this.canMoveTo(testX, testZ)) {
                    this.position.x = testX;
                    this.position.z = testZ;
                    this.velocity.set(altX * speed, 0, altZ * speed);
                    break;
                }
            }

            // If stuck too long, teleport to nearest nav point
            if (this.stuckTimer > 3) {
                this.stuckTimer = 0;
                let nearest = this.navPoints[0];
                let nearDist = Infinity;
                for (const np of this.navPoints) {
                    const d = this.distXZ(this.position, np);
                    if (d < nearDist && d > 3 && this.canMoveTo(np.x, np.z)) {
                        nearDist = d;
                        nearest = np;
                    }
                }
                this.position.x = nearest.x;
                this.position.z = nearest.z;
            }
        }
    }

    canMoveTo(x, z) {
        if (Math.abs(x) > 47 || Math.abs(z) > 47) return false;

        const r = this.radius;
        const botMin = { x: x - r, z: z - r };
        const botMax = { x: x + r, z: z + r };

        for (const box of this.collisionBoxes) {
            // 2D overlap check (ignore Y for ground-level movement)
            if (botMax.x > box.min.x && botMin.x < box.max.x &&
                botMax.z > box.min.z && botMin.z < box.max.z &&
                box.max.y > 0.3) { // Only collide with objects taller than ankle height
                return false;
            }
        }
        return true;
    }

    distXZ(a, b) {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
}

class BotManager {
    constructor(scene, difficulty, colliders, navPoints) {
        this.scene = scene;
        this.difficulty = difficulty;
        this.navPoints = navPoints;
        this.bots = [];

        // Pre-compute AABB collision boxes from colliders ONCE
        this.collisionBoxes = [];
        for (const col of colliders) {
            const box = new THREE.Box3().setFromObject(col);
            this.collisionBoxes.push(box);
        }
    }

    spawnBots(count, spawnPoints) {
        for (let i = 0; i < count; i++) {
            const spawnIdx = i % spawnPoints.length;
            const basePos = spawnPoints[spawnIdx];

            // Find a valid position near the spawn point
            let pos = new THREE.Vector3(basePos.x, 0, basePos.z);
            let found = false;

            // Try the exact point first, then spiral outward
            for (let attempt = 0; attempt < 20; attempt++) {
                const testX = basePos.x + (Math.random() - 0.5) * attempt * 2;
                const testZ = basePos.z + (Math.random() - 0.5) * attempt * 2;

                if (this.isPositionClear(testX, testZ)) {
                    pos.x = testX;
                    pos.z = testZ;
                    found = true;
                    break;
                }
            }

            // Fallback: use a nav point
            if (!found) {
                const np = this.navPoints[i % this.navPoints.length];
                pos.x = np.x;
                pos.z = np.z;
            }

            const bot = new Bot(this.scene, pos, this.difficulty, this.collisionBoxes, this.navPoints);
            this.bots.push(bot);
        }
    }

    isPositionClear(x, z) {
        if (Math.abs(x) > 47 || Math.abs(z) > 47) return false;
        const r = 0.6;
        for (const box of this.collisionBoxes) {
            if (x + r > box.min.x && x - r < box.max.x &&
                z + r > box.min.z && z - r < box.max.z &&
                box.max.y > 0.3) {
                return false;
            }
        }
        return true;
    }

    update(deltaTime, playerPos) {
        const shots = [];
        for (const bot of this.bots) {
            const shot = bot.update(deltaTime, playerPos);
            if (shot) shots.push(shot);
        }
        return shots;
    }

    getAliveBots() {
        return this.bots.filter(b => b.state !== BOT_STATES.DEAD);
    }

    clear() {
        for (const bot of this.bots) {
            if (bot.mesh && bot.mesh.parent) {
                bot.mesh.parent.remove(bot.mesh);
            }
        }
        this.bots = [];
    }

    checkHit(raycaster) {
        let closestHit = null;
        let closestDist = Infinity;

        for (const bot of this.bots) {
            if (bot.state === BOT_STATES.DEAD) continue;

            // Check headshot first
            const headHit = new THREE.Vector3();
            if (raycaster.ray.intersectBox(bot.headBox, headHit)) {
                const dist = raycaster.ray.origin.distanceTo(headHit);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestHit = { bot, isHeadshot: true, distance: dist };
                }
                continue; // Head hit takes priority
            }

            // Check body
            const bodyHit = new THREE.Vector3();
            if (raycaster.ray.intersectBox(bot.bodyBox, bodyHit)) {
                const dist = raycaster.ray.origin.distanceTo(bodyHit);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestHit = { bot, isHeadshot: false, distance: dist };
                }
            }
        }

        return closestHit;
    }
}
