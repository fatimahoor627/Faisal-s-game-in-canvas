/**
 * COLORSHIFT - 5-Color Power System
 * Red: Slows obstacles (Matrix Slow-Mo)
 * Blue: Enables short flight (Gravity Flight)
 * Green: Creates temporary platforms (Hard-Light Manifestation)
 * Yellow: Gives a speed boost + invulnerability (Hyperdash Blitz)
 * Purple: Reverses time for a few seconds (Quantum Rewind)
 */

const POWER_TYPES = {
  RED: {
    id: 'red',
    name: 'CHRONO SLOW',
    color: '#ff2a5f',
    glowColor: 'rgba(255, 42, 95, 0.45)',
    duration: 4.5,
    cooldown: 8.0,
    desc: 'Slows down all obstacles by 70%',
    key: '1'
  },
  BLUE: {
    id: 'blue',
    name: 'GRAV FLIGHT',
    color: '#00d2ff',
    glowColor: 'rgba(0, 210, 255, 0.45)',
    duration: 3.8,
    cooldown: 7.0,
    desc: 'Defies gravity with plasma thrusters',
    key: '2'
  },
  GREEN: {
    id: 'green',
    name: 'LIGHT BRIDGE',
    color: '#00ff88',
    glowColor: 'rgba(0, 255, 136, 0.45)',
    duration: 4.5,
    cooldown: 6.0,
    desc: 'Spawns temporary solid platforms',
    key: '3'
  },
  YELLOW: {
    id: 'yellow',
    name: 'HYPERDASH',
    color: '#ffe600',
    glowColor: 'rgba(255, 230, 0, 0.45)',
    duration: 3.2,
    cooldown: 8.0,
    desc: 'Blitz speed, invincibility & coin magnet',
    key: '4'
  },
  PURPLE: {
    id: 'purple',
    name: 'TIME REWIND',
    color: '#c800ff',
    glowColor: 'rgba(200, 0, 255, 0.45)',
    duration: 2.2,
    cooldown: 9.0,
    desc: 'Reverses time to escape danger',
    key: '5'
  }
};

class ColorPowerManager {
  constructor(game) {
    this.game = game;
    this.currentPower = POWER_TYPES.RED;
    this.unlockedPowers = [POWER_TYPES.RED, POWER_TYPES.BLUE, POWER_TYPES.GREEN, POWER_TYPES.YELLOW, POWER_TYPES.PURPLE];
    
    this.isActive = false;
    this.activeTimeRemaining = 0;
    this.cooldowns = {
      red: 0,
      blue: 0,
      green: 0,
      yellow: 0,
      purple: 0
    };

    // Green Platforms
    this.tempPlatforms = [];

    // Purple Rewind Buffer (stores state snapshots)
    this.rewindBuffer = [];
    this.maxRewindFrames = 150; // ~3.5 seconds at 45-60fps
    this.isRewinding = false;
    this.rewindTargetIndex = 0;
  }

  reset() {
    this.currentPower = POWER_TYPES.RED;
    this.isActive = false;
    this.activeTimeRemaining = 0;
    for (const key in this.cooldowns) {
      this.cooldowns[key] = 0;
    }
    this.tempPlatforms = [];
    this.rewindBuffer = [];
    this.isRewinding = false;
  }

  setPower(powerKey) {
    const p = typeof powerKey === 'string' ? POWER_TYPES[powerKey.toUpperCase()] : powerKey;
    if (!p) return;
    this.currentPower = p;
    if (this.game.bg3d) {
      this.game.bg3d.setColorTheme(p.id);
    }
  }

  cyclePower(direction = 1) {
    const list = Object.values(POWER_TYPES);
    let idx = list.findIndex(p => p.id === this.currentPower.id);
    idx = (idx + direction + list.length) % list.length;
    this.setPower(list[idx]);
    if (window.soundSystem) window.soundSystem.resume();
  }

  canActivate() {
    return !this.isActive && !this.isRewinding && this.cooldowns[this.currentPower.id] <= 0;
  }

  activateCurrentPower() {
    if (!this.canActivate()) return false;

    this.isActive = true;
    this.activeTimeRemaining = this.currentPower.duration;
    this.cooldowns[this.currentPower.id] = this.currentPower.cooldown;

    // Trigger visual/audio based on power
    const id = this.currentPower.id;
    if (window.soundSystem) {
      if (id === 'red') window.soundSystem.playRedPower();
      if (id === 'blue') window.soundSystem.playBluePower();
      if (id === 'green') window.soundSystem.playGreenPower();
      if (id === 'yellow') window.soundSystem.playYellowPower();
      if (id === 'purple') window.soundSystem.playPurplePower();
    }

    // Specific immediate triggers
    if (id === 'green') {
      this.spawnGreenPlatforms();
    } else if (id === 'purple') {
      this.startRewind();
    } else if (id === 'yellow') {
      this.game.shakeScreen(0.4, 8);
    }

    if (this.game.particles) {
      const px = this.game.player.x;
      const py = this.game.player.y;
      this.game.particles.addShockwave(px, py, this.currentPower.color, 140, 0.5);
      this.game.particles.addText(this.currentPower.name + '!', px, py - 40, this.currentPower.color, 24, 1.1);
    }

    return true;
  }

  spawnGreenPlatforms() {
    // Spawns 3 stepped platforms ahead of player
    const px = this.game.player.x;
    const py = this.game.player.y;
    const platWidth = 140;
    const platHeight = 16;
    const count = 3;

    this.tempPlatforms = [];
    for (let i = 0; i < count; i++) {
      this.tempPlatforms.push({
        x: px + 30 + i * 140,
        y: Math.min(this.game.groundY - 40, py + 25 - (i * 30)),
        width: platWidth,
        height: platHeight,
        life: 4.8,
        maxLife: 4.8,
        color: '#00ff88',
        pulse: 0
      });
    }

    // Spawn green crystal sparkles
    if (this.game.particles) {
      this.tempPlatforms.forEach(p => {
        this.game.particles.emit(p.x + p.width / 2, p.y, 16, {
          color: '#00ff88',
          speed: 4,
          shape: 'star',
          life: 0.6
        });
      });
    }
  }

  startRewind() {
    if (this.rewindBuffer.length < 15) return; // Not enough history
    this.isRewinding = true;
    this.game.shakeScreen(0.5, 6);
  }

  recordSnapshot() {
    if (this.isRewinding) return;
    const p = this.game.player;
    this.rewindBuffer.push({
      x: p.x,
      y: p.y,
      vy: p.vy,
      isGrounded: p.isGrounded,
      score: this.game.score,
      distance: this.game.distance,
      combo: this.game.combo
    });

    if (this.rewindBuffer.length > this.maxRewindFrames) {
      this.rewindBuffer.shift();
    }
  }

  update(delta) {
    // Cooldown countdowns
    for (const key in this.cooldowns) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - delta);
      }
    }

    // Active power countdown
    if (this.isActive && !this.isRewinding) {
      this.activeTimeRemaining -= delta;
      if (this.activeTimeRemaining <= 0) {
        this.isActive = false;
        this.activeTimeRemaining = 0;
      }
    }

    // Purple Rewind playback
    if (this.isRewinding) {
      if (this.rewindBuffer.length > 0) {
        // Rewind 2-3 frames per update for fast rewind feel
        const framesToPop = Math.min(3, this.rewindBuffer.length);
        let snapshot = null;
        for (let i = 0; i < framesToPop; i++) {
          snapshot = this.rewindBuffer.pop();
        }

        if (snapshot) {
          this.game.player.x = snapshot.x;
          this.game.player.y = snapshot.y;
          this.game.player.vy = snapshot.vy * 0.5;
          this.game.player.isGrounded = snapshot.isGrounded;
          this.game.score = snapshot.score;
          this.game.distance = snapshot.distance;
          this.game.combo = snapshot.combo;

          // Rewind ghost particle
          if (this.game.particles && Math.random() < 0.7) {
            this.game.particles.emit(snapshot.x, snapshot.y, 2, {
              color: '#c800ff',
              speed: 2,
              life: 0.35,
              shape: 'spark'
            });
          }
        }
      } else {
        // Rewind completed!
        this.isRewinding = false;
        this.isActive = false;
        this.game.player.invulnerableTime = 1.5; // Brief grace period after rewind
        if (this.game.particles) {
          this.game.particles.burst(this.game.player.x, this.game.player.y, '#c800ff', 20, 5);
        }
      }
    }

    // Update Green Temporary Platforms
    for (let i = this.tempPlatforms.length - 1; i >= 0; i--) {
      const plat = this.tempPlatforms[i];
      plat.life -= delta;
      plat.pulse += delta * 5;
      // Scroll platforms backward with world speed
      plat.x -= this.game.gameSpeed * delta * 60;

      if (plat.life <= 0 || plat.x + plat.width < -50) {
        if (this.game.particles) {
          this.game.particles.emit(plat.x + plat.width / 2, plat.y, 10, {
            color: '#00ff88',
            speed: 3,
            life: 0.4
          });
        }
        this.tempPlatforms.splice(i, 1);
      }
    }

    // Record rewind snapshot every ~2 frames
    if (this.game.state === 'PLAYING' && !this.isRewinding) {
      this.recordSnapshot();
    }
  }

  draw(ctx) {
    // Draw Green Hard-Light Platforms
    if (this.tempPlatforms.length > 0) {
      ctx.save();
      for (let i = 0; i < this.tempPlatforms.length; i++) {
        const plat = this.tempPlatforms[i];
        const progress = plat.life / plat.maxLife;
        const alpha = Math.min(1, progress * 1.5);
        const glow = 10 + Math.sin(plat.pulse) * 4;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = glow;

        // Draw futuristic hexagonal edge platform
        const r = 4;
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.width, plat.height, r);
        ctx.fill();

        // Inner glowing core line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plat.x + 8, plat.y + plat.height / 2);
        ctx.lineTo(plat.x + plat.width - 8, plat.y + plat.height / 2);
        ctx.stroke();

        // Energy node crystals on ends
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(plat.x + 2, plat.y + 2, 4, plat.height - 4);
        ctx.fillRect(plat.x + plat.width - 6, plat.y + 2, 4, plat.height - 4);
      }
      ctx.restore();
    }

    // Screen-space color overlay / vignette when an ability is active
    if (this.isActive || this.isRewinding) {
      ctx.save();
      const alpha = this.isRewinding ? 0.25 : Math.min(0.18, (this.activeTimeRemaining / this.currentPower.duration) * 0.25);
      
      const grad = ctx.createRadialGradient(
        this.game.width / 2, this.game.height / 2, 100,
        this.game.width / 2, this.game.height / 2, Math.max(this.game.width, this.game.height) * 0.7
      );
      
      const col = this.isRewinding ? '#c800ff' : this.currentPower.color;
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, col);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.game.width, this.game.height);

      // Rewind scanlines / glitch
      if (this.isRewinding) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        for (let y = 0; y < this.game.height; y += 4) {
          ctx.fillRect(0, y, this.game.width, 2);
        }
      }
      ctx.restore();
    }
  }
}

window.POWER_TYPES = POWER_TYPES;
window.ColorPowerManager = ColorPowerManager;
