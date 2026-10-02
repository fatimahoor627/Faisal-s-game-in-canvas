# 🎮 COLORSHIFT — 2D Neon Cyber-Arcade Adventure

A high-performance, colorful 2D arcade hyper-runner built with **HTML5 Canvas**, **JavaScript**, and **Three.js**, without any external game engines.

![COLORSHIFT Arcade](https://img.shields.io/badge/COLORSHIFT-Arcade%20Runner-00f0ff?style=for-the-badge)
![ThreeJS](https://img.shields.io/badge/Three.js-WebGL%203D-ff0077?style=for-the-badge)
![Web Audio](https://img.shields.io/badge/Web%20Audio%20API-Synthesizer-ffe600?style=for-the-badge)

---

## 🌟 Features

- **Dual-Canvas Architecture**:
  - **Foreground (2D HTML5 Canvas)**: 60 FPS physics-driven runner featuring Lumie the Energy Creature, procedural obstacles, coins, and particle explosions.
  - **Background (Three.js WebGL 3D)**: Undulating neon synthwave mountains, horizontal retro sun, rotating stargates, and floating monoliths.
- **5-Color Power System**:
  - 🔴 **Red (Chrono Slow)**: Slows obstacles and world speed to 30% for bullet-time dodging.
  - 🔵 **Blue (Gravity Flight)**: Activates plasma thruster wings for anti-gravity flight.
  - 🟢 **Green (Hard-Light Bridge)**: Spawns solid temporary platforms across chasms.
  - 🟡 **Yellow (Hyperdash Blitz)**: Supersonic invulnerability dash + coin magnet + obstacle crush.
  - 🟣 **Purple (Time Rewind)**: Reverses the last 3.5s of gameplay with a VHS glitch effect.
- **Interactive Adventure Mechanics**:
  - 🚀 **Jump Launch-Pads**: Super-bounces Lumie high into secret aerial coin lanes.
  - 🌀 **Speed Boost Rings**: Fly through glowing rings for supersonic acceleration and combo multipliers.
  - 💎 **Mystery Relic Capsules**: Grants random rare boosts (Mega Shield, Coin Magnet, 3x Frenzy).
  - 🏰 **Floating Sky Platforms**: Multi-tier platforming paths.
- **Adventure Quests & Level Progression**:
  - Real-time quests per run (Coin Hunter, High Flyer, Ring Master, Expedition).
  - XP progression with Adventure Ranks (Neon Scout → Cyber Wanderer → Quantum Knight).
- **Customization & Settings**:
  - Character Skins: Classic Cyan, Solar Amber, Cyber Magenta, Jade Spirit, Shadow Violet, Sovereign Gold.
  - Motion Trails: Plasma Ribbon, Stardust Sparks.
  - Game Modes: Standard Adventure, Zen (No Death), Overdrive (1.5x Speed).
  - Audio Sliders for Music & SFX + Graphics Quality toggle.
- **100% Procedural Web Audio API Synthesizer**:
  - Zero external sound files needed. Retro synthwave arpeggiator and responsive sound effects.

---

## 🕹️ Controls

| Action | Desktop / Keyboard | Mobile / Touch |
| :--- | :--- | :--- |
| **Move Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | On-screen ◀ / ▶ buttons |
| **Jump / Double Jump** | <kbd>Space</kbd> or <kbd>W</kbd> / <kbd>↑</kbd> | On-screen **JUMP** button |
| **Air Dash** | <kbd>Q</kbd> or <kbd>F</kbd> | On-screen **DASH** button |
| **Activate Color Ability** | <kbd>E</kbd>, <kbd>Shift</kbd>, or <kbd>C</kbd> | Dedicated **⚡ ABILITY** button |
| **Switch Power** | Keys <kbd>1</kbd> – <kbd>5</kbd> | Tap top power pills |
| **Pause / Resume** | <kbd>P</kbd> or <kbd>Esc</kbd> | Top pause button ⏸️ |
| **Restart Game** | <kbd>R</kbd> | Quick restart button 🔄 |

---

## 🚀 Running Locally

You can run the game directly with any static file server or Node.js:

```bash
# Run with built-in Node server
node server.js

# Or open index.html directly in any modern web browser
```

Open `http://localhost:3000` in your web browser.
