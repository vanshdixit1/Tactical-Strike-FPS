/* TACTICAL STRIKE - Main Game Engine */
class Game {
  constructor() {
    this.state = 'menu';
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 300);
    this.scene.add(this.camera);
    this.clock = new THREE.Clock();
    this.keys = {}; this.mouse = { x: 0, y: 0, buttons: 0 };
    this.yaw = 0; this.pitch = 0;
    this.sensitivity = 0.003;
    this.playerPos = new THREE.Vector3(0, 1.6, 40);
    this.playerVel = new THREE.Vector3();
    this.playerHealth = 100; this.playerArmor = 0;
    this.isJumping = false; this.isSprinting = false;
    this.money = 800; this.round = 1; this.roundTime = 120;
    this.kills = 0; this.deaths = 0; this.headshots = 0;
    this.totalKills = 0; this.totalHeadshots = 0; this.totalMoney = 0;
    this.roundKills = 0; this.roundHeadshots = 0;
    this.isScoping = false; this.currentZoom = 1;
    this.weaponSystem = null; this.botManager = null; this.gameMap = null;
    this.weaponModel = null; this.paused = false; this.buyMenuOpen = false;
    this.bobPhase = 0; this.lastFootstep = 0;
    this.difficulty = 'normal'; this.crosshairColor = '#00ff88';
    this.particleSystems = [];
    this.setupEvents();
    this.setupUI();
    this.animate();
  }

  setupEvents() {
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (this.state === 'playing') {
        if (e.code === 'Escape') {
          if (this.buyMenuOpen) this.toggleBuyMenu();
          else this.togglePause();
        }
        if (e.code === 'KeyR' && !this.paused && !this.buyMenuOpen) this.reload();
        if (e.code === 'KeyB') {
          if (this.buyMenuOpen) this.toggleBuyMenu();
          else if (!this.paused) this.toggleBuyMenu();
        }
        if (e.code === 'Digit1' && !this.buyMenuOpen && !this.paused) this.switchWeapon(0);
        if (e.code === 'Digit2' && !this.buyMenuOpen && !this.paused) this.switchWeapon(1);
        if (e.code === 'Digit3' && !this.buyMenuOpen && !this.paused) this.switchWeapon(2);
        if (e.code === 'Tab') { e.preventDefault(); this.showScoreboard(true); }
      }
    });
    document.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.code === 'Tab') this.showScoreboard(false);
    });
    this.canvas.addEventListener('mousedown', e => {
      if (this.state === 'playing' && !this.paused && !this.buyMenuOpen) {
        if (!document.pointerLockElement) this.canvas.requestPointerLock();
        this.mouse.buttons = e.buttons;
      }
    });
    this.canvas.addEventListener('mouseup', e => { this.mouse.buttons = e.buttons; });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement && this.state === 'playing' && !this.paused) {
        const sensMult = this.isScoping ? (1 / this.currentZoom) : 1;
        this.yaw -= e.movementX * this.sensitivity * sensMult;
        this.pitch -= e.movementY * this.sensitivity * sensMult;
        this.pitch = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, this.pitch));
      }
    });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'playing' && !this.paused) this.togglePause();
    });
  }

  setupUI() {
    const $ = id => document.getElementById(id);
    $('btn-play').onclick = () => this.startGame();
    $('btn-settings').onclick = () => { $('settings-panel').classList.remove('hidden'); };
    $('btn-settings-back').onclick = () => { $('settings-panel').classList.add('hidden'); };
    $('btn-controls').onclick = () => { $('controls-panel').classList.remove('hidden'); };
    $('btn-controls-back').onclick = () => { $('controls-panel').classList.add('hidden'); };
    $('btn-resume').onclick = () => this.togglePause();
    $('btn-quit').onclick = () => this.quitToMenu();
    $('btn-next-round').onclick = () => this.nextRound();
    $('btn-restart').onclick = () => this.startGame();
    $('btn-main-menu').onclick = () => this.quitToMenu();
    $('buy-close').onclick = () => this.toggleBuyMenu();
    $('sensitivity-slider').oninput = e => {
      this.sensitivity = e.target.value * 0.001;
      $('sensitivity-value').textContent = e.target.value;
    };
    $('volume-slider').oninput = e => {
      audioEngine.setVolume(e.target.value / 100);
      $('volume-value').textContent = e.target.value + '%';
    };
    $('difficulty-select').onchange = e => { this.difficulty = e.target.value; };
    $('crosshair-color').onchange = e => {
      this.crosshairColor = e.target.value;
      document.querySelectorAll('.crosshair-line, .crosshair-dot').forEach(el => {
        el.style.background = this.crosshairColor;
        el.style.boxShadow = `0 0 4px ${this.crosshairColor}`;
      });
    };
    document.querySelectorAll('.buy-item').forEach(btn => {
      btn.onclick = () => this.buyWeapon(btn.dataset.weapon, parseInt(btn.dataset.cost));
    });
  }

  startGame() {
    audioEngine.init();
    this.clearScene();
    this.state = 'playing';
    this.round = 1; this.money = 800;
    this.kills = 0; this.deaths = 0; this.headshots = 0;
    this.totalKills = 0; this.totalHeadshots = 0; this.totalMoney = 0;
    this.playerHealth = 100; this.playerArmor = 0;
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-over').classList.add('hidden');
    this.gameMap = new GameMap(this.scene);
    this.gameMap.build();
    this.weaponSystem = new WeaponSystem();
    this.startRound();
    this.canvas.requestPointerLock();
    audioEngine.playRoundStart();
  }

  clearScene() {
    while (this.scene.children.length > 0) {
      const c = this.scene.children[0];
      if (c !== this.camera) this.scene.remove(c); else this.scene.remove(c);
    }
    this.scene.add(this.camera);
    this.particleSystems = [];
  }

  startRound() {
    const spawn = this.gameMap.spawnPointsCT[0];
    this.playerPos.set(spawn.x, 1.6, spawn.z);
    this.yaw = Math.PI; this.pitch = 0;
    // Heal player by 20 HP per round, capped at 100
    this.playerHealth = Math.min(100, this.playerHealth + 20); 
    this.roundTime = 120;
    this.roundKills = 0; this.roundHeadshots = 0;
    this.weaponSystem.shotsFired = 0; this.weaponSystem.shotsHit = 0;
    this.weaponSystem.replenishAmmo();
    if (this.botManager) this.botManager.clear();
    this.botManager = new BotManager(this.scene, this.difficulty, this.gameMap.colliders, this.gameMap.navPoints);
    const botCount = Math.min(3 + this.round * 2, 15);
    this.botManager.spawnBots(botCount, this.gameMap.spawnPointsT);
    this.updateWeaponModel();
    this.updateHUD();
    document.getElementById('round-end').classList.add('hidden');
    document.getElementById('round-number').textContent = 'ROUND ' + this.round;
    document.getElementById('kills-display').textContent = 'Kills: ' + this.kills;
  }

  updateWeaponModel() {
    const old = this.camera.getObjectByName('weaponViewModel');
    if (old) this.camera.remove(old);
    const w = this.weaponSystem.getCurrentWeapon();
    if (w) this.weaponModel = createWeaponViewModel(this.scene, this.camera, w.id);
  }

  switchWeapon(slot) {
    this.weaponSystem.switchToSlot(slot);
    this.updateWeaponModel();
    this.updateHUD();
  }

  reload() {
    this.weaponSystem.startReload(() => this.updateHUD());
    if (this.weaponSystem.isReloading) {
      let ri = document.getElementById('reload-indicator');
      if (!ri) { ri = document.createElement('div'); ri.id = 'reload-indicator'; document.getElementById('hud').appendChild(ri); }
      ri.textContent = 'RELOADING...';
      const w = this.weaponSystem.getDef();
      setTimeout(() => { if (ri.parentNode) ri.parentNode.removeChild(ri); }, w ? w.reloadTime : 2000);
    }
  }

  togglePause() {
    this.paused = !this.paused;
    document.getElementById('pause-menu').classList.toggle('hidden', !this.paused);
    if (this.paused) document.exitPointerLock();
    else this.canvas.requestPointerLock();
  }

  toggleBuyMenu() {
    this.buyMenuOpen = !this.buyMenuOpen;
    document.getElementById('buy-menu').classList.toggle('hidden', !this.buyMenuOpen);
    document.getElementById('buy-money').textContent = '$' + this.money;
    
    // Explicitly pause the game while buy menu is open so enemies stop attacking
    this.paused = this.buyMenuOpen;

    if (this.buyMenuOpen) document.exitPointerLock();
    else this.canvas.requestPointerLock();
    
    document.querySelectorAll('.buy-item').forEach(btn => {
      btn.disabled = parseInt(btn.dataset.cost) > this.money;
    });
  }

  buyWeapon(weaponId, cost) {
    if (this.money < cost) return;
    if (weaponId === 'armor') { this.playerArmor = Math.min(100, this.playerArmor + 100); this.money -= cost; }
    else { this.weaponSystem.equipWeapon(weaponId); this.money -= cost; this.updateWeaponModel(); }
    audioEngine.playBuyItem();
    this.updateHUD();
    document.getElementById('buy-money').textContent = '$' + this.money;
    document.querySelectorAll('.buy-item').forEach(btn => { btn.disabled = parseInt(btn.dataset.cost) > this.money; });
  }

  showScoreboard(show) {
    const sb = document.getElementById('scoreboard');
    sb.classList.toggle('hidden', !show);
    if (show) {
      const body = document.getElementById('scoreboard-body');
      body.innerHTML = `<tr class="player-row"><td>You</td><td>${this.kills}</td><td>${this.deaths}</td><td>${this.kills*100}</td></tr>`;
      const alive = this.botManager ? this.botManager.getAliveBots().length : 0;
      body.innerHTML += `<tr><td>Bots (alive: ${alive})</td><td>-</td><td>${this.totalKills}</td><td>-</td></tr>`;
    }
  }

  quitToMenu() {
    this.state = 'menu'; this.paused = false;
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('round-end').classList.add('hidden');
    document.exitPointerLock();
    this.clearScene();
  }

  shoot() {
    const result = this.weaponSystem.fire();
    if (!result) return;
    this.muzzleFlash();
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.camera.quaternion);
    dir.x += (Math.random() - 0.5) * result.spread;
    dir.y += (Math.random() - 0.5) * result.spread;
    dir.normalize();
    const ray = new THREE.Raycaster(this.camera.position.clone(), dir, 0, result.range);
    const hit = this.botManager.checkHit(ray);
    if (hit) {
      const dmg = hit.isHeadshot ? result.damage * result.headshotMult : result.damage;
      const killed = hit.bot.takeDamage(dmg, hit.isHeadshot);
      this.weaponSystem.shotsHit++;
      audioEngine.playHit();
      this.showHitMarker();
      if (hit.isHeadshot) { audioEngine.playHeadshot(); this.showHeadshot(); this.headshots++; this.roundHeadshots++; this.totalHeadshots++; }
      if (killed) {
        this.kills++; this.roundKills++; this.totalKills++;
        const reward = result.killReward; this.money += reward; this.totalMoney += reward;
        this.showKillNotification(hit.isHeadshot);
        this.addKillFeed('You', hit.isHeadshot ? 'HEADSHOT' : this.weaponSystem.getDef().name, 'Enemy');
        const alive = this.botManager.getAliveBots().length;
        document.getElementById('kills-display').textContent = 'Kills: ' + this.kills;
        if (alive <= 0) this.roundWin();
      }
      this.spawnHitParticles(hit.bot.position.clone());
    } else {
      const wallHits = ray.intersectObjects(this.gameMap.colliders, true);
      if (wallHits.length > 0) { this.spawnHitParticles(wallHits[0].point); audioEngine.playBulletImpact(); }
    }
    this.camera.rotation.x += result.recoil * (0.5 + Math.random() * 0.5);
    this.updateHUD();
  }

  muzzleFlash() {
    const el = document.createElement('div');
    el.className = 'muzzle-flash';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 60);
  }

  showHitMarker() {
    const hm = document.getElementById('hit-marker');
    hm.classList.remove('hidden');
    setTimeout(() => hm.classList.add('hidden'), 150);
  }

  showHeadshot() {
    const hs = document.getElementById('headshot-indicator');
    hs.classList.remove('hidden');
    setTimeout(() => hs.classList.add('hidden'), 800);
  }

  showKillNotification(isHeadshot) {
    const kn = document.getElementById('kill-notification');
    document.getElementById('kill-message').textContent = isHeadshot ? 'HEADSHOT KILL' : 'Enemy Eliminated';
    kn.classList.remove('hidden');
    setTimeout(() => kn.classList.add('hidden'), 1500);
  }

  addKillFeed(killer, weapon, victim) {
    const feed = document.getElementById('kill-feed');
    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerHTML = `<span class="killer">${killer}</span><span class="weapon-icon">[${weapon}]</span><span class="victim">${victim}</span>`;
    feed.appendChild(item);
    setTimeout(() => item.remove(), 4000);
    if (feed.children.length > 5) feed.firstChild.remove();
  }

  spawnHitParticles(pos) {
    const count = 6;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i*3] = pos.x; positions[i*3+1] = pos.y+0.5; positions[i*3+2] = pos.z;
      velocities.push(new THREE.Vector3((Math.random()-0.5)*3, Math.random()*3, (Math.random()-0.5)*3));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffaa44, size: 0.08 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.particleSystems.push({ mesh: points, velocities, life: 0.5, age: 0 });
  }

  updateParticles(dt) {
    for (let i = this.particleSystems.length - 1; i >= 0; i--) {
      const ps = this.particleSystems[i]; ps.age += dt;
      if (ps.age >= ps.life) { this.scene.remove(ps.mesh); this.particleSystems.splice(i, 1); continue; }
      const positions = ps.mesh.geometry.getAttribute('position');
      for (let j = 0; j < ps.velocities.length; j++) {
        positions.array[j*3] += ps.velocities[j].x * dt;
        positions.array[j*3+1] += ps.velocities[j].y * dt;
        ps.velocities[j].y -= 9.8 * dt;
        positions.array[j*3+2] += ps.velocities[j].z * dt;
      }
      positions.needsUpdate = true;
      ps.mesh.material.opacity = 1 - ps.age / ps.life;
      ps.mesh.material.transparent = true;
    }
  }

  playerTakeDamage(amount) {
    let dmg = amount;
    if (this.playerArmor > 0) {
      const absorbed = Math.min(this.playerArmor, dmg * 0.5);
      this.playerArmor -= absorbed; dmg -= absorbed * 0.5;
    }
    this.playerHealth -= dmg;
    audioEngine.playDamage();
    const vig = document.getElementById('damage-vignette');
    vig.classList.add('active');
    setTimeout(() => vig.classList.remove('active'), 200);
    if (this.playerHealth <= 0) { this.playerHealth = 0; this.playerDie(); }
    this.updateHUD();
  }

  playerDie() {
    this.deaths++;
    audioEngine.playDeath();
    this.state = 'dead';
    document.exitPointerLock();
    document.getElementById('game-over-title').textContent = this.round > 3 ? 'MISSION COMPLETE' : 'MISSION FAILED';
    document.getElementById('final-kills').textContent = this.totalKills;
    document.getElementById('final-rounds').textContent = this.round;
    document.getElementById('final-headshots').textContent = this.totalHeadshots;
    document.getElementById('final-money').textContent = '$' + this.totalMoney;
    document.getElementById('game-over').classList.remove('hidden');
  }

  roundWin() {
    audioEngine.playRoundEnd();
    this.state = 'roundEnd';
    const bonus = 3000;
    this.money += bonus; this.totalMoney += bonus;
    
    // Automatically proceed to the next round after 2 seconds
    setTimeout(() => {
      this.nextRound();
    }, 2000);
  }

  nextRound() {
    this.round++;
    this.state = 'playing';
    this.startRound();
    this.canvas.requestPointerLock();
    audioEngine.playRoundStart();
  }

  updateMovement(dt) {
    const speed = this.isSprinting ? 8 : 5;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (this.keys['KeyW']) move.add(forward);
    if (this.keys['KeyS']) move.sub(forward);
    if (this.keys['KeyD']) move.add(right);
    if (this.keys['KeyA']) move.sub(right);
    this.isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    if (move.length() > 0) move.normalize();
    // Calculate horizontal movement
    const dx = move.x * speed * dt;
    const dz = move.z * speed * dt;
    
    let nextX = this.playerPos.x + dx;
    let nextZ = this.playerPos.z + dz;

    // Independent X and Z collision checks to allow sliding along walls
    let canMoveX = true;
    let canMoveZ = true;

    if (this.gameMap) {
      for (const col of this.gameMap.colliders) {
        const box = new THREE.Box3().setFromObject(col);
        
        // X-axis check
        const pBoxX = new THREE.Box3(
          new THREE.Vector3(nextX - 0.3, this.playerPos.y - 1.5, this.playerPos.z - 0.3),
          new THREE.Vector3(nextX + 0.3, this.playerPos.y + 0.2, this.playerPos.z + 0.3)
        );
        if (box.intersectsBox(pBoxX)) canMoveX = false;
        
        // Z-axis check
        const pBoxZ = new THREE.Box3(
          new THREE.Vector3(this.playerPos.x - 0.3, this.playerPos.y - 1.5, nextZ - 0.3),
          new THREE.Vector3(this.playerPos.x + 0.3, this.playerPos.y + 0.2, nextZ + 0.3)
        );
        if (box.intersectsBox(pBoxZ)) canMoveZ = false;
      }
    }

    if (canMoveX && Math.abs(nextX) < 49) this.playerPos.x = nextX;
    if (canMoveZ && Math.abs(nextZ) < 49) this.playerPos.z = nextZ;

    // Jump
    if (this.keys['Space'] && !this.isJumping) { 
        this.playerVel.y = 6; // Increased jump power slightly to clear taller boxes
        this.isJumping = true; 
    }
    
    this.playerVel.y -= 15 * dt; // Gravity
    let nextY = this.playerPos.y + this.playerVel.y * dt;
    
    // Dynamic Vertical Collision (falling onto objects)
    let groundHeight = 1.6; // Base ground height (y=0 + player eye height 1.6)
    
    if (this.gameMap) {
      for (const col of this.gameMap.colliders) {
        const box = new THREE.Box3().setFromObject(col);
        // Check if player is directly above this box
        if (this.playerPos.x + 0.3 > box.min.x && this.playerPos.x - 0.3 < box.max.x &&
            this.playerPos.z + 0.3 > box.min.z && this.playerPos.z - 0.3 < box.max.z) {
            
            // If the box is below us (or right at our feet), it's our new ground
            if (this.playerPos.y - 1.6 >= box.max.y - 0.2) { 
                groundHeight = Math.max(groundHeight, box.max.y + 1.6);
            }
        }
      }
    }

    this.playerPos.y = nextY;

    // Floor collision (landing)
    if (this.playerPos.y <= groundHeight) { 
        this.playerPos.y = groundHeight; 
        this.playerVel.y = 0; 
        this.isJumping = false; 
    }
    // Camera bob
    const isMoving = this.keys['KeyW'] || this.keys['KeyA'] || this.keys['KeyS'] || this.keys['KeyD'];
    if (isMoving && !this.isJumping) {
      this.bobPhase += dt * (this.isSprinting ? 14 : 10);
      const bobX = Math.sin(this.bobPhase) * 0.015;
      const bobY = Math.abs(Math.cos(this.bobPhase)) * 0.02;
      this.camera.position.set(this.playerPos.x + bobX, this.playerPos.y + bobY, this.playerPos.z);
      // Footsteps
      if (performance.now() - this.lastFootstep > (this.isSprinting ? 300 : 450)) {
        audioEngine.playFootstep(); this.lastFootstep = performance.now();
      }
    } else {
      this.camera.position.copy(this.playerPos);
    }
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    // Weapon sway
    if (this.weaponModel) {
      const sway = isMoving ? Math.sin(this.bobPhase) * 0.003 : 0;
      this.weaponModel.rotation.z = sway;
    }
  }

  updateHUD() {
    const w = this.weaponSystem.getCurrentWeapon();
    document.getElementById('health-fill').style.width = this.playerHealth + '%';
    document.getElementById('health-text').textContent = Math.max(0, Math.round(this.playerHealth));
    document.getElementById('armor-fill').style.width = this.playerArmor + '%';
    document.getElementById('armor-text').textContent = Math.round(this.playerArmor);
    if (w) {
      document.getElementById('ammo-current').textContent = w.currentAmmo;
      document.getElementById('ammo-reserve').textContent = w.reserveAmmo;
      document.getElementById('weapon-name').textContent = w.def.name;
      document.getElementById('ammo-section').classList.toggle('low-ammo', w.currentAmmo <= w.def.magSize * 0.2);
    }
    document.getElementById('money-display').textContent = '$' + this.money;
  }

  updateMinimap() {
    const mc = document.getElementById('minimap');
    const ctx = mc.getContext('2d');
    ctx.clearRect(0, 0, 200, 200);
    
    // We don't fill the background here anymore because CSS handles the radar background
    const scale = 2.0;
    const cx = 100, cy = 100;
    
    // Draw walls with accurate dimensions
    if (this.gameMap) {
      ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
      ctx.lineWidth = 1;
      
      for (const col of this.gameMap.colliders) {
        const box = new THREE.Box3().setFromObject(col);
        const w = (box.max.x - box.min.x) * scale;
        const h = (box.max.z - box.min.z) * scale;
        const rx = ((box.min.x + box.max.x) / 2 - this.playerPos.x) * scale + cx - w / 2;
        const rz = ((box.min.z + box.max.z) / 2 - this.playerPos.z) * scale + cy - h / 2;
        
        // Only draw if it's within the minimap bounds roughly
        if (rx + w > -20 && rx < 220 && rz + h > -20 && rz < 220) {
          ctx.fillRect(rx, rz, w, h);
          ctx.strokeRect(rx, rz, w, h);
        }
      }
    }
    
    // Draw bots
    if (this.botManager) {
      for (const bot of this.botManager.getAliveBots()) {
        const bx = (bot.position.x - this.playerPos.x) * scale + cx;
        const bz = (bot.position.z - this.playerPos.z) * scale + cy;
        
        // Only draw bots within radar range (roughly radius 100 on canvas)
        const distFromCenter = Math.sqrt((bx - cx)**2 + (bz - cy)**2);
        if (distFromCenter < 100) {
          ctx.fillStyle = '#ff3344'; 
          ctx.shadowColor = '#ff3344';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(bx, bz, 3.5, 0, Math.PI * 2); 
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      }
    }
    
    // Draw player as a neat arrow
    ctx.translate(cx, cy);
    ctx.rotate(-this.yaw); // Negative yaw to match Three.js coordinate system
    
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 2);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.rotate(this.yaw);
    ctx.translate(-cx, -cy);
  }

  // Timer removed

  update(dt) {
    if (this.state !== 'playing' || this.paused || this.buyMenuOpen) return;
    
    // Scoping Logic
    const w = this.weaponSystem.getCurrentWeapon();
    let targetFov = 75; // Default FOV
    this.isScoping = false;
    this.currentZoom = 1;
    
    if (w && w.def.hasScope && (this.mouse.buttons & 2)) {
        targetFov = 75 / w.def.scopeZoom;
        this.isScoping = true;
        this.currentZoom = w.def.scopeZoom;
    }
    
    // Smoothly interpolate FOV
    this.camera.fov += (targetFov - this.camera.fov) * 15 * dt;
    this.camera.updateProjectionMatrix();

    // Toggle sniper overlay UI if using the AWP and scoping
    const scopeOverlay = document.getElementById('scope-overlay');
    const crosshair = document.getElementById('crosshair');
    if (scopeOverlay) {
        if (this.isScoping && w.def.type === 'sniper') {
            scopeOverlay.classList.remove('hidden');
            if (crosshair) crosshair.classList.add('hidden');
        } else {
            scopeOverlay.classList.add('hidden');
            if (crosshair) crosshair.classList.remove('hidden');
        }
    }

    this.updateMovement(dt);
    // Shooting
    if (this.mouse.buttons & 1) {
      if (w && w.def.auto) this.shoot();
      else if (w && !this._lastMouseDown) this.shoot();
    }
    this._lastMouseDown = !!(this.mouse.buttons & 1);
    // Reset spread
    if (!(this.mouse.buttons & 1)) this.weaponSystem.resetShotsFired();
    // Auto-reload
    if (w && w.currentAmmo <= 0 && !this.weaponSystem.isReloading) this.reload();
    // Bot AI
    if (this.botManager) {
      const shots = this.botManager.update(dt * 1000, this.playerPos);
      for (const shot of shots) { if (shot) this.playerTakeDamage(shot.damage); }
    }
    this.updateParticles(dt);
    this.updateMinimap();
    this.updateHUD();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => { window.game = new Game(); });
