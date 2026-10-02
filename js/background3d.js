/**
 * COLORSHIFT - Three.js 3D Dynamic Cyber Dimension Background
 * High-performance WebGL backdrop with undulating neon wireframe mountains,
 * celestial retro synth sun with horizontal stripes, floating cyber monoliths,
 * rotating stargate portals, and silky smooth lerped lighting.
 */

class Background3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Quality setting: 'high', 'medium', 'low'
    this.quality = 'high';

    // Scene elements
    this.terrainMesh = null;
    this.terrainGeo = null;
    this.terrainVertices = null;
    this.sunMesh = null;
    this.sunHalo = null;
    this.monoliths = [];
    this.stargates = [];
    this.starfield = null;
    this.starPositions = null;
    this.starCount = 1000;

    // Lighting
    this.ambientLight = null;
    this.heroLight = null;
    this.sunLight = null;

    // Color interpolation targets
    this.currentColor = new THREE.Color(0x0a0c1b);
    this.targetHeroColor = new THREE.Color(0x00f0ff);
    this.targetSunColor = new THREE.Color(0xff0077);
    this.targetFogColor = new THREE.Color(0x070918);
    this.targetWireColor = new THREE.Color(0x00f0ff);

    // Current interpolated colors
    this.currentHeroColor = new THREE.Color(0x00f0ff);
    this.currentSunColor = new THREE.Color(0xff0077);
    this.currentWireColor = new THREE.Color(0x00f0ff);

    this.speed = 1.0;
    this.time = 0;
    this.camTargetY = 16;
    this.camTargetX = 0;

    this.init();
  }

  init() {
    if (!window.THREE) {
      console.warn('THREE.js is not loaded; 3D background will be bypassed.');
      return;
    }

    // 1. Scene & Smooth Volumetric Fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070918, 0.0075);

    // 2. Camera
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1200);
    this.camera.position.set(0, 16, 75);
    this.camera.lookAt(0, 6, -100);

    // 3. Renderer with smooth anti-aliasing
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 4. Lights
    this.ambientLight = new THREE.AmbientLight(0x181a38, 1.4);
    this.scene.add(this.ambientLight);

    this.heroLight = new THREE.PointLight(0x00f0ff, 3.5, 140);
    this.heroLight.position.set(0, 25, 25);
    this.scene.add(this.heroLight);

    this.sunLight = new THREE.DirectionalLight(0xff0077, 2.0);
    this.sunLight.position.set(0, 45, -150);
    this.scene.add(this.sunLight);

    // 5. Construct Scene Layers
    this.createRetroSun();
    this.createUndulatingTerrain();
    this.createFloatingMonoliths();
    this.createStargates();
    this.createStarfield();

    window.addEventListener('resize', () => this.onResize());
  }

  createRetroSun() {
    // Horizon Retro Synth Sun
    const sunGroup = new THREE.Group();
    sunGroup.position.set(0, 24, -220);

    // Core Glowing Disc
    const sunGeo = new THREE.CircleGeometry(42, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff0077,
      transparent: true,
      opacity: 0.95
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunGroup.add(this.sunMesh);

    // Outer Aura Ring
    const haloGeo = new THREE.RingGeometry(42, 54, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffa600,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    this.sunHalo = new THREE.Mesh(haloGeo, haloMat);
    sunGroup.add(this.sunHalo);

    // Segmented horizontal cyber bars across sun
    for (let i = 0; i < 7; i++) {
      const barH = 1.6 + i * 0.7;
      const barW = 86;
      const barGeo = new THREE.PlaneGeometry(barW, barH);
      const barMat = new THREE.MeshBasicMaterial({
        color: 0x070918,
        transparent: true,
        opacity: 0.95
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(0, -18 + i * 4.2, 0.5);
      sunGroup.add(bar);
    }

    this.scene.add(sunGroup);
  }

  createUndulatingTerrain() {
    // 3D Neon Mountain Grid Plane
    const width = 360;
    const depth = 380;
    const segX = 48;
    const segY = 56;

    this.terrainGeo = new THREE.PlaneGeometry(width, depth, segX, segY);
    this.terrainGeo.rotateX(-Math.PI / 2);
    this.terrainGeo.translate(0, -10, -80);

    // Wireframe Neon Mountain Material
    this.terrainMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      wireframe: true,
      roughness: 0.2,
      metalness: 0.7,
      emissive: 0x003355,
      emissiveIntensity: 0.6
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeo, this.terrainMat);
    this.scene.add(this.terrainMesh);

    // Keep initial vertex positions for smooth wave perturbation
    const pos = this.terrainGeo.attributes.position;
    this.terrainVertices = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      this.terrainVertices[i * 3] = pos.getX(i);
      this.terrainVertices[i * 3 + 1] = pos.getY(i);
      this.terrainVertices[i * 3 + 2] = pos.getZ(i);
    }
  }

  createFloatingMonoliths() {
    // Floating cyber-monoliths and adventure obelisks on the sides
    const count = 14;
    for (let i = 0; i < count; i++) {
      const h = 25 + Math.random() * 45;
      const w = 5 + Math.random() * 4;
      const geo = new THREE.BoxGeometry(w, h, w);
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x00f0ff : 0xff0077,
        roughness: 0.15,
        metalness: 0.85,
        wireframe: Math.random() > 0.4,
        emissive: i % 2 === 0 ? 0x002244 : 0x440022
      });

      const mesh = new THREE.Mesh(geo, mat);
      const side = (i % 2 === 0 ? 1 : -1);
      mesh.position.x = side * (55 + Math.random() * 85);
      mesh.position.y = -2 + h * 0.35 + Math.random() * 12;
      mesh.position.z = -180 + Math.random() * 220;

      mesh.userData = {
        baseY: mesh.position.y,
        floatFreq: 0.8 + Math.random() * 1.2,
        rotSpeedY: (Math.random() - 0.5) * 0.015
      };

      this.monoliths.push(mesh);
      this.scene.add(mesh);
    }
  }

  createStargates() {
    // Rotating adventure portal rings in distance
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(18 + i * 6, 1.2, 8, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00f0ff : (i === 1 ? 0xff00aa : 0xffe600),
        wireframe: true
      });
      const gate = new THREE.Mesh(ringGeo, ringMat);
      gate.position.set(0, 25 + i * 4, -160 - i * 60);
      gate.userData = { rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.012 + i * 0.006) };
      this.stargates.push(gate);
      this.scene.add(gate);
    }
  }

  createStarfield() {
    this.starGeo = new THREE.BufferGeometry();
    this.starPositions = new Float32Array(this.starCount * 3);
    const starColors = new Float32Array(this.starCount * 3);

    for (let i = 0; i < this.starCount; i++) {
      this.starPositions[i * 3] = (Math.random() - 0.5) * 260;
      this.starPositions[i * 3 + 1] = Math.random() * 120 - 10;
      this.starPositions[i * 3 + 2] = -200 + Math.random() * 260;

      const p = Math.random();
      if (p < 0.4) {
        starColors[i * 3] = 0.0; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0;
      } else if (p < 0.75) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.1; starColors[i * 3 + 2] = 0.7;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 0.2;
      }
    }

    this.starGeo.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    this.starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.starfield = new THREE.Points(this.starGeo, starMat);
    this.scene.add(this.starfield);
  }

  setColorTheme(themeName) {
    const themes = {
      default: { hero: 0x00f0ff, sun: 0xff0077, wire: 0x00f0ff, fog: 0x070918 },
      red:     { hero: 0xff2a5f, sun: 0xff5500, wire: 0xff2a5f, fog: 0x18050c },
      blue:    { hero: 0x00d2ff, sun: 0x0055ff, wire: 0x00d2ff, fog: 0x040b1e },
      green:   { hero: 0x00ff88, sun: 0x00cc66, wire: 0x00ff88, fog: 0x03170d },
      yellow:  { hero: 0xffe600, sun: 0xff8800, wire: 0xffe600, fog: 0x181402 },
      purple:  { hero: 0xc800ff, sun: 0x7700ff, wire: 0xc800ff, fog: 0x14041b },
      gold:    { hero: 0xffbe0b, sun: 0xfb5607, wire: 0xffbe0b, fog: 0x180f03 }
    };

    const cfg = themes[themeName.toLowerCase()] || themes.default;
    this.targetHeroColor.setHex(cfg.hero);
    this.targetSunColor.setHex(cfg.sun);
    this.targetWireColor.setHex(cfg.wire);
    this.targetFogColor.setHex(cfg.fog);
  }

  setSpeed(val) {
    this.speed = val;
  }

  setQuality(q) {
    this.quality = q;
    if (this.renderer) {
      if (q === 'low') {
        this.renderer.setPixelRatio(1);
        if (this.terrainMesh) this.terrainMesh.visible = false;
      } else {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'medium' ? 1.5 : 2));
        if (this.terrainMesh) this.terrainMesh.visible = true;
      }
    }
  }

  onResize() {
    if (!this.camera || !this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update(delta, playerOffset = { x: 0, y: 0 }) {
    if (!this.renderer || !this.scene) return;

    this.time += delta * this.speed;

    // Smooth lighting & fog color interpolation
    const lerpSpeed = 0.06;
    this.currentHeroColor.lerp(this.targetHeroColor, lerpSpeed);
    this.currentSunColor.lerp(this.targetSunColor, lerpSpeed);
    this.currentWireColor.lerp(this.targetWireColor, lerpSpeed);

    if (this.heroLight) this.heroLight.color.copy(this.currentHeroColor);
    if (this.sunLight) this.sunLight.color.copy(this.currentSunColor);
    if (this.scene.fog) this.scene.fog.color.lerp(this.targetFogColor, lerpSpeed);

    if (this.sunMesh) {
      this.sunMesh.material.color.copy(this.currentSunColor);
      // Subtle rhythmic sun breathing
      const sunPulse = 1.0 + Math.sin(this.time * 2.0) * 0.035;
      this.sunMesh.scale.set(sunPulse, sunPulse, 1.0);
    }
    if (this.sunHalo) {
      this.sunHalo.rotation.z += 0.005;
    }

    if (this.terrainMat) {
      this.terrainMat.color.copy(this.currentWireColor);
    }

    // Undulate low-poly neon mountains smoothly
    if (this.terrainGeo && this.terrainVertices && this.quality !== 'low') {
      const pos = this.terrainGeo.attributes.position;
      const count = pos.count;
      const timeOffset = this.time * 1.5;

      for (let i = 0; i < count; i++) {
        const ox = this.terrainVertices[i * 3];
        const oz = this.terrainVertices[i * 3 + 2];
        const distFromCenter = Math.abs(ox);

        // Mountain ridge height increases towards left/right edges for a majestic cyber valley
        const ridgeFactor = Math.pow(distFromCenter / 120, 1.8);
        const wave1 = Math.sin(ox * 0.04 + timeOffset) * 6;
        const wave2 = Math.cos((oz + timeOffset * 25) * 0.03) * 8;
        const totalHeight = (wave1 + wave2) * ridgeFactor;

        pos.setY(i, totalHeight);
      }
      pos.needsUpdate = true;
    }

    // Scroll stars smoothly
    if (this.starfield && this.starPositions) {
      const positions = this.starfield.geometry.attributes.position.array;
      const starSpeed = this.speed * delta * 45;
      for (let i = 0; i < this.starCount; i++) {
        positions[i * 3 + 2] += starSpeed;
        if (positions[i * 3 + 2] > 75) {
          positions[i * 3 + 2] = -190;
          positions[i * 3] = (Math.random() - 0.5) * 260;
          positions[i * 3 + 1] = Math.random() * 120 - 10;
        }
      }
      this.starfield.geometry.attributes.position.needsUpdate = true;
    }

    // Animate stargate portals
    this.stargates.forEach(gate => {
      gate.rotation.z += gate.userData.rotSpeed;
    });

    // Floating monoliths
    const scrollDelta = this.speed * delta * 20;
    this.monoliths.forEach(m => {
      m.rotation.y += m.userData.rotSpeedY;
      m.position.y = m.userData.baseY + Math.sin(this.time * m.userData.floatFreq) * 2.5;
      m.position.z += scrollDelta * 0.35;
      if (m.position.z > 70) {
        m.position.z = -180 - Math.random() * 40;
      }
    });

    // Smooth, silky camera dampening
    if (this.camera) {
      this.camTargetY = 16 + (playerOffset.y * 0.02);
      this.camTargetX = playerOffset.x * 0.015;
      this.camera.position.y += (this.camTargetY - this.camera.position.y) * 0.05;
      this.camera.position.x += (this.camTargetX - this.camera.position.x) * 0.05;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.Background3D = Background3D;
