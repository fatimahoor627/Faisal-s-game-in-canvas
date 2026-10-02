/**
 * COLORSHIFT - World Generation & Adventure Systems
 * Procedural obstacles, interactive adventure objects (Jump Launch-Pads, Speed Rings,
 * Mystery Relic Capsules, Floating Sky Platforms), dynamic biomes, and collision detection.
 */

class WorldManager {
  constructor(game) {
    this.game = game;
    this.obstacles = [];
    this.collectibles = [];
    this.adventureObjects = []; // Jump pads, speed rings, sky platforms
    this.groundSegments = [];
    
    // Spawn timers
    this.spawnTimer = 0;
    this.minSpawnInterval = 1.3;
    this.maxSpawnInterval = 2.4;
    this.nextSpawnTime = 1.4;

    this.coinSpawnTimer = 0;
    this.nextCoinTime = 1.0;

    this.powerOrbSpawnTimer = 0;
    this.nextPowerOrbTime = 11.0;

    this.adventureSpawnTimer = 0;
    this.nextAdventureTime = 3.5;

    // Adventure Biomes / Zones
    this.biomes = [
      { name: 'ZONE 1: NEON HIGHWAY', theme: 'default', color: '#00f0ff' },
      { name: 'ZONE 2: CRYSTAL CAVERNS', theme: 'blue', color: '#00d2ff' },
      { name: 'ZONE 3: SKY TEMPLE', theme: 'gold', color: '#ffbe0b' },
      { name: 'ZONE 4: QUANTUM CORE', theme: 'purple', color: '#c800ff' },
      { name: 'ZONE 5: PRISMATIC RIFT', theme: 'green', color: '#00ff88' },
      { name: 'ZONE 6: HYPERDRIVE VOLCANO', theme: 'red', color: '#ff2a5f' }
    ];
    this.currentBiomeIndex = 0;
    this.biomeDistance = 0;

    this.initGround();
  }

  reset() {
    this.obstacles = [];
    this.collectibles = [];
    this.adventureObjects = [];
    this.groundSegments = [];
    this.spawnTimer = 0;
    this.nextSpawnTime = 1.4;
    this.coinSpawnTimer = 0;
    this.nextCoinTime = 1.0;
    this.powerOrbSpawnTimer = 0;
    this.nextPowerOrbTime = 10.0;
    this.adventureSpawnTimer = 0;
    this.nextAdventureTime = 3.0;
    this.currentBiomeIndex = 0;
    this.biomeDistance = 0;
    this.initGround();
  }

  initGround() {
    this.groundSegments = [];
    const segWidth = 100;
    const numSegs = Math.ceil(this.game.width / segWidth) + 4;
    for (let i = 0; i < numSegs; i++) {
      this.groundSegments.push({
        x: i * segWidth,
        width: segWidth,
        isGap: false
      });
    }
  }

  update(delta) {
    let speedMult = 1.0;
    if (this.game.powers.isActive && this.game.powers.currentPower.id === 'red') {
      speedMult = 0.32;
    } else if (this.game.powers.isActive && this.game.powers.currentPower.id === 'yellow') {
      speedMult = 1.85;
    } else if (this.game.boostTimer > 0) {
      speedMult = 1.5;
    }

    const currentSpeed = this.game.gameSpeed * speedMult;
    const scrollDistance = currentSpeed * delta * 60;

    // Biome Progression
    this.biomeDistance += scrollDistance;
    if (this.biomeDistance > 2200) {
      this.biomeDistance = 0;
      this.currentBiomeIndex = (this.currentBiomeIndex + 1) % this.biomes.length;
      const b = this.biomes[this.currentBiomeIndex];
      if (this.game.bg3d) {
        this.game.bg3d.setColorTheme(b.theme);
      }
      if (this.game.particles) {
        this.game.particles.addText(b.name, this.game.width / 2, 110, b.color, 26, 1.6);
        this.game.particles.addShockwave(this.game.width / 2, 110, b.color, 120, 0.6);
      }
      // Notify quest manager of zone transition
      if (this.game.quests) {
        this.game.quests.onZoneReached(this.currentBiomeIndex + 1);
      }
    }

    // Scroll Ground
    for (let i = this.groundSegments.length - 1; i >= 0; i--) {
      const seg = this.groundSegments[i];
      seg.x -= scrollDistance;
      if (seg.x + seg.width < 0) {
        let rightEdge = 0;
        this.groundSegments.forEach(s => {
          if (s.x + s.width > rightEdge) rightEdge = s.x + s.width;
        });

        seg.x = rightEdge;
        // In Zen mode, gaps are disabled
        const canGenerateGap = this.game.gameMode !== 'zen' && this.game.distance > 800 && Math.random() < 0.16;
        seg.isGap = canGenerateGap;
      }
    }

    // Spawn Obstacles (Disabled or reduced in Zen mode)
    if (this.game.gameMode !== 'zen') {
      this.spawnTimer += delta * speedMult;
      if (this.spawnTimer >= this.nextSpawnTime) {
        this.spawnTimer = 0;
        this.spawnObstacle();
        const diffFactor = Math.max(0.48, 1.0 - (this.game.distance / 16000));
        this.nextSpawnTime = (this.minSpawnInterval + Math.random() * (this.maxSpawnInterval - this.minSpawnInterval)) * diffFactor;
      }
    }

    // Spawn Adventure Interactive Objects (Jump pads, Speed rings, Sky platforms)
    this.adventureSpawnTimer += delta * speedMult;
    if (this.adventureSpawnTimer >= this.nextAdventureTime) {
      this.adventureSpawnTimer = 0;
      this.spawnAdventureObject();
      this.nextAdventureTime = 3.5 + Math.random() * 3.5;
    }

    // Spawn Coins
    this.coinSpawnTimer += delta * speedMult;
    if (this.coinSpawnTimer >= this.nextCoinTime) {
      this.coinSpawnTimer = 0;
      this.spawnCoinPattern();
      this.nextCoinTime = 1.1 + Math.random() * 1.8;
    }

    // Spawn Special Collectibles & Adventure Relics
    this.powerOrbSpawnTimer += delta;
    if (this.powerOrbSpawnTimer >= this.nextPowerOrbTime) {
      this.powerOrbSpawnTimer = 0;
      this.spawnSpecialCollectible();
      this.nextPowerOrbTime = 10.0 + Math.random() * 7.0;
    }

    // --- Update Adventure Objects ---
    const player = this.game.player;
    for (let i = this.adventureObjects.length - 1; i >= 0; i--) {
      const obj = this.adventureObjects[i];
      obj.x -= scrollDistance;
      obj.animTime = (obj.animTime || 0) + delta;

      // 1. Jump Launch-Pad Collision
      if (obj.type === 'jumppad') {
        const pFeet = player.y + player.radius;
        if (
          player.vy >= 0 &&
          player.x + player.radius * 0.7 >= obj.x &&
          player.x - player.radius * 0.7 <= obj.x + obj.width &&
          pFeet >= obj.y - 8 &&
          pFeet <= obj.y + obj.height + 15
        ) {
          // Launch player into stratosphere!
          player.vy = -18.5;
          player.isGrounded = false;
          player.hasDoubleJump = true;
          player.scaleX = 0.65;
          player.scaleY = 1.45;
          obj.triggered = true;

          if (window.soundSystem) window.soundSystem.playJumpPad();
          if (this.game.particles) {
            this.game.particles.addShockwave(obj.x + obj.width / 2, obj.y, '#00ffff', 90, 0.45);
            this.game.particles.burst(obj.x + obj.width / 2, obj.y, '#ffe600', 25, 7);
            this.game.particles.addText('SUPER JUMP!', obj.x + obj.width / 2, obj.y - 35, '#00ffff', 22, 1.0);
          }
          if (this.game.quests) this.game.quests.onJumpPadHit();
        }
      }

      // 2. Speed Ring Collision
      if (obj.type === 'speedring' && !obj.triggered) {
        const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
        if (dist < player.radius + obj.radius) {
          obj.triggered = true;
          this.game.boostTimer = 2.4;
          this.game.addScore(150);
          this.game.addCombo();
          if (window.soundSystem) window.soundSystem.playSpeedRing();
          if (this.game.particles) {
            this.game.particles.addShockwave(obj.x, obj.y, '#ff00aa', 100, 0.4);
            this.game.particles.burst(obj.x, obj.y, '#00f0ff', 24, 6);
            this.game.particles.addText('RING BOOST! +150', obj.x, obj.y - 30, '#ff00aa', 22, 1.0);
          }
          if (this.game.quests) this.game.quests.onSpeedRingHit();
        }
      }

      // 3. Floating Sky Platform Collision
      if (obj.type === 'skyplatform') {
        const pFeet = player.y + player.radius;
        if (
          player.vy >= 0 &&
          player.x + player.radius * 0.6 >= obj.x &&
          player.x - player.radius * 0.6 <= obj.x + obj.width &&
          pFeet >= obj.y &&
          pFeet <= obj.y + obj.height + 14
        ) {
          player.y = obj.y - player.radius;
          player.vy = 0;
          if (!player.isGrounded) player.onLand();
          player.isGrounded = true;
          player.hasDoubleJump = true;
        }
      }

      // Remove off-screen
      if (obj.x + (obj.width || obj.radius * 2) < -80) {
        this.adventureObjects.splice(i, 1);
      }
    }

    // --- Update Obstacles ---
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= scrollDistance;
      obs.animTime = (obs.animTime || 0) + delta;

      if (obs.type === 'mine' || obs.type === 'drone') {
        obs.y = obs.baseY + Math.sin(obs.animTime * obs.freq) * obs.amp;
      }

      const isBlitzActive = this.game.powers.isActive && this.game.powers.currentPower.id === 'yellow';
      const isBoostActive = this.game.boostTimer > 0;

      if (this.checkCollision(player, obs)) {
        if (isBlitzActive || isBoostActive || this.game.gameMode === 'zen') {
          if (this.game.particles) {
            this.game.particles.burst(obs.x + obs.width / 2, obs.y + obs.height / 2, '#ffe600', 30, 8);
            this.game.particles.addText('+250 SMASH!', obs.x, obs.y - 20, '#ffe600', 20, 0.9);
          }
          this.game.score += 250;
          this.obstacles.splice(i, 1);
          if (window.soundSystem) window.soundSystem.playCoin(8);
          continue;
        } else {
          const hitSuccess = player.takeHit();
          if (hitSuccess) return;
        }
      }

      if (!obs.closeCallAwarded && !isBlitzActive && this.checkCloseCall(player, obs)) {
        obs.closeCallAwarded = true;
        this.game.addCloseCall();
      }

      if (obs.x + obs.width < -60) {
        this.obstacles.splice(i, 1);
      }
    }

    // --- Update Collectibles ---
    const isMagnetActive = (this.game.powers.isActive && this.game.powers.currentPower.id === 'yellow') || this.game.magnetTimer > 0;

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.x -= scrollDistance;
      col.animTime = (col.animTime || 0) + delta;
      col.pulse = Math.sin(col.animTime * 4);

      if (isMagnetActive) {
        const dx = player.x - col.x;
        const dy = player.y - col.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 340) {
          col.x += (dx / dist) * 15;
          col.y += (dy / dist) * 15;
        }
      }

      const cDist = Math.hypot(player.x - col.x, player.y - col.y);
      if (cDist < player.radius + col.radius) {
        this.collectItem(col);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (col.x + col.radius < -50) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  spawnAdventureObject() {
    const types = ['jumppad', 'speedring', 'skyplatform'];
    const pick = types[Math.floor(Math.random() * types.length)];
    const startX = this.game.width + 60;
    const groundY = this.game.groundY;

    if (pick === 'jumppad') {
      const w = 48;
      const h = 14;
      this.adventureObjects.push({
        type: 'jumppad',
        x: startX,
        y: groundY - h,
        width: w,
        height: h,
        triggered: false,
        color: '#00ffff'
      });
    } else if (pick === 'speedring') {
      const r = 24;
      const y = groundY - 90 - Math.random() * 110;
      this.adventureObjects.push({
        type: 'speedring',
        x: startX,
        y: y,
        radius: r,
        triggered: false,
        color: '#ff00aa'
      });
    } else if (pick === 'skyplatform') {
      const w = 120 + Math.random() * 40;
      const h = 18;
      const y = groundY - 110 - Math.random() * 70;
      this.adventureObjects.push({
        type: 'skyplatform',
        x: startX,
        y: y,
        width: w,
        height: h,
        color: '#00f0ff'
      });

      // Spawn coins along top of sky platform!
      for (let c = 0; c < 3; c++) {
        this.collectibles.push({
          type: 'coin',
          x: startX + 25 + c * 35,
          y: y - 24,
          radius: 12,
          color: '#ffe600',
          animTime: Math.random()
        });
      }
    }
  }

  spawnObstacle() {
    const types = ['spikes', 'laser', 'mine', 'drone'];
    const pick = types[Math.floor(Math.random() * types.length)];
    const startX = this.game.width + 60;
    const groundY = this.game.groundY;

    if (pick === 'spikes') {
      const h = 42 + Math.random() * 28;
      const w = 36 + Math.random() * 20;
      this.obstacles.push({
        type: 'spikes',
        x: startX,
        y: groundY - h,
        width: w,
        height: h,
        color: '#ff2a5f',
        closeCallAwarded: false
      });
    } else if (pick === 'laser') {
      const h = 80;
      const w = 24;
      const elevated = Math.random() > 0.5;
      const y = elevated ? groundY - 140 : groundY - h;
      this.obstacles.push({
        type: 'laser',
        x: startX,
        y: y,
        width: w,
        height: h,
        color: '#00ffff',
        closeCallAwarded: false
      });
    } else if (pick === 'mine') {
      const size = 32;
      const baseY = groundY - 60 - Math.random() * 90;
      this.obstacles.push({
        type: 'mine',
        x: startX,
        y: baseY,
        baseY: baseY,
        width: size,
        height: size,
        freq: 2.5 + Math.random() * 2,
        amp: 25 + Math.random() * 20,
        color: '#ff0077',
        closeCallAwarded: false
      });
    } else if (pick === 'drone') {
      const w = 44;
      const h = 26;
      const baseY = groundY - 80 - Math.random() * 110;
      this.obstacles.push({
        type: 'drone',
        x: startX,
        y: baseY,
        baseY: baseY,
        width: w,
        height: h,
        freq: 2.0,
        amp: 35,
        color: '#b400ff',
        closeCallAwarded: false
      });
    }
  }

  spawnCoinPattern() {
    const patterns = ['arc', 'line', 'wave'];
    const p = patterns[Math.floor(Math.random() * patterns.length)];
    const startX = this.game.width + 50;
    const groundY = this.game.groundY;
    const count = 4 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      let cy = groundY - 50;
      if (p === 'arc') {
        const angle = (i / (count - 1)) * Math.PI;
        cy = groundY - 50 - Math.sin(angle) * 75;
      } else if (p === 'wave') {
        cy = groundY - 60 - Math.sin(i * 0.8) * 45;
      } else {
        cy = groundY - (Math.random() > 0.5 ? 45 : 95);
      }

      this.collectibles.push({
        type: 'coin',
        x: startX + i * 40,
        y: cy,
        radius: 12,
        color: '#ffe600',
        animTime: Math.random()
      });
    }
  }

  spawnSpecialCollectible() {
    const roll = Math.random();
    const startX = this.game.width + 80;
    const groundY = this.game.groundY;
    const y = groundY - 60 - Math.random() * 100;

    if (roll < 0.20) {
      // Shield Orb
      this.collectibles.push({
        type: 'shield',
        x: startX,
        y: y,
        radius: 18,
        color: '#00ffff'
      });
    } else if (roll < 0.40) {
      // 2x Multiplier Gem
      this.collectibles.push({
        type: 'multiplier',
        x: startX,
        y: y,
        radius: 16,
        color: '#ff00aa'
      });
    } else if (roll < 0.65) {
      // Adventure Mystery Relic Capsule!
      this.collectibles.push({
        type: 'relic',
        x: startX,
        y: y,
        radius: 20,
        color: '#ffbe0b'
      });
    } else {
      // Color Power Orb
      const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
      const chosen = colors[Math.floor(Math.random() * colors.length)];
      const cfg = window.POWER_TYPES[chosen.toUpperCase()];

      this.collectibles.push({
        type: 'power_orb',
        powerId: chosen,
        x: startX,
        y: y,
        radius: 18,
        color: cfg.color,
        name: cfg.name
      });
    }
  }

  collectItem(col) {
    const p = this.game.player;

    if (col.type === 'coin') {
      this.game.addScore(50);
      this.game.addCoin();
      if (window.soundSystem) window.soundSystem.playCoin(this.game.combo);
      if (this.game.particles) {
        this.game.particles.emit(col.x, col.y, 8, {
          color: '#ffe600',
          speed: 3.5,
          life: 0.35,
          shape: 'spark'
        });
      }
    } else if (col.type === 'shield') {
      p.hasShield = true;
      if (window.soundSystem) window.soundSystem.playShield();
      if (this.game.particles) {
        this.game.particles.burst(col.x, col.y, '#00ffff', 25, 6);
        this.game.particles.addText('SHIELD UP!', col.x, col.y - 25, '#00ffff', 22, 1.0);
      }
    } else if (col.type === 'multiplier') {
      this.game.activateScoreMultiplier(2.0, 10.0);
      if (window.soundSystem) window.soundSystem.playGem();
      if (this.game.particles) {
        this.game.particles.burst(col.x, col.y, '#ff00aa', 25, 6);
        this.game.particles.addText('2X SCORE BOOST!', col.x, col.y - 25, '#ff00aa', 22, 1.2);
      }
    } else if (col.type === 'relic') {
      // Mystery Adventure Relic opening!
      this.game.openAdventureRelic(col.x, col.y);
    } else if (col.type === 'power_orb') {
      this.game.powers.setPower(col.powerId);
      this.game.powers.cooldowns[col.powerId] = 0;
      this.game.powers.activateCurrentPower();
      if (window.soundSystem) window.soundSystem.playGem();
      if (this.game.particles) {
        this.game.particles.burst(col.x, col.y, col.color, 35, 7);
        this.game.particles.addText(col.name + ' READY!', col.x, col.y - 30, col.color, 24, 1.3);
      }
      if (this.game.quests) this.game.quests.onPowerUsed();
    }
  }

  checkCollision(player, obs) {
    const cx = player.x;
    const cy = player.y;
    const r = player.radius * 0.82;

    const nearestX = Math.max(obs.x, Math.min(cx, obs.x + obs.width));
    const nearestY = Math.max(obs.y, Math.min(cy, obs.y + obs.height));

    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return (dx * dx + dy * dy) < (r * r);
  }

  checkCloseCall(player, obs) {
    const cx = player.x;
    const cy = player.y;
    const r = player.radius * 1.8;

    const nearestX = Math.max(obs.x, Math.min(cx, obs.x + obs.width));
    const nearestY = Math.max(obs.y, Math.min(cy, obs.y + obs.height));

    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return (dx * dx + dy * dy) < (r * r);
  }

  draw(ctx) {
    const time = performance.now() * 0.002;

    // 1. Draw Ground
    ctx.save();
    for (let i = 0; i < this.groundSegments.length; i++) {
      const seg = this.groundSegments[i];
      if (seg.isGap) continue;

      ctx.fillStyle = '#0a0d24';
      ctx.fillRect(seg.x, this.game.groundY, seg.width, this.game.height - this.game.groundY);

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(seg.x, this.game.groundY);
      ctx.lineTo(seg.x + seg.width, this.game.groundY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      for (let gy = this.game.groundY + 12; gy < this.game.height; gy += 18) {
        ctx.beginPath();
        ctx.moveTo(seg.x, gy);
        ctx.lineTo(seg.x + seg.width, gy);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 2. Draw Adventure Objects (Jump Pads, Speed Rings, Sky Platforms)
    for (let i = 0; i < this.adventureObjects.length; i++) {
      const obj = this.adventureObjects[i];
      ctx.save();

      if (obj.type === 'jumppad') {
        // High-tech glowing jump spring pad
        ctx.fillStyle = '#111936';
        ctx.fillRect(obj.x, obj.y + 4, obj.width, obj.height - 4);

        // Glowing spring top
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 14;
        const springCompress = obj.triggered ? 3 : 0;
        ctx.fillRect(obj.x + 4, obj.y + springCompress, obj.width - 8, 5);

        // Upward chevron arrow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.width / 2 - 8, obj.y + 11);
        ctx.lineTo(obj.x + obj.width / 2, obj.y + 5);
        ctx.lineTo(obj.x + obj.width / 2 + 8, obj.y + 11);
        ctx.stroke();

      } else if (obj.type === 'speedring') {
        // Neon Hyper-Speed Ring
        ctx.translate(obj.x, obj.y);
        ctx.rotate(time * 3);

        ctx.strokeStyle = obj.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = obj.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing crosshair
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-obj.radius * 0.4, 0);
        ctx.lineTo(obj.radius * 0.4, 0);
        ctx.moveTo(0, -obj.radius * 0.4);
        ctx.lineTo(0, obj.radius * 0.4);
        ctx.stroke();

      } else if (obj.type === 'skyplatform') {
        // Futuristic Sky Platform
        ctx.fillStyle = '#0e173e';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(obj.x, obj.y, obj.width, obj.height, 4);
        ctx.fill();

        // Edge neon light
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + obj.width, obj.y);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 3. Draw Obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      ctx.save();

      if (obs.type === 'spikes') {
        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 14;
        
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width * 0.5, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width * 0.5, obs.y + 4);
        ctx.lineTo(obs.x + obs.width * 0.5, obs.y + obs.height - 2);
        ctx.stroke();

      } else if (obs.type === 'laser') {
        ctx.fillStyle = '#1a1f3c';
        ctx.fillRect(obs.x + 4, obs.y, obs.width - 8, obs.height);

        const beamGlow = 12 + Math.sin(time * 8) * 6;
        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = beamGlow;
        ctx.fillRect(obs.x + 8, obs.y + 6, obs.width - 16, obs.height - 12);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(obs.x + 10, obs.y + 10, obs.width - 20, obs.height - 20);

      } else if (obs.type === 'mine') {
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
        ctx.rotate(time * 3);

        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 16;

        ctx.beginPath();
        const spikes = 6;
        const outer = obs.width / 2;
        const inner = outer * 0.55;
        for (let s = 0; s < spikes * 2; s++) {
          const r = s % 2 === 0 ? outer : inner;
          const a = (s * Math.PI) / spikes;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

      } else if (obs.type === 'drone') {
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);

        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 14;

        ctx.beginPath();
        ctx.ellipse(0, 0, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        const eyeOffset = Math.sin(time * 6) * 10;
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(eyeOffset, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 4. Draw Collectibles
    for (let i = 0; i < this.collectibles.length; i++) {
      const col = this.collectibles[i];
      ctx.save();
      ctx.translate(col.x, col.y);

      if (col.type === 'coin') {
        const scaleX = Math.abs(Math.cos(time * 4 + col.animTime * 3));
        ctx.scale(Math.max(0.18, scaleX), 1.0);

        ctx.fillStyle = col.color;
        ctx.shadowColor = col.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(0, -col.radius);
        ctx.lineTo(col.radius, 0);
        ctx.lineTo(0, col.radius);
        ctx.lineTo(-col.radius, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

      } else if (col.type === 'shield') {
        ctx.strokeStyle = col.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = col.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, col.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, col.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

      } else if (col.type === 'multiplier') {
        ctx.fillStyle = col.color;
        ctx.shadowColor = col.color;
        ctx.shadowBlur = 16;
        ctx.rotate(time * 2);

        ctx.beginPath();
        for (let s = 0; s < 5; s++) {
          const a = (s * Math.PI * 2) / 5;
          ctx.lineTo(Math.cos(a) * col.radius, Math.sin(a) * col.radius);
          ctx.lineTo(Math.cos(a + Math.PI / 5) * (col.radius * 0.5), Math.sin(a + Math.PI / 5) * (col.radius * 0.5));
        }
        ctx.closePath();
        ctx.fill();

      } else if (col.type === 'relic') {
        // Adventure Mystery Relic Capsule
        ctx.rotate(time * 2);
        ctx.fillStyle = col.color;
        ctx.shadowColor = col.color;
        ctx.shadowBlur = 22;

        // Prismatic diamond capsule
        ctx.beginPath();
        ctx.moveTo(0, -col.radius * 1.1);
        ctx.lineTo(col.radius * 0.8, 0);
        ctx.lineTo(0, col.radius * 1.1);
        ctx.lineTo(-col.radius * 0.8, 0);
        ctx.closePath();
        ctx.fill();

        // Question mark / star crest
        ctx.fillStyle = '#0a0d24';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

      } else if (col.type === 'power_orb') {
        ctx.fillStyle = col.color;
        ctx.shadowColor = col.color;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.arc(0, 0, col.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(time * 3);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, col.radius * 1.3, col.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}

window.WorldManager = WorldManager;
