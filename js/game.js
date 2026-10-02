/**
 * COLORSHIFT - Core Game Engine & Main Loop
 * 60 FPS physics, screen shake, touch/keyboard input, score tracking,
 * HUD updates, settings management, adventure quests & game modes.
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.bgCanvas = document.getElementById('bg-canvas');
    this.bg3d = null;

    // Dimensions
    this.width = 960;
    this.height = 540;
    this.groundY = 460;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // States: 'TITLE', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.state = 'TITLE';

    // Game Mode: 'adventure', 'zen', 'overdrive'
    this.gameMode = localStorage.getItem('colorshift_gamemode') || 'adventure';

    // Settings
    this.screenShakeEnabled = localStorage.getItem('colorshift_screenshake') !== 'false';
    this.graphicsQuality = localStorage.getItem('colorshift_graphics') || 'high';

    // Systems
    this.particles = new ParticleSystem();
    this.player = new Player(this);
    this.powers = new ColorPowerManager(this);
    this.world = new WorldManager(this);
    this.adventure = new AdventureManager(this);
    this.quests = this.adventure; // Alias

    // Input State
    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      ability: false,
      dash: false
    };

    // Progression & Stats
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('colorshift_highscore') || '0', 10);
    this.distance = 0;
    this.coinsCollected = 0;
    this.maxCombo = 1;
    this.combo = 1;
    this.comboTimer = 0;
    this.powersUsedCount = 0;

    this.baseSpeed = 6.0;
    this.gameSpeed = 6.0;
    this.scoreMultiplier = 1.0;
    this.multiplierTimer = 0;

    // Adventure Boost & Magnet timers
    this.boostTimer = 0;
    this.magnetTimer = 0;
    this.dashCooldown = 0;

    // Screen Shake
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeX = 0;
    this.shakeY = 0;

    // Timing
    this.lastTime = performance.now();

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Initialize 3D Background
    if (window.Background3D && this.bgCanvas) {
      this.bg3d = new Background3D(this.bgCanvas);
      this.bg3d.setQuality(this.graphicsQuality);
      this.bg3d.setColorTheme('default');
    }

    this.setupKeyboardListeners();
    this.setupTouchListeners();
    this.setupUIListeners();
    this.updateHUD();

    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    this.width = 960;
    this.height = 540;
    this.groundY = 460;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.bg3d) {
      this.bg3d.onResize();
    }
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (window.soundSystem && !window.soundSystem.initialized) {
        window.soundSystem.init();
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
        return;
      }

      if (e.code === 'KeyR' && (this.state === 'GAMEOVER' || this.state === 'PAUSED')) {
        this.startNewGame();
        return;
      }

      if (this.state === 'TITLE' && (e.code === 'Space' || e.code === 'Enter')) {
        this.startNewGame();
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.input.up = true;
        if (this.state === 'PLAYING') this.player.jump();
      }
      if (e.code === 'Space') {
        this.input.jump = true;
        if (this.state === 'PLAYING') this.player.jump();
      }

      // Ability
      if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyC') {
        this.triggerAbility();
      }

      // Air Dash / Boost
      if (e.code === 'KeyQ' || e.code === 'KeyF') {
        this.triggerDash();
      }

      // 1-5 Power Keys
      if (e.code === 'Digit1') this.powers.setPower('red');
      if (e.code === 'Digit2') this.powers.setPower('blue');
      if (e.code === 'Digit3') this.powers.setPower('green');
      if (e.code === 'Digit4') this.powers.setPower('yellow');
      if (e.code === 'Digit5') this.powers.setPower('purple');
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.input.up = false;
      if (e.code === 'Space') this.input.jump = false;
    });
  }

  setupTouchListeners() {
    const bindTouch = (elem, onPress, onRelease) => {
      if (!elem) return;
      elem.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (window.soundSystem && !window.soundSystem.initialized) window.soundSystem.init();
        onPress();
      }, { passive: false });
      elem.addEventListener('touchend', (e) => {
        e.preventDefault();
        onRelease();
      }, { passive: false });
      elem.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        onRelease();
      }, { passive: false });
    };

    bindTouch(document.getElementById('touch-left'), () => this.input.left = true, () => this.input.left = false);
    bindTouch(document.getElementById('touch-right'), () => this.input.right = true, () => this.input.right = false);
    bindTouch(document.getElementById('touch-jump'), () => {
      this.input.jump = true;
      if (this.state === 'PLAYING') this.player.jump();
      else if (this.state === 'TITLE') this.startNewGame();
    }, () => this.input.jump = false);

    bindTouch(document.getElementById('touch-ability'), () => this.triggerAbility(), () => {});
    bindTouch(document.getElementById('touch-dash'), () => this.triggerDash(), () => {});

    // Swipe controls
    this.canvas.addEventListener('touchstart', (e) => {
      if (window.soundSystem && !window.soundSystem.initialized) window.soundSystem.init();
      if (this.state === 'TITLE') {
        this.startNewGame();
        return;
      }
      const t = e.touches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStartX;
      const dy = t.clientY - this.touchStartY;

      if (Math.abs(dy) > 40 && dy < -30) {
        this.player.jump();
      } else if (Math.abs(dx) > 50) {
        this.powers.cyclePower(dx > 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  setupUIListeners() {
    // Start button
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (window.soundSystem) window.soundSystem.init();
        this.startNewGame();
      });
    }

    // Modal navigation
    const bindBtn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    bindBtn('hud-pause-btn', () => this.togglePause());
    bindBtn('btn-resume', () => this.togglePause());
    bindBtn('btn-restart', () => this.startNewGame());
    bindBtn('btn-play-again', () => this.startNewGame());
    bindBtn('hud-quick-restart-btn', () => this.startNewGame());

    // Settings Modal
    bindBtn('hud-settings-btn', () => this.openModal('settings-modal'));
    bindBtn('title-settings-btn', () => this.openModal('settings-modal'));
    bindBtn('btn-close-settings', () => this.closeModal('settings-modal'));

    // Quests Modal
    bindBtn('hud-quests-btn', () => {
      this.populateQuestsModal();
      this.openModal('quests-modal');
    });
    bindBtn('btn-close-quests', () => this.closeModal('quests-modal'));

    // Customizer Modal
    bindBtn('hud-customizer-btn', () => this.openModal('customizer-modal'));
    bindBtn('title-customizer-btn', () => this.openModal('customizer-modal'));
    bindBtn('btn-close-customizer', () => this.closeModal('customizer-modal'));

    // Sound toggle
    const soundToggle = document.getElementById('hud-sound-btn');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        if (window.soundSystem) {
          window.soundSystem.init();
          const muted = window.soundSystem.toggleMute();
          soundToggle.classList.toggle('muted', muted);
        }
      });
    }

    // Volume Sliders
    const musicSlider = document.getElementById('setting-music-vol');
    if (musicSlider) {
      musicSlider.addEventListener('input', (e) => {
        if (window.soundSystem) window.soundSystem.setMusicVolume(parseFloat(e.target.value));
      });
    }

    const sfxSlider = document.getElementById('setting-sfx-vol');
    if (sfxSlider) {
      sfxSlider.addEventListener('input', (e) => {
        if (window.soundSystem) window.soundSystem.setSfxVolume(parseFloat(e.target.value));
      });
    }

    // Game Mode selection pills
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gameMode = btn.getAttribute('data-mode');
        localStorage.setItem('colorshift_gamemode', this.gameMode);
        this.adventure.showToast(`Game Mode: ${btn.innerText}`);
      });
    });

    // Graphics Quality selection
    document.querySelectorAll('.gfx-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.gfx-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.graphicsQuality = btn.getAttribute('data-gfx');
        localStorage.setItem('colorshift_graphics', this.graphicsQuality);
        if (this.bg3d) this.bg3d.setQuality(this.graphicsQuality);
      });
    });

    // Screen Shake toggle
    const shakeToggle = document.getElementById('setting-shake');
    if (shakeToggle) {
      shakeToggle.checked = this.screenShakeEnabled;
      shakeToggle.addEventListener('change', (e) => {
        this.screenShakeEnabled = e.target.checked;
        localStorage.setItem('colorshift_screenshake', this.screenShakeEnabled.toString());
      });
    }

    // Skin selection
    document.querySelectorAll('.skin-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.skin-choice').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const skinId = btn.getAttribute('data-skin');
        this.adventure.setSkin(skinId);
      });
    });

    // Trail selection
    document.querySelectorAll('.trail-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.trail-choice').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const trailId = btn.getAttribute('data-trail');
        this.adventure.setTrail(trailId);
      });
    });

    // Power switcher pills
    const powerButtons = document.querySelectorAll('.power-pill');
    powerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-power');
        this.powers.setPower(pId);
        this.updateHUD();
      });
    });
  }

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
  }

  populateQuestsModal() {
    const list = document.getElementById('quests-modal-list');
    if (!list) return;
    const rank = this.adventure.getCurrentRank();
    const nextRank = this.adventure.getNextRank();

    let html = `
      <div class="rank-banner">
        <span class="rank-title">Rank ${rank.level}: <strong>${rank.name}</strong></span>
        <span class="rank-xp">${this.adventure.totalXP} Total XP</span>
      </div>
    `;

    this.adventure.activeQuests.forEach(q => {
      const isDone = q.completed || q.progress >= q.target;
      html += `
        <div class="quest-modal-card ${isDone ? 'completed' : ''}">
          <div class="quest-info">
            <h4>${q.title} ${isDone ? '✅' : ''}</h4>
            <p>${q.desc}</p>
          </div>
          <div class="quest-progress-box">
            <span class="quest-nums">${Math.min(q.target, q.progress)} / ${q.target}</span>
            <span class="quest-xp-badge">+${q.rewardXP} XP</span>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  startNewGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.distance = 0;
    this.coinsCollected = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.comboTimer = 0;
    this.powersUsedCount = 0;
    this.boostTimer = 0;
    this.magnetTimer = 0;
    this.dashCooldown = 0;

    // Overdrive mode increases base speed
    this.baseSpeed = this.gameMode === 'overdrive' ? 8.2 : 6.0;
    this.gameSpeed = this.baseSpeed;
    this.scoreMultiplier = this.gameMode === 'overdrive' ? 1.5 : 1.0;
    this.multiplierTimer = 0;

    this.player.reset();
    this.powers.reset();
    this.world.reset();
    this.particles.clear();
    this.adventure.resetRun();

    if (this.bg3d) {
      this.bg3d.setColorTheme('default');
      this.bg3d.setSpeed(1.0);
    }

    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('pause-modal').classList.add('hidden');
    document.getElementById('gameover-modal').classList.add('hidden');
    document.getElementById('settings-modal').classList.add('hidden');
    document.getElementById('quests-modal').classList.add('hidden');
    document.getElementById('customizer-modal').classList.add('hidden');
    document.getElementById('hud-overlay').classList.remove('hidden');

    this.updateHUD();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      document.getElementById('pause-modal').classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      document.getElementById('pause-modal').classList.add('hidden');
      this.lastTime = performance.now();
    }
  }

  triggerAbility() {
    if (this.state !== 'PLAYING') return;
    const activated = this.powers.activateCurrentPower();
    if (activated) {
      this.powersUsedCount++;
      if (this.adventure) this.adventure.onPowerUsed();
      this.updateHUD();
    }
  }

  triggerDash() {
    if (this.state !== 'PLAYING' || this.dashCooldown > 0) return;
    this.dashCooldown = 3.5;
    this.boostTimer = 1.6;
    this.player.vx += 10;
    this.shakeScreen(0.3, 6);
    if (window.soundSystem) window.soundSystem.playSpeedRing();
    if (this.particles) {
      this.particles.burst(this.player.x, this.player.y, '#00ffff', 25, 6);
      this.particles.addText('AIR DASH!', this.player.x, this.player.y - 35, '#00ffff', 22, 0.9);
    }
  }

  addScore(amount) {
    const earned = Math.round(amount * this.combo * this.scoreMultiplier);
    this.score += earned;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('colorshift_highscore', this.highScore.toString());
    }
    this.updateHUD();
  }

  addCoin() {
    this.coinsCollected++;
    if (this.adventure) this.adventure.onCoinCollected();
    this.updateHUD();
  }

  addCombo() {
    this.combo = Math.min(10, this.combo + 1);
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 4.2;
    if (this.adventure) this.adventure.onComboReached(this.combo);
    if (this.combo > 2 && window.soundSystem) {
      window.soundSystem.playCombo();
    }
    this.updateHUD();
  }

  addCloseCall() {
    this.addScore(150);
    this.addCombo();
    this.shakeScreen(0.2, 4);
    if (this.adventure) this.adventure.onCloseCall();
    if (this.particles) {
      this.particles.addText('CLOSE CALL! +150', this.player.x, this.player.y - 45, '#00f0ff', 22, 1.0);
      this.particles.burst(this.player.x, this.player.y, '#00f0ff', 15, 4);
    }
  }

  openAdventureRelic(x, y) {
    // Mystery Relic rewards
    const rewards = ['shield', 'magnet', 'multiplier', 'coins'];
    const pick = rewards[Math.floor(Math.random() * rewards.length)];

    if (window.soundSystem) window.soundSystem.playRelic();

    if (pick === 'shield') {
      this.player.hasShield = true;
      if (this.particles) {
        this.particles.burst(x, y, '#00ffff', 35, 8);
        this.particles.addText('MYSTERY: MEGA SHIELD!', x, y - 35, '#00ffff', 24, 1.3);
      }
    } else if (pick === 'magnet') {
      this.magnetTimer = 8.0;
      if (this.particles) {
        this.particles.burst(x, y, '#ffe600', 35, 8);
        this.particles.addText('MYSTERY: COIN MAGNET 8s!', x, y - 35, '#ffe600', 24, 1.3);
      }
    } else if (pick === 'multiplier') {
      this.activateScoreMultiplier(3.0, 10.0);
      if (this.particles) {
        this.particles.burst(x, y, '#ff00aa', 35, 8);
        this.particles.addText('MYSTERY: 3X FRENZY 10s!', x, y - 35, '#ff00aa', 24, 1.3);
      }
    } else {
      this.addScore(500);
      this.coinsCollected += 10;
      if (this.particles) {
        this.particles.burst(x, y, '#ffbe0b', 35, 8);
        this.particles.addText('MYSTERY: +500 PTS BONUS!', x, y - 35, '#ffbe0b', 24, 1.3);
      }
    }
  }

  activateScoreMultiplier(factor, duration) {
    this.scoreMultiplier = factor;
    this.multiplierTimer = duration;
  }

  shakeScreen(duration, intensity) {
    if (!this.screenShakeEnabled) return;
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.shakeScreen(0.6, 12);
    if (window.soundSystem) window.soundSystem.playGameOver();

    const isNewHigh = this.score >= this.highScore && this.score > 0;
    if (isNewHigh) {
      this.highScore = this.score;
      localStorage.setItem('colorshift_highscore', this.highScore.toString());
      if (this.particles) {
        this.particles.confetti(this.width / 2, this.height / 2);
      }
    }

    document.getElementById('final-score').innerText = this.score.toLocaleString();
    document.getElementById('best-score-display').innerText = this.highScore.toLocaleString();
    document.getElementById('stat-distance').innerText = Math.round(this.distance) + 'm';
    document.getElementById('stat-coins').innerText = this.coinsCollected;
    document.getElementById('stat-combo').innerText = 'x' + this.maxCombo;
    document.getElementById('stat-powers').innerText = this.powersUsedCount;

    const rank = this.adventure.getCurrentRank();
    const rankBadge = document.getElementById('gameover-rank-badge');
    if (rankBadge) {
      rankBadge.innerText = `Rank ${rank.level}: ${rank.name} (${this.adventure.totalXP} XP)`;
    }

    const newBestBadge = document.getElementById('new-best-badge');
    if (newBestBadge) {
      newBestBadge.classList.toggle('hidden', !isNewHigh);
    }

    document.getElementById('gameover-modal').classList.remove('hidden');
  }

  updateHUD() {
    const elScore = document.getElementById('hud-score');
    if (elScore) elScore.innerText = this.score.toLocaleString();

    const elBest = document.getElementById('hud-high-score');
    if (elBest) elBest.innerText = this.highScore.toLocaleString();

    const elDist = document.getElementById('hud-distance');
    if (elDist) elDist.innerText = Math.round(this.distance) + 'm';

    const elCombo = document.getElementById('hud-combo');
    if (elCombo) {
      elCombo.innerText = 'x' + this.combo;
      elCombo.classList.toggle('combo-active', this.combo > 1);
    }

    const curP = this.powers.currentPower;
    const touchAbilityBtn = document.getElementById('touch-ability');
    if (touchAbilityBtn) {
      touchAbilityBtn.style.borderColor = curP.color;
      touchAbilityBtn.style.boxShadow = `0 0 15px ${curP.color}`;
      const label = touchAbilityBtn.querySelector('.ability-name');
      if (label) label.innerText = curP.name;
    }

    document.querySelectorAll('.power-pill').forEach(pill => {
      const pId = pill.getAttribute('data-power');
      pill.classList.toggle('active', pId === curP.id);
    });

    const shieldIcon = document.getElementById('hud-shield-icon');
    if (shieldIcon) {
      shieldIcon.classList.toggle('active', this.player.hasShield);
    }

    // Active Quest display in HUD
    if (this.adventure) {
      this.adventure.updateHUDQuestDisplay();
    }
  }

  update(delta) {
    if (this.state !== 'PLAYING') return;

    const baseSpeedSetting = this.gameMode === 'overdrive' ? 8.2 : 6.0;
    this.baseSpeed = baseSpeedSetting + Math.min(6.0, this.distance / 1200);
    this.gameSpeed = this.baseSpeed;
    this.distance += this.gameSpeed * delta * 15;

    if (this.adventure) {
      this.adventure.onDistanceUpdated(this.distance);
    }

    if (this.boostTimer > 0) {
      this.boostTimer -= delta;
    }

    if (this.magnetTimer > 0) {
      this.magnetTimer -= delta;
    }

    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    }

    if (this.multiplierTimer > 0) {
      this.multiplierTimer -= delta;
      if (this.multiplierTimer <= 0) {
        this.scoreMultiplier = this.gameMode === 'overdrive' ? 1.5 : 1.0;
      }
    }

    if (this.combo > 1) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.updateHUD();
      }
    }

    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    this.powers.update(delta);
    this.player.update(delta);
    this.world.update(delta);
    this.particles.update(delta);

    if (this.bg3d) {
      let speedMult = 1.0;
      if (this.powers.isActive && this.powers.currentPower.id === 'red') speedMult = 0.35;
      if (this.powers.isActive && this.powers.currentPower.id === 'yellow') speedMult = 2.4;
      if (this.boostTimer > 0) speedMult = 1.8;
      this.bg3d.setSpeed(speedMult * (this.gameSpeed / 6.0));
      this.bg3d.update(delta, { x: this.player.x - this.width / 2, y: this.groundY - this.player.y });
    }

    const cd = this.powers.cooldowns[this.powers.currentPower.id];
    const maxCd = this.powers.currentPower.cooldown;
    const cdProgress = cd > 0 ? cd / maxCd : 0;
    const abilityFill = document.getElementById('ability-cooldown-fill');
    if (abilityFill) {
      abilityFill.style.height = `${(1 - cdProgress) * 100}%`;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    if (this.shakeX !== 0 || this.shakeY !== 0) {
      this.ctx.translate(this.shakeX, this.shakeY);
    }

    this.world.draw(this.ctx);
    this.powers.draw(this.ctx);
    this.player.draw(this.ctx);
    this.particles.draw(this.ctx);

    this.ctx.restore();
  }

  loop(timestamp) {
    const delta = Math.min((timestamp - this.lastTime) * 0.001, 0.1);
    this.lastTime = timestamp;

    this.update(delta);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
