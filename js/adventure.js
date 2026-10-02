/**
 * COLORSHIFT - Adventure Quests, Level Progression & Customization
 * Dynamic adventure missions, XP progression, ranks, and unlockable visual skins.
 */

const QUEST_TEMPLATES = [
  { id: 'coins_20', title: 'Coin Hunter', desc: 'Collect 20 Prism Coins', target: 20, type: 'coins', rewardXP: 150, rewardScore: 500 },
  { id: 'jumppad_2', title: 'High Flyer', desc: 'Hit 2 Jump Launch-Pads', target: 2, type: 'jumppad', rewardXP: 200, rewardScore: 600 },
  { id: 'speedring_2', title: 'Ring Master', desc: 'Fly through 2 Speed Rings', target: 2, type: 'speedring', rewardXP: 200, rewardScore: 600 },
  { id: 'distance_600', title: 'Expedition', desc: 'Reach 600m distance', target: 600, type: 'distance', rewardXP: 250, rewardScore: 750 },
  { id: 'powers_3', title: 'Color Mastery', desc: 'Activate 3 Color Powers', target: 3, type: 'powers', rewardXP: 200, rewardScore: 500 },
  { id: 'closecall_2', title: 'Adrenaline', desc: 'Trigger 2 Close Calls', target: 2, type: 'closecall', rewardXP: 250, rewardScore: 800 },
  { id: 'combo_5', title: 'Streak Surge', desc: 'Reach a 5x Combo streak', target: 5, type: 'combo', rewardXP: 300, rewardScore: 1000 }
];

const ADVENTURE_RANKS = [
  { level: 1, name: 'Neon Scout', minXP: 0 },
  { level: 2, name: 'Cyber Wanderer', minXP: 500 },
  { level: 3, name: 'Prismatic Voyager', minXP: 1200 },
  { level: 4, name: 'Quantum Knight', minXP: 2200 },
  { level: 5, name: 'Cosmic Chronomancer', minXP: 3600 }
];

class AdventureManager {
  constructor(game) {
    this.game = game;
    this.totalXP = parseInt(localStorage.getItem('colorshift_adventure_xp') || '0', 10);
    this.currentSkin = localStorage.getItem('colorshift_skin') || 'classic';
    this.currentTrail = localStorage.getItem('colorshift_trail') || 'plasma';

    this.activeQuests = [];
    this.completedCount = 0;
    
    this.runStats = {
      coins: 0,
      jumppad: 0,
      speedring: 0,
      distance: 0,
      powers: 0,
      closecall: 0,
      combo: 1
    };

    this.initQuests();
  }

  resetRun() {
    this.runStats = {
      coins: 0,
      jumppad: 0,
      speedring: 0,
      distance: 0,
      powers: 0,
      closecall: 0,
      combo: 1
    };

    // Reset progress on active quests
    this.activeQuests.forEach(q => {
      q.progress = 0;
      q.completed = false;
    });

    this.updateHUDQuestDisplay();
  }

  initQuests() {
    // Pick 3 random quests from templates
    const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
    this.activeQuests = shuffled.slice(0, 3).map(q => ({
      ...q,
      progress: 0,
      completed: false
    }));
  }

  getCurrentRank() {
    let current = ADVENTURE_RANKS[0];
    for (let i = 0; i < ADVENTURE_RANKS.length; i++) {
      if (this.totalXP >= ADVENTURE_RANKS[i].minXP) {
        current = ADVENTURE_RANKS[i];
      }
    }
    return current;
  }

  getNextRank() {
    const cur = this.getCurrentRank();
    const nextIdx = ADVENTURE_RANKS.findIndex(r => r.level === cur.level) + 1;
    return ADVENTURE_RANKS[nextIdx] || null;
  }

  addXP(amount) {
    this.totalXP += amount;
    localStorage.setItem('colorshift_adventure_xp', this.totalXP.toString());
  }

  checkQuest(type, value = 1, isCumulative = false) {
    if (this.game.state !== 'PLAYING') return;

    if (isCumulative) {
      this.runStats[type] = Math.max(this.runStats[type], value);
    } else {
      this.runStats[type] = (this.runStats[type] || 0) + value;
    }

    this.activeQuests.forEach(q => {
      if (q.type === type && !q.completed) {
        q.progress = isCumulative ? this.runStats[type] : (q.progress + value);
        if (q.progress >= q.target) {
          this.completeQuest(q);
        }
      }
    });

    this.updateHUDQuestDisplay();
  }

  completeQuest(quest) {
    quest.completed = true;
    this.completedCount++;
    this.addXP(quest.rewardXP);
    this.game.addScore(quest.rewardScore);

    if (window.soundSystem) window.soundSystem.playQuestComplete();

    // Visual fanfare
    if (this.game.particles) {
      const px = this.game.width / 2;
      const py = 150;
      this.game.particles.addText(`QUEST COMPLETE: ${quest.title}!`, px, py, '#ffe600', 26, 1.8);
      this.game.particles.confetti(px, py);
    }

    this.showToast(`🎯 Quest Complete: ${quest.title} (+${quest.rewardXP} XP)`);
  }

  onCoinCollected() { this.checkQuest('coins', 1); }
  onJumpPadHit() { this.checkQuest('jumppad', 1); }
  onSpeedRingHit() { this.checkQuest('speedring', 1); }
  onDistanceUpdated(dist) { this.checkQuest('distance', Math.round(dist), true); }
  onPowerUsed() { this.checkQuest('powers', 1); }
  onCloseCall() { this.checkQuest('closecall', 1); }
  onComboReached(combo) { this.checkQuest('combo', combo, true); }
  onZoneReached(zoneNum) {}

  updateHUDQuestDisplay() {
    const elContainer = document.getElementById('hud-active-quest');
    if (!elContainer) return;

    // Show first uncompleted quest
    const uncompleted = this.activeQuests.find(q => !q.completed);
    if (uncompleted) {
      elContainer.innerHTML = `
        <span class="quest-icon">🎯</span>
        <span class="quest-text">${uncompleted.title}: ${Math.min(uncompleted.target, uncompleted.progress)}/${uncompleted.target}</span>
      `;
      elContainer.classList.remove('hidden');
    } else {
      elContainer.innerHTML = `<span class="quest-icon">✨</span><span class="quest-text">All Quests Completed!</span>`;
    }
  }

  setSkin(skinId) {
    this.currentSkin = skinId;
    localStorage.setItem('colorshift_skin', skinId);
    if (this.game.player) {
      this.game.player.applySkin(skinId);
    }
  }

  setTrail(trailId) {
    this.currentTrail = trailId;
    localStorage.setItem('colorshift_trail', trailId);
  }

  showToast(message) {
    const toast = document.getElementById('toast-message');
    if (!toast) return;
    toast.innerText = message;
    toast.className = 'toast-visible';
    setTimeout(() => { toast.className = 'toast-hidden'; }, 2600);
  }
}

window.AdventureManager = AdventureManager;
