/**
 * COLORSHIFT - Particle System & Visual Effects Engine
 * High-performance 2D canvas particle emitter with additive blending,
 * shockwave rings, floating floating-text badges, and dynamic trails.
 */

class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'circle', alpha = 1.0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.shape = shape; // 'circle', 'square', 'star', 'spark'
    this.alpha = alpha;
    this.gravity = 0;
    this.drag = 0.98;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 8;
  }

  update(delta) {
    this.x += this.vx * delta * 60;
    this.y += this.vy * delta * 60;
    this.vy += this.gravity * delta * 60;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.rot += this.rotSpeed * delta;
    this.life -= delta;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const progress = this.life / this.maxLife;
    const currentAlpha = this.alpha * progress;
    const currentSize = Math.max(0.1, this.size * progress);

    ctx.save();
    ctx.globalAlpha = currentAlpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'spark') {
      ctx.beginPath();
      ctx.moveTo(-currentSize * 2, 0);
      ctx.lineTo(currentSize * 2, 0);
      ctx.moveTo(0, -currentSize * 0.5);
      ctx.lineTo(0, currentSize * 0.5);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.shape === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        const r1 = currentSize;
        const r2 = currentSize * 0.45;
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a + Math.PI / 5) * r2, Math.sin(a + Math.PI / 5) * r2);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
    }

    ctx.restore();
  }
}

class Shockwave {
  constructor(x, y, color, maxRadius = 80, duration = 0.4) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.life = duration;
  }

  update(delta) {
    this.life -= delta;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const progress = 1 - (this.life / this.duration);
    const r = this.maxRadius * progress;
    const alpha = (1 - progress) * 0.8;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, 4 * (1 - progress));
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class FloatingText {
  constructor(text, x, y, color, size = 20, duration = 0.9) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.maxLife = duration;
    this.life = duration;
    this.vy = -35;
  }

  update(delta) {
    this.y += this.vy * delta;
    this.vy *= 0.96;
    this.life -= delta;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const progress = this.life / this.maxLife;
    const alpha = Math.min(1, progress * 1.5);
    const scale = 1 + (1 - progress) * 0.25;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${Math.round(this.size * scale)}px "Outfit", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.maxParticles = 600;
  }

  emit(x, y, count, options = {}) {
    const {
      color = '#00f0ff',
      speed = 4,
      size = 4,
      life = 0.5,
      spread = Math.PI * 2,
      angle = 0,
      shape = 'circle',
      gravity = 0,
      alpha = 1.0,
      drag = 0.96
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.4 + Math.random() * 0.8);
      const vx = Math.cos(a) * s;
      const vy = Math.sin(a) * s;
      const pLife = life * (0.6 + Math.random() * 0.6);
      const pSize = size * (0.6 + Math.random() * 0.7);

      const p = new Particle(x, y, vx, vy, color, pSize, pLife, shape, alpha);
      p.gravity = gravity;
      p.drag = drag;
      this.particles.push(p);
    }
  }

  addShockwave(x, y, color = '#00f0ff', maxRadius = 75, duration = 0.45) {
    this.shockwaves.push(new Shockwave(x, y, color, maxRadius, duration));
  }

  addText(text, x, y, color = '#ffffff', size = 20, duration = 0.9) {
    this.floatingTexts.push(new FloatingText(text, x, y, color, size, duration));
  }

  burst(x, y, color, count = 25, speed = 6) {
    this.emit(x, y, count, {
      color: color,
      speed: speed,
      size: 5,
      life: 0.6,
      shape: 'circle',
      drag: 0.94
    });
    this.emit(x, y, Math.floor(count / 2), {
      color: '#ffffff',
      speed: speed * 1.3,
      size: 3,
      life: 0.4,
      shape: 'spark',
      drag: 0.9
    });
    this.addShockwave(x, y, color, 65, 0.35);
  }

  confetti(x, y) {
    const colors = ['#ff0077', '#00f0ff', '#00ff88', '#ffdd00', '#b400ff', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      this.emit(x, y, 1, {
        color: c,
        speed: 7 + Math.random() * 8,
        size: 5 + Math.random() * 4,
        life: 1.2 + Math.random() * 0.8,
        shape: Math.random() > 0.5 ? 'star' : 'square',
        gravity: 0.18,
        drag: 0.97
      });
    }
  }

  update(delta) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(delta);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.update(delta);
      if (s.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.update(delta);
      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Draw shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      this.shockwaves[i].draw(ctx);
    }

    // Draw particles
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }

    ctx.restore();

    // Floating text on normal blend mode for crispness
    ctx.save();
    for (let i = 0; i < this.floatingTexts.length; i++) {
      this.floatingTexts[i].draw(ctx);
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
  }
}

window.ParticleSystem = ParticleSystem;
