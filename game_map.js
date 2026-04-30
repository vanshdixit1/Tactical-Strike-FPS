/* ========================================
   MAP BUILDER
   Procedural CS-style map with de_dust theme
   ======================================== */

class GameMap {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];     // Objects for collision
        this.navPoints = [];     // Navigation points for bots
        this.spawnPointsT = [];  // Terrorist spawn points
        this.spawnPointsCT = []; // CT spawn points (player)
        this.mapSize = 50;
    }

    build() {
        this.createSkybox();
        this.createGround();
        this.createWalls();
        this.createBuildings();
        this.createCrates();
        this.createDetails();
        this.createLighting();
        this.setupNavPoints();
        this.setupSpawnPoints();
    }

    createSkybox() {
        // Sky dome
        const skyGeo = new THREE.SphereGeometry(200, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        // Add gradient effect
        const skyColors = skyGeo.getAttribute('position');
        const colors = new Float32Array(skyColors.count * 3);
        for (let i = 0; i < skyColors.count; i++) {
            const y = skyColors.getY(i);
            const t = Math.max(0, Math.min(1, (y + 100) / 300));
            // Sky blue at top, slightly lighter at horizon
            colors[i * 3] = 0.4 + t * 0.13;      // R (approx 0.53 at top)
            colors[i * 3 + 1] = 0.6 + t * 0.21;   // G (approx 0.81 at top)
            colors[i * 3 + 2] = 0.8 + t * 0.12;   // B (approx 0.92 at top)
        }
        skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        skyMat.vertexColors = true;
        
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        // Sun
        const sunGeo = new THREE.SphereGeometry(8, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffaa 
        });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(80, 120, -80);
        this.scene.add(sun);
    }

    createGround() {
        // Main ground
        const groundGeo = new THREE.PlaneGeometry(this.mapSize * 2, this.mapSize * 2, 20, 20);
        const groundMat = new THREE.MeshPhongMaterial({ 
            color: 0xc4a56a,
            specular: 0x222222,
            shininess: 5
        });
        
        // Slight height variation
        const vertices = groundGeo.getAttribute('position');
        for (let i = 0; i < vertices.count; i++) {
            const x = vertices.getX(i);
            const y = vertices.getY(i);
            vertices.setZ(i, (Math.sin(x * 0.3) * Math.cos(y * 0.3)) * 0.1);
        }
        groundGeo.computeVertexNormals();

        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Road/paths
        this.createRoad(0, 0, 60, 6, 0);           // Main East-West road
        this.createRoad(0, 0, 50, 5, Math.PI / 2);  // North-South road
        this.createRoad(20, -15, 30, 4, 0);          // Side road
        this.createRoad(-20, 15, 25, 4, Math.PI / 2); // Side road
    }

    createRoad(x, z, length, width, rotation) {
        const roadGeo = new THREE.PlaneGeometry(length, width);
        const roadMat = new THREE.MeshPhongMaterial({
            color: 0x888880,
            specular: 0x111111,
            shininess: 3
        });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = rotation;
        road.position.set(x, 0.02, z);
        road.receiveShadow = true;
        this.scene.add(road);
    }

    createWalls() {
        const wallMat = new THREE.MeshPhongMaterial({ 
            color: 0xd4b483,
            specular: 0x222222,
            shininess: 8
        });
        const wallMatDark = new THREE.MeshPhongMaterial({ 
            color: 0xb89a6a,
            specular: 0x222222,
            shininess: 8
        });

        // Perimeter walls
        this.createWall(-50, 0, 2, 5, 100, wallMatDark);  // West wall
        this.createWall(50, 0, 2, 5, 100, wallMatDark);   // East wall
        this.createWall(0, -50, 100, 5, 2, wallMatDark);  // North wall
        this.createWall(0, 50, 100, 5, 2, wallMatDark);   // South wall

        // Central compound walls
        this.createWall(-5, -10, 0.4, 3.5, 12, wallMat);
        this.createWall(5, -10, 0.4, 3.5, 12, wallMat);
        this.createWall(0, -16.2, 10.4, 3.5, 0.4, wallMat);
        // Opening in wall
        this.createWall(-3, -4, 0.4, 3.5, 5, wallMat);
        this.createWall(3, -4, 0.4, 3.5, 5, wallMat);

        // Mid area walls
        this.createWall(-15, 5, 8, 3, 0.4, wallMat);
        this.createWall(-15, 12, 0.4, 3, 14.4, wallMat);
        this.createWall(-11, 12, 8, 3, 0.4, wallMat);

        // Far site walls
        this.createWall(20, -5, 12, 3.5, 0.4, wallMat);
        this.createWall(26.2, 0, 0.4, 3.5, 10, wallMat);
        this.createWall(20, 5, 8, 3.5, 0.4, wallMat);

        // Sniper alley walls
        this.createWall(-25, -20, 0.4, 4, 20, wallMat);
        this.createWall(-30, -20, 0.4, 4, 20, wallMat);

        // Back area walls
        this.createWall(15, 20, 0.4, 3, 15, wallMat);
        this.createWall(10, 28, 10, 3, 0.4, wallMat);
    }

    createWall(x, z, w, h, d, material) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const wall = new THREE.Mesh(geo, material);
        wall.position.set(x, h / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
        this.colliders.push(wall);
    }

    createBuildings() {
        // Building A - Bombsite A area
        this.createBuilding(-20, -25, 10, 6, 8, 0xa8845a);
        this.createBuilding(-32, -28, 7, 5, 7, 0xb89a6a);
        
        // Building B - Bombsite B area
        this.createBuilding(25, 18, 9, 5, 9, 0xa8845a);
        this.createBuilding(35, 22, 6, 7, 6, 0xc4a56a);

        // Mid buildings
        this.createBuilding(-8, 20, 8, 4, 6, 0xb89a6a);
        this.createBuilding(12, -20, 7, 5, 7, 0xa8845a);

        // Tower/sniper nest
        this.createBuilding(-35, 10, 5, 8, 5, 0x9a7a5a);

        // Additional buildings for cover
        this.createBuilding(35, -15, 6, 4, 8, 0xb89a6a);
        this.createBuilding(-10, -35, 8, 4, 6, 0xa8845a);
        this.createBuilding(10, 35, 7, 4, 7, 0xb89a6a);
    }

    createBuilding(x, z, w, h, d, color) {
        const mat = new THREE.MeshPhongMaterial({ 
            color: color,
            specular: 0x222222,
            shininess: 5
        });

        // Main structure
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        body.position.set(x, h / 2, z);
        body.castShadow = true;
        body.receiveShadow = true;
        this.scene.add(body);
        this.colliders.push(body);

        // Roof
        const roofMat = new THREE.MeshPhongMaterial({ 
            color: 0x8a6a4a,
            specular: 0x111111,
            shininess: 3
        });
        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5),
            roofMat
        );
        roof.position.set(x, h + 0.15, z);
        roof.castShadow = true;
        this.scene.add(roof);

        // Window openings (dark insets)
        const windowMat = new THREE.MeshPhongMaterial({ 
            color: 0x1a2a3a,
            specular: 0x444444,
            shininess: 40
        });
        
        // Front windows
        for (let i = 0; i < Math.floor(w / 3); i++) {
            const win = new THREE.Mesh(
                new THREE.PlaneGeometry(1.2, 1.5),
                windowMat
            );
            win.position.set(
                x - w/2 + 2 + i * 3, 
                h * 0.6, 
                z - d/2 - 0.01
            );
            this.scene.add(win);
        }

        // Door (darker opening)
        const doorMat = new THREE.MeshPhongMaterial({ color: 0x3d2b1f });
        const door = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 2.5),
            doorMat
        );
        door.position.set(x, 1.25, z - d/2 - 0.01);
        this.scene.add(door);
    }

    createCrates() {
        const crateMat = new THREE.MeshPhongMaterial({ 
            color: 0x8B7355,
            specular: 0x222222,
            shininess: 10
        });
        const metalCrateMat = new THREE.MeshPhongMaterial({ 
            color: 0x556B2F,
            specular: 0x444444,
            shininess: 30
        });

        // Crate positions - strategic cover points
        const cratePositions = [
            // Near bombsite A
            { x: -15, z: -18, s: 1.2, mat: crateMat },
            { x: -17, z: -16, s: 1.0, mat: metalCrateMat },
            { x: -13, z: -20, s: 0.8, mat: crateMat },
            
            // Mid area
            { x: 0, z: 0, s: 1.2, mat: metalCrateMat },
            { x: 2, z: 1, s: 0.8, mat: crateMat },
            { x: -3, z: -1, s: 1.0, mat: crateMat },
            
            // Near bombsite B
            { x: 22, z: 15, s: 1.2, mat: metalCrateMat },
            { x: 24, z: 17, s: 1.0, mat: crateMat },
            { x: 20, z: 13, s: 0.8, mat: crateMat },

            // Along paths
            { x: 10, z: 0, s: 1.0, mat: crateMat },
            { x: -10, z: 0, s: 0.8, mat: metalCrateMat },
            { x: 0, z: 10, s: 1.0, mat: crateMat },
            { x: 0, z: -10, s: 1.2, mat: metalCrateMat },
            
            // Scattered
            { x: -30, z: 5, s: 1.0, mat: crateMat },
            { x: 30, z: -5, s: 1.0, mat: crateMat },
            { x: -5, z: 30, s: 0.8, mat: metalCrateMat },
            { x: 5, z: -30, s: 0.8, mat: crateMat },

            // Additional cover
            { x: -25, z: -10, s: 1.0, mat: metalCrateMat },
            { x: 35, z: 5, s: 1.2, mat: crateMat },
            { x: -40, z: -5, s: 1.0, mat: crateMat },
            { x: 15, z: -10, s: 0.8, mat: metalCrateMat },
        ];

        cratePositions.forEach(cp => {
            this.createCrate(cp.x, cp.z, cp.s, cp.mat);
        });

        // Stacked crates at some positions
        this.createCrate(-15, -18, 0.8, crateMat, 1.2);
        this.createCrate(22, 15, 0.7, metalCrateMat, 1.2);
        this.createCrate(0, 0, 0.6, crateMat, 1.2);
    }

    createCrate(x, z, size, material, yOffset) {
        const y = yOffset || 0;
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            material
        );
        crate.position.set(x, size / 2 + y, z);
        crate.castShadow = true;
        crate.receiveShadow = true;
        crate.rotation.y = Math.random() * 0.3;
        this.scene.add(crate);
        this.colliders.push(crate);

        // Cross pattern on crate
        const crossMat = new THREE.MeshPhongMaterial({ 
            color: material.color.getHex() * 0.8 
        });
        const crossH = new THREE.Mesh(
            new THREE.BoxGeometry(size * 0.8, 0.05, 0.05),
            crossMat
        );
        crossH.position.set(x, size / 2 + y, z - size/2 - 0.03);
        this.scene.add(crossH);
        
        const crossV = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, size * 0.8, 0.05),
            crossMat
        );
        crossV.position.set(x, size / 2 + y, z - size/2 - 0.03);
        this.scene.add(crossV);
    }

    createDetails() {
        // Barrels
        const barrelMat = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            specular: 0x666666,
            shininess: 40
        });
        
        const barrelPositions = [
            { x: -18, z: -22 }, { x: 28, z: 20 },
            { x: -8, z: 15 }, { x: 12, z: -15 },
            { x: -35, z: -10 }, { x: 38, z: -8 },
            { x: -15, z: 25 }, { x: 20, z: -30 }
        ];

        barrelPositions.forEach(bp => {
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12),
                barrelMat
            );
            barrel.position.set(bp.x, 0.6, bp.z);
            barrel.castShadow = true;
            this.scene.add(barrel);
            this.colliders.push(barrel);
        });

        // Sandbags
        const sandbagMat = new THREE.MeshPhongMaterial({ 
            color: 0xaa9a7a,
            specular: 0x111111,
            shininess: 2
        });

        const sandbagPositions = [
            { x: -12, z: -5, rot: 0 },
            { x: 18, z: 8, rot: Math.PI / 4 },
            { x: -30, z: -15, rot: Math.PI / 3 },
            { x: 5, z: 25, rot: 0 },
        ];

        sandbagPositions.forEach(sp => {
            for (let i = 0; i < 3; i++) {
                const bag = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5, 0.4, 0.6),
                    sandbagMat
                );
                bag.position.set(
                    sp.x + Math.sin(sp.rot) * i * 0.3,
                    0.2 + i * 0.38,
                    sp.z + Math.cos(sp.rot) * i * 0.3
                );
                bag.rotation.y = sp.rot;
                bag.castShadow = true;
                this.scene.add(bag);
                this.colliders.push(bag);
            }
        });

        // Lamp posts
        const lampMat = new THREE.MeshPhongMaterial({ color: 0x333333, metalness: 0.8 });
        const lampPositions = [
            { x: -10, z: -10 }, { x: 10, z: 10 },
            { x: -20, z: 10 }, { x: 20, z: -10 },
        ];

        lampPositions.forEach(lp => {
            // Pole
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.1, 4, 8),
                lampMat
            );
            pole.position.set(lp.x, 2, lp.z);
            this.scene.add(pole);

            // Light fixture
            const fixture = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.15, 0.5),
                lampMat
            );
            fixture.position.set(lp.x, 4, lp.z);
            this.scene.add(fixture);

            // Actual light
            const light = new THREE.PointLight(0xffeecc, 0.5, 15);
            light.position.set(lp.x, 3.9, lp.z);
            this.scene.add(light);
        });

        // Ground debris/patches
        const patchMat = new THREE.MeshPhongMaterial({ 
            color: 0x9a8a6a,
            specular: 0x000000,
            shininess: 0
        });
        for (let i = 0; i < 20; i++) {
            const patch = new THREE.Mesh(
                new THREE.CircleGeometry(0.5 + Math.random() * 1.5, 8),
                patchMat
            );
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(
                (Math.random() - 0.5) * 80,
                0.01,
                (Math.random() - 0.5) * 80
            );
            this.scene.add(patch);
        }
    }

    createLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x8899aa, 0.5);
        this.scene.add(ambient);

        // Sun directional light
        const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
        sunLight.position.set(40, 60, -40);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 200;
        sunLight.shadow.camera.left = -60;
        sunLight.shadow.camera.right = 60;
        sunLight.shadow.camera.top = 60;
        sunLight.shadow.camera.bottom = -60;
        this.scene.add(sunLight);

        // Fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0xaabbcc, 0.3);
        fillLight.position.set(-30, 40, 30);
        this.scene.add(fillLight);

        // Hemisphere light for sky/ground color
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xc4a56a, 0.3);
        this.scene.add(hemiLight);

        // Fog for atmosphere
        this.scene.fog = new THREE.Fog(0xddeeff, 60, 150);
    }

    setupNavPoints() {
        // Navigation points in verified OPEN areas (away from buildings/walls)
        this.navPoints = [
            // Open roads - center cross
            new THREE.Vector3(8, 0, 3),
            new THREE.Vector3(-8, 0, 3),
            new THREE.Vector3(8, 0, -3),
            new THREE.Vector3(-8, 0, -3),
            new THREE.Vector3(3, 0, 8),
            new THREE.Vector3(-3, 0, 8),
            new THREE.Vector3(3, 0, -8),
            new THREE.Vector3(-3, 0, -8),

            // North open areas
            new THREE.Vector3(5, 0, -40),
            new THREE.Vector3(-5, 0, -40),
            new THREE.Vector3(0, 0, -42),
            new THREE.Vector3(10, 0, -38),
            new THREE.Vector3(-10, 0, -38),

            // South open areas  
            new THREE.Vector3(8, 0, 32),
            new THREE.Vector3(-8, 0, 32),
            new THREE.Vector3(0, 0, 35),

            // East side open
            new THREE.Vector3(40, 0, 3),
            new THREE.Vector3(40, 0, -3),
            new THREE.Vector3(38, 0, 10),
            new THREE.Vector3(42, 0, -10),

            // West side open
            new THREE.Vector3(-40, 0, 15),
            new THREE.Vector3(-42, 0, -3),
            new THREE.Vector3(-38, 0, 20),

            // Mid connectors (open road intersections)
            new THREE.Vector3(15, 0, 5),
            new THREE.Vector3(-20, 0, -5),
            new THREE.Vector3(20, 0, -25),
            new THREE.Vector3(-15, 0, 30),
            new THREE.Vector3(25, 0, 10),
            new THREE.Vector3(-25, 0, 5),
        ];
    }

    setupSpawnPoints() {
        // Player (CT) spawn - south side (open area)
        this.spawnPointsCT = [
            new THREE.Vector3(0, 0, 42),
            new THREE.Vector3(-5, 0, 40),
            new THREE.Vector3(5, 0, 40),
        ];

        // Bot (T) spawn - scattered in open areas far from player
        this.spawnPointsT = [
            new THREE.Vector3(5, 0, -40),
            new THREE.Vector3(-5, 0, -40),
            new THREE.Vector3(10, 0, -38),
            new THREE.Vector3(-10, 0, -38),
            new THREE.Vector3(40, 0, 3),
            new THREE.Vector3(-42, 0, -3),
            new THREE.Vector3(40, 0, -10),
            new THREE.Vector3(-38, 0, 20),
            new THREE.Vector3(20, 0, -25),
            new THREE.Vector3(-25, 0, 5),
            new THREE.Vector3(38, 0, 10),
            new THREE.Vector3(-40, 0, 15),
        ];
    }
}
