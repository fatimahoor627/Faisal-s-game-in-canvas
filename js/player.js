/**
 * COLORSHIFT - Lumie the Energy Creature
 * Responsive physics, dynamic squish & stretch, expressive eye animations,
 * orbiting plasma motes, unlockable skins, and customizable trail effects.
 */

class Player {
  constructor(game) {
    this.game = game;
    this.x = 120;
    this.y = 300;
    this.radius = 24;
    this.vx = 0;
    this.vy = 0;
    
    // Movement tuning
    this.moveSpeed = 6.4;
    this.gravity = 0.58;
    this.jumpForce = -13.5;
    this.doubleJumpForce = -12.0;
    this.hasDoubleJump = true;
    this.isGrounded = false;
    
    // Squash & Stretch
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    
    // Animation & Emotion
    this.animTime = 0;
    this.eyeBlinkTimer = 3.0;
    this.isBlinking = false;
    this.eyeTargetX = 0;
    this.eyeTargetY = 0;

    // Satellites / Orbiting Motes
    this.orbitMotes = [
      { angle: 0, distance: 34, speed: 2.5, size: 5 },
      { angle: Math.PI * 0.66, distance: 30, speed: -3.2, size: 4 },
      { angle: Math.PI * 1.33, distance: 38, speed: 2.0, size: 4.5 }
    ];

    // Trailing ribbon positions
    this.trailPoints = [];
    this.maxTrail = 14;

    // Skin & Appearance
    this.skinColors = {
      classic: '#00f0ff',
      amber: '#ffbe0b',
      magenta: '#ff0077',
      emerald: '#00ff88',
      violet: '#c800ff',
      gold: '#ffd700'
    };
    this.currentSkin = 'classic';

    // State & Shield
    this.hasShield = false;
    this.shieldAngle = 0;
    this.invulnerableTime = 0;
    this.isAlive = true;
  }

  applySkin(skinId) {
    this.currentSkin = skinId || 'classic';
  }

  reset() {
    this.x = 140;
    this.y = this.game.groundY - this.radius;
    this.vx = 0;
    this.vy = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.isGrounded = true;
    this.hasDoubleJump = true;
    this.hasShield = false;
    this.invulnerableTime = 0;
    this.isAlive = true;
    this.trailPoints = [];
    if (this.game.adventure) {
      this.currentSkin = this.game.adventure.currentSkin;
    }
  }

  jump() {
    if (!this.isAlive) return;

    if (this.game.powers.isActive && this.game.powers.currentPower.id === 'blue') {
      this.vy = -7.5;
      this.scaleX = 0.85;
      this.scaleY = 1.25;
      if (window.soundSystem) window.soundSystem.playBluePower();
      return;
    }

    if (this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      this.hasDoubleJump = true;
      this.scaleX = 0.7;
      this.scaleY = 1.35;
      if (window.soundSystem) window.soundSystem.playJump();
      if (this.game.particles) {
        this.game.particles.emit(this.x, this.y + this.radius, 12, {
          color: this.getActiveColor(),
          speed: 3,
          gravity: 0.1,
          life: 0.35
        });
      }
    } else if (this.hasDoubleJump) {
      this.vy = this.doubleJumpForce;
      this.hasDoubleJump = false;
      this.scaleX = 0.75;
      this.scaleY = 1.3;
      if (window.soundSystem) window.soundSystem.playDoubleJump();
      if (this.game.particles) {
        this.game.particles.addShockwave(this.x, this.y + this.radius, '#00d2ff', 45, 0.3);
        this.game.particles.burst(this.x, this.y + this.radius, '#00d2ff', 14, 4);
      }
    }
  }

  getActiveColor() {
    if (this.game.powers.isActive) {
      return this.game.powers.currentPower.color;
    }
    return this.skinColors[this.currentSkin] || '#00f0ff';
  }

  update(delta) {
    if (!this.isAlive) return;

    this.animTime += delta;
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= delta;
    }

    const input = this.game.input;
    let targetVx = 0;
    if (input.left) targetVx -= this.moveSpeed;
    if (input.right) targetVx += this.moveSpeed;

    this.vx += (targetVx - this.vx) * 0.22;
    this.x += this.vx * delta * 60;

    const minX = this.radius + 20;
    const maxX = this.game.width * 0.85;
    if (this.x < minX) { this.x = minX; this.vx = 0; }
    if (this.x > maxX) { this.x = maxX; this.vx = 0; }

    const isFlightActive = this.game.powers.isActive && this.game.powers.currentPower.id === 'blue';
    if (isFlightActive) {
      if (input.jump || input.up) {
        this.vy += (-12.0 - this.vy) * 0.15;
        if (Math.random() < 0.4 && this.game.particles) {
          this.game.particles.emit(this.x - 10, this.y + this.radius * 0.8, 2, {
            color: '#00d2ff',
            speed: 4,
            angle: Math.PI * 0.5,
            spread: 0.5,
            life: 0.3
          });
        }
      } else {
        this.vy += (2.0 - this.vy) * 0.08;
      }
    } else {
      this.vy += this.gravity * delta * 60;
    }

    this.y += this.vy * delta * 60;

    // Check Green Platforms
    let onTempPlatform = false;
    const platforms = this.game.powers.tempPlatforms;
    for (let i = 0; i < platforms.length; i++) {
      const plat = platforms[i];
      if (
        this.vy >= 0 &&
        this.x + this.radius * 0.6 >= plat.x &&
        this.x - this.radius * 0.6 <= plat.x + plat.width &&
        this.y + this.radius >= plat.y &&
        this.y + this.radius <= plat.y + plat.height + 14
      ) {
        this.y = plat.y - this.radius;
        this.vy = 0;
        onTempPlatform = true;
        break;
      }
    }

    // Ground Collision
    const groundLimit = this.game.groundY - this.radius;
    if (this.y >= groundLimit) {
      this.y = groundLimit;
      this.vy = 0;
      if (!this.isGrounded) {
        this.onLand();
      }
      this.isGrounded = true;
      this.hasDoubleJump = true;
    } else if (onTempPlatform) {
      if (!this.isGrounded) {
        this.onLand();
      }
      this.isGrounded = true;
      this.hasDoubleJump = true;
    } else {
      this.isGrounded = false;
    }

    // Ceiling Collision
    if (this.y < this.radius + 10) {
      this.y = this.radius + 10;
      this.vy = Math.max(0, this.vy);
    }

    // Squash & Stretch Spring
    this.scaleX += (1.0 - this.scaleX) * 0.15;
    this.scaleY += (1.0 - this.scaleY) * 0.15;

    // Blinking
    this.eyeBlinkTimer -= delta;
    if (this.eyeBlinkTimer <= 0) {
      this.isBlinking = true;
      if (this.eyeBlinkTimer <= -0.15) {
        this.isBlinking = false;
        this.eyeBlinkTimer = 2.5 + Math.random() * 3;
      }
    }

    this.eyeTargetX = (this.vx / this.moveSpeed) * 6;
    this.eyeTargetY = (this.vy / 10) * 4;

    this.orbitMotes.forEach(m => {
      m.angle += m.speed * delta;
    });

    this.trailPoints.unshift({ x: this.x, y: this.y });
    if (this.trailPoints.length > this.maxTrail) {
      this.trailPoints.pop();
    }

    if (this.hasShield) {
      this.shieldAngle += delta * 3.5;
    }

    if (Math.random() < 0.6 && this.game.particles) {
      const activeColor = this.getActiveColor();
      this.game.particles.emit(
        this.x + (Math.random() - 0.5) * 16,
        this.y + (Math.random() - 0.5) * 16,
        1,
        {
          color: activeColor,
          speed: 1.5,
          life: 0.35,
          size: 3,
          shape: this.game.adventure && this.game.adventure.currentTrail === 'sparks' ? 'spark' : 'circle'
        }
      );
    }
  }

  onLand() {
    this.scaleX = 1.35;
    this.scaleY = 0.7;
    if (window.soundSystem) window.soundSystem.playLand();
    if (this.game.particles) {
      this.game.particles.emit(this.x, this.y + this.radius, 10, {
        color: this.getActiveColor(),
        speed: 3.5,
        spread: Math.PI,
        angle: 0,
        gravity: 0.1,
        life: 0.3
      });
    }
  }

  takeHit() {
    if (this.invulnerableTime > 0) return false;

    if (this.game.powers.isActive && this.game.powers.currentPower.id === 'yellow') {
      return false;
    }

    if (this.game.boostTimer > 0) {
      return false; // Invulnerable during speed ring boost!
    }

    // Zen Mode: No death, gentle bounce back
    if (this.game.gameMode === 'zen') {
      this.invulnerableTime = 1.2;
      this.game.shakeScreen(0.2, 4);
      if (this.game.particles) {
        this.game.particles.burst(this.x, this.y, '#00ffff', 15, 4);
      }
      return false;
    }

    if (this.hasShield) {
      this.hasShield = false;
      this.invulnerableTime = 1.6;
      this.game.shakeScreen(0.4, 7);
      if (window.soundSystem) window.soundSystem.playHurt();
      if (this.game.particles) {
        this.game.particles.burst(this.x, this.y, '#00f0ff', 30, 7);
        this.game.particles.addText('SHIELD BROKEN!', this.x, this.y - 35, '#00f0ff', 20, 1.0);
      }
      return false;
    }

    if (this.game.powers.currentPower.id === 'purple' && this.game.powers.canActivate()) {
      this.game.powers.activateCurrentPower();
      this.invulnerableTime = 1.5;
      if (this.game.particles) {
        this.game.particles.addText('REWIND SAVED YOU!', this.x, this.y - 45, '#c800ff', 24, 1.2);
      }
      return false;
    }

    this.isAlive = false;
    this.game.gameOver();
    return true;
  }

  draw(ctx) {
    if (!this.isAlive) return;

    if (this.invulnerableTime > 0 && Math.floor(this.animTime * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    } else {
      ctx.globalAlpha = 1.0;
    }

    const activeColor = this.getActiveColor();
    const isBlitzActive = (this.game.powers.isActive && this.game.powers.currentPower.id === 'yellow') || this.game.boostTimer > 0;
    const isFlightActive = this.game.powers.isActive && this.game.powers.currentPower.id === 'blue';

    // 1. Draw Ribbon / Trail
    if (this.trailPoints.length > 2) {
      ctx.save();
      for (let i = 0; i < this.trailPoints.length - 1; i++) {
        const p1 = this.trailPoints[i];
        const p2 = this.trailPoints[i + 1];
        const ratio = 1 - (i / this.trailPoints.length);
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = this.radius * 1.3 * ratio;
        ctx.globalAlpha = ratio * 0.35;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, this.scaleY);

    // 2. Plasma Wings
    if (isFlightActive) {
      ctx.save();
      const wingW = 28 + Math.sin(this.animTime * 15) * 6;
      ctx.fillStyle = 'rgba(0, 210, 255, 0.4)';
      ctx.shadowColor = '#00d2ff';
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.quadraticCurveTo(-wingW, -20, -15, 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(10, -5);
      ctx.quadraticCurveTo(wingW, -20, 15, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 3. Blitz Lightning Ring
    if (isBlitzActive) {
      ctx.save();
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.5 + Math.sin(this.animTime * 25) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Outer Soft Plasma Aura
    const auraGrad = ctx.createRadialGradient(0, 0, this.radius * 0.3, 0, 0, this.radius * 1.45);
    auraGrad.addColorStop(0, '#ffffff');
    auraGrad.addColorStop(0.4, activeColor);
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = auraGrad;
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    // 5. Lumie's Core Body
    const coreGrad = ctx.createRadialGradient(-4, -6, 2, 0, 0, this.radius);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.5, activeColor);
    coreGrad.addColorStop(1, '#110d29');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // 6. Expressive Eyes
    if (!this.isBlinking) {
      const eyeOffsetX = 7 + this.eyeTargetX;
      const eyeOffsetY = -4 + this.eyeTargetY;
      const eyeSpacing = 9;

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing + eyeOffsetX * 0.4, eyeOffsetY, 5.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eyeSpacing + eyeOffsetX * 0.4, eyeOffsetY, 5.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0a081d';
      const pupilShiftX = this.eyeTargetX * 0.4;
      const pupilShiftY = this.eyeTargetY * 0.3;

      ctx.beginPath();
      ctx.arc(-eyeSpacing + eyeOffsetX * 0.4 + pupilShiftX, eyeOffsetY + pupilShiftY, 3.2, 0, Math.PI * 2);
      ctx.arc(eyeSpacing + eyeOffsetX * 0.4 + pupilShiftX, eyeOffsetY + pupilShiftY, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-eyeSpacing + eyeOffsetX * 0.4 + pupilShiftX - 1.5, eyeOffsetY + pupilShiftY - 2, 1.4, 0, Math.PI * 2);
      ctx.arc(eyeSpacing + eyeOffsetX * 0.4 + pupilShiftX - 1.5, eyeOffsetY + pupilShiftY - 2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const eyeOffsetY = -2 + this.eyeTargetY;
      
      ctx.beginPath();
      ctx.arc(-9, eyeOffsetY, 5, 0.2, Math.PI - 0.2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(9, eyeOffsetY, 5, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // 7. Orbiting Satellites
    this.orbitMotes.forEach(m => {
      const mx = Math.cos(m.angle) * m.distance;
      const my = Math.sin(m.angle) * (m.distance * 0.45);

      ctx.save();
      ctx.fillStyle = activeColor;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(mx, my, m.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 8. Shield Sheen Bubble
    if (this.hasShield) {
      ctx.save();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(this.shieldAngle);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.6, 0, Math.PI * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.6, Math.PI, Math.PI * 1.4);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;
  }
}

window.Player = Player;
