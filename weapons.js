/* ========================================
   WEAPONS SYSTEM
   Weapon definitions, view models, shooting
   ======================================== */

const WEAPON_DEFS = {
    pistol: {
        name: 'USP-S',
        type: 'pistol',
        damage: 25,
        headshotMult: 3,
        fireRate: 150,      // reduced from 400ms for faster firing
        magSize: 24,        // increased from 12
        reserveAmmo: 72,    // increased from 36
        reloadTime: 1000,   // reduced from 1800ms
        spread: 0.015,
        recoil: 0.02,
        range: 80,
        auto: true,
        cost: 200,
        killReward: 300,
        sound: 'playPistolShot'
    },
    deagle: {
        name: 'Desert Eagle',
        type: 'pistol',
        damage: 55,
        headshotMult: 2.5,
        fireRate: 300,
        magSize: 7,
        reserveAmmo: 21,
        reloadTime: 2200,
        spread: 0.025,
        recoil: 0.06,
        range: 90,
        auto: true,
        cost: 700,
        killReward: 300,
        sound: 'playDeagleShot'
    },
    ak47: {
        name: 'AK-47',
        type: 'rifle',
        damage: 32,
        headshotMult: 3.5,
        fireRate: 90,
        magSize: 30,
        reserveAmmo: 90,
        reloadTime: 2500,
        spread: 0.02,
        recoil: 0.035,
        range: 100,
        auto: true,
        hasScope: true,
        scopeZoom: 1.5,
        cost: 2700,
        killReward: 300,
        sound: 'playRifleShot'
    },
    m4a1: {
        name: 'M4A1',
        type: 'rifle',
        damage: 28,
        headshotMult: 3.5,
        fireRate: 80,
        magSize: 30,
        reserveAmmo: 90,
        reloadTime: 2300,
        spread: 0.015,
        recoil: 0.025,
        range: 100,
        auto: true,
        hasScope: true,
        scopeZoom: 1.5,
        cost: 3100,
        killReward: 300,
        sound: 'playRifleShot'
    },
    mp5: {
        name: 'MP5',
        type: 'smg',
        damage: 22,
        headshotMult: 3,
        fireRate: 70,
        magSize: 30,
        reserveAmmo: 120,
        reloadTime: 2000,
        spread: 0.025,
        recoil: 0.02,
        range: 60,
        auto: true,
        hasScope: true,
        scopeZoom: 1.25,
        cost: 1500,
        killReward: 600,
        sound: 'playSMGShot'
    },
    awp: {
        name: 'AWP',
        type: 'sniper',
        damage: 110,
        headshotMult: 2,
        fireRate: 1000,
        magSize: 5,
        reserveAmmo: 20,
        reloadTime: 3500,
        spread: 0.005,
        recoil: 0.1,
        range: 200,
        auto: true,
        hasScope: true,
        scopeZoom: 4,
        cost: 4750,
        killReward: 100,
        sound: 'playSniperShot'
    }
};

class WeaponSystem {
    constructor() {
        this.inventory = [null, null, null]; // slots: primary, secondary, melee
        this.currentSlot = 1; // secondary by default
        this.currentAmmo = 0;
        this.reserveAmmo = 0;
        this.isReloading = false;
        this.reloadTimer = null;
        this.lastFireTime = 0;
        this.shotsFired = 0;
        this.shotsHit = 0;

        // Give default pistol
        this.equipWeapon('pistol', 1);
    }

    equipWeapon(weaponId, slot) {
        const def = WEAPON_DEFS[weaponId];
        if (!def) return false;

        // Determine slot
        let targetSlot = slot;
        if (targetSlot === undefined) {
            if (def.type === 'pistol') targetSlot = 1;
            else targetSlot = 0;
        }

        this.inventory[targetSlot] = {
            id: weaponId,
            def: def,
            currentAmmo: def.magSize,
            reserveAmmo: def.reserveAmmo
        };

        if (targetSlot === this.currentSlot || 
            (this.inventory[this.currentSlot] === null)) {
            this.switchToSlot(targetSlot);
        }

        return true;
    }

    switchToSlot(slot) {
        if (slot < 0 || slot >= 3) return;
        if (!this.inventory[slot]) return;

        // Cancel reload
        if (this.isReloading) {
            this.cancelReload();
        }

        this.currentSlot = slot;
        const weapon = this.inventory[slot];
        this.currentAmmo = weapon.currentAmmo;
        this.reserveAmmo = weapon.reserveAmmo;

        audioEngine.playWeaponSwitch();
    }

    getCurrentWeapon() {
        return this.inventory[this.currentSlot];
    }

    getDef() {
        const w = this.getCurrentWeapon();
        return w ? w.def : null;
    }

    canFire() {
        if (this.isReloading) return false;
        const w = this.getCurrentWeapon();
        if (!w) return false;
        if (w.currentAmmo <= 0) return false;
        const now = performance.now();
        if (now - this.lastFireTime < w.def.fireRate) return false;
        return true;
    }

    fire() {
        if (!this.canFire()) {
            const w = this.getCurrentWeapon();
            if (w && w.currentAmmo <= 0) {
                audioEngine.playEmptyClip();
            }
            return null;
        }

        const w = this.getCurrentWeapon();
        w.currentAmmo--;
        this.currentAmmo = w.currentAmmo;
        this.lastFireTime = performance.now();
        this.shotsFired++;

        // Play weapon sound
        audioEngine[w.def.sound]();

        // Calculate spread
        const spread = w.def.spread * (1 + Math.min(this.shotsFired * 0.05, 0.5));

        return {
            damage: w.def.damage,
            headshotMult: w.def.headshotMult,
            spread: spread,
            recoil: w.def.recoil,
            range: w.def.range,
            killReward: w.def.killReward
        };
    }

    startReload(callback) {
        const w = this.getCurrentWeapon();
        if (!w) return;
        if (w.currentAmmo >= w.def.magSize) return;
        if (w.reserveAmmo <= 0) return;
        if (this.isReloading) return;

        this.isReloading = true;
        audioEngine.playReload();

        this.reloadTimer = setTimeout(() => {
            const needed = w.def.magSize - w.currentAmmo;
            const available = Math.min(needed, w.reserveAmmo);
            w.currentAmmo += available;
            w.reserveAmmo -= available;
            this.currentAmmo = w.currentAmmo;
            this.reserveAmmo = w.reserveAmmo;
            this.isReloading = false;
            this.shotsFired = 0;
            if (callback) callback();
        }, w.def.reloadTime);
    }

    cancelReload() {
        if (this.reloadTimer) {
            clearTimeout(this.reloadTimer);
            this.reloadTimer = null;
        }
        this.isReloading = false;
    }

    resetShotsFired() {
        this.shotsFired = Math.max(0, this.shotsFired - 1);
    }

    getAccuracy() {
        if (this.shotsFired === 0) return 0;
        return Math.round((this.shotsHit / this.shotsFired) * 100);
    }

    replenishAmmo() {
        for (let i = 0; i < this.inventory.length; i++) {
            const w = this.inventory[i];
            if (w) {
                w.currentAmmo = w.def.magSize;
                w.reserveAmmo = w.def.reserveAmmo;
                if (i === this.currentSlot) {
                    this.currentAmmo = w.currentAmmo;
                    this.reserveAmmo = w.reserveAmmo;
                }
            }
        }
    }
}

// Create weapon view model geometry in Three.js
function createWeaponViewModel(scene, camera, weaponId) {
    const group = new THREE.Group();
    const def = WEAPON_DEFS[weaponId];
    
    // Material for weapon
    const bodyMat = new THREE.MeshPhongMaterial({ 
        color: 0x2a2a2a, 
        specular: 0x444444, 
        shininess: 60 
    });
    const metalMat = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a1a, 
        specular: 0x888888, 
        shininess: 90 
    });
    const gripMat = new THREE.MeshPhongMaterial({ 
        color: 0x3d2b1f, 
        specular: 0x222222, 
        shininess: 20 
    });

    if (def.type === 'pistol') {
        // Barrel
        const barrel = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.03, 0.25),
            metalMat
        );
        barrel.position.set(0, 0, -0.12);
        group.add(barrel);

        // Body/Slide
        const slide = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.06, 0.18),
            bodyMat
        );
        slide.position.set(0, 0.01, -0.02);
        group.add(slide);

        // Grip
        const grip = new THREE.Mesh(
            new THREE.BoxGeometry(0.035, 0.1, 0.06),
            gripMat
        );
        grip.position.set(0, -0.06, 0.04);
        grip.rotation.x = 0.2;
        group.add(grip);

        // Trigger guard
        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.03, 0.05),
            metalMat
        );
        guard.position.set(0, -0.03, 0.01);
        group.add(guard);

        group.position.set(0.25, -0.22, -0.4);
        group.rotation.set(0, -0.05, 0);

    } else if (def.type === 'rifle' || def.type === 'smg') {
        // Long barrel
        const barrel = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.025, 0.5),
            metalMat
        );
        barrel.position.set(0, 0, -0.3);
        group.add(barrel);

        // Receiver
        const receiver = new THREE.Mesh(
            new THREE.BoxGeometry(0.045, 0.06, 0.25),
            bodyMat
        );
        receiver.position.set(0, 0, -0.05);
        group.add(receiver);

        // Magazine
        const mag = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.12, 0.04),
            metalMat
        );
        mag.position.set(0, -0.07, 0);
        mag.rotation.x = 0.15;
        group.add(mag);

        // Stock
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.055, 0.18),
            gripMat
        );
        stock.position.set(0, -0.01, 0.16);
        group.add(stock);

        // Grip
        const grip = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.08, 0.04),
            gripMat
        );
        grip.position.set(0, -0.06, 0.08);
        grip.rotation.x = 0.25;
        group.add(grip);

        // Sight
        const sight = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.02, 0.03),
            metalMat
        );
        sight.position.set(0, 0.04, -0.15);
        group.add(sight);

        group.position.set(0.28, -0.25, -0.45);
        group.rotation.set(0, -0.03, 0);

    } else if (def.type === 'sniper') {
        // Long barrel
        const barrel = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.03, 0.7),
            metalMat
        );
        barrel.position.set(0, 0, -0.4);
        group.add(barrel);

        // Receiver
        const receiver = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.07, 0.3),
            bodyMat
        );
        receiver.position.set(0, 0, -0.05);
        group.add(receiver);

        // Scope
        const scope = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8),
            metalMat
        );
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.06, -0.1);
        group.add(scope);

        // Scope mounts
        const mount1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.03, 0.015),
            metalMat
        );
        mount1.position.set(0, 0.04, -0.05);
        group.add(mount1);
        const mount2 = mount1.clone();
        mount2.position.z = -0.15;
        group.add(mount2);

        // Magazine
        const mag = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.1, 0.05),
            metalMat
        );
        mag.position.set(0, -0.06, 0.02);
        group.add(mag);

        // Stock
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.045, 0.06, 0.22),
            gripMat
        );
        stock.position.set(0, -0.01, 0.2);
        group.add(stock);

        // Grip
        const grip = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.08, 0.04),
            gripMat
        );
        grip.position.set(0, -0.06, 0.1);
        grip.rotation.x = 0.25;
        group.add(grip);

        group.position.set(0.3, -0.28, -0.5);
        group.rotation.set(0, -0.03, 0);
    }

    // Scale weapon down and move it very close to the camera to prevent clipping into walls
    const scaleFactor = 0.15;
    group.scale.set(scaleFactor, scaleFactor, scaleFactor);
    group.position.multiplyScalar(scaleFactor);

    // Add to camera
    camera.add(group);
    group.name = 'weaponViewModel';

    return group;
}
