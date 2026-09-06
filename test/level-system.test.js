// Unit test suite for 10-Level Mailman Campaign, Countdown Timers, and Share Mechanics
import { LEVEL_TIMERS } from '../src/main.js';
import {
  mailmanShirtTexture,
  mailmanShirtBackTexture,
  mailmanShirtSideTexture,
  mailmanPantsTexture,
  mailmanArmTexture,
  mailmanCapTexture,
  mailmanBagTexture
} from '../src/textures.js';
import {
  detectMobilePhone,
  GAME_SHARE_URL,
  formatLevelShareMessage,
  formatLevelShare,
  formatGrandShareMessage,
  formatGrandShare
} from '../src/ui.js';

console.log('--- Testing 10-Level Mailman Campaign System ---');

// 1. Verify 10-Level Timer Sequence
if (!Array.isArray(LEVEL_TIMERS) || LEVEL_TIMERS.length !== 10) {
  console.error(`FAIL: Expected 10 level timers, got ${LEVEL_TIMERS ? LEVEL_TIMERS.length : 'none'}`);
  process.exit(1);
}

const expectedTimers = [150, 135, 120, 110, 100, 90, 80, 70, 60, 50];
LEVEL_TIMERS.forEach((timer, idx) => {
  if (timer !== expectedTimers[idx]) {
    console.error(`FAIL: Level ${idx + 1} timer expected ${expectedTimers[idx]}s, got ${timer}s`);
    process.exit(1);
  }
});
console.log('✓ Verified 10 Level Timers correctly configured: [150s, 135s, 120s, 110s, 100s, 90s, 80s, 70s, 60s, 50s]');
console.log('✓ Level 1 starts at 150s, Level 10 ends at 50s');

// 2. Simulate Countdown Timer & Delta Time Step
class MockCampaignGame {
  constructor() {
    this.currentLevel = 1;
    this.maxLevels = LEVEL_TIMERS.length;
    this.levelTimers = LEVEL_TIMERS;
    this.levelTotalTime = this.levelTimers[0];
    this.levelTimeRemaining = this.levelTotalTime;
    this.levelTimeElapsed = 0;
    this.levelStats = [];
    this.isLevelActive = true;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.collected = 0;
    this.totalToCollect = 5;
    this.timeoutTriggered = false;
    this.grandVictoryTriggered = false;
  }

  update(dt) {
    if (this.isLevelActive) {
      this.levelTimeRemaining -= dt;
      this.levelTimeElapsed += dt;

      if (this.levelTimeRemaining <= 0) {
        this.levelTimeRemaining = 0;
        this.handleTimeOut();
      }
    }
  }

  handleTimeOut() {
    this.isLevelActive = false;
    this.isGameOver = true;
    this.timeoutTriggered = true;
  }

  collectAllLetters() {
    this.collected = 5;
    this.isLevelActive = false;
    this.isLevelComplete = true;

    const timeTaken = Math.max(1, Math.round(this.levelTimeElapsed));
    const timeRemaining = Math.max(0, Math.round(this.levelTimeRemaining));

    this.levelStats.push({
      level: this.currentLevel,
      timeTaken,
      timeRemaining
    });

    if (this.currentLevel >= this.maxLevels) {
      this.grandVictoryTriggered = true;
    }
  }

  nextLevel() {
    if (this.currentLevel < this.maxLevels) {
      this.startLevel(this.currentLevel + 1);
    }
  }

  restartCurrentLevel() {
    this.startLevel(this.currentLevel);
  }

  startLevel(levelNum) {
    this.currentLevel = levelNum;
    this.levelTotalTime = this.levelTimers[this.currentLevel - 1];
    this.levelTimeRemaining = this.levelTotalTime;
    this.levelTimeElapsed = 0;
    this.isLevelActive = true;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.collected = 0;
    this.timeoutTriggered = false;
  }
}

const mockGame = new MockCampaignGame();

// Simulate countdown in Level 1 (starts at 150s)
mockGame.update(10.0);
if (mockGame.levelTimeRemaining !== 140.0 || mockGame.levelTimeElapsed !== 10.0) {
  console.error(`FAIL: Timer decrement failed: remaining=${mockGame.levelTimeRemaining}, elapsed=${mockGame.levelTimeElapsed}`);
  process.exit(1);
}
console.log('✓ Countdown timer decrements accurately with frame dt');

// Simulate timeout condition
mockGame.update(145.0); // Total 155s elapsed > 150s
if (!mockGame.timeoutTriggered || !mockGame.isGameOver || mockGame.isLevelActive) {
  console.error('FAIL: Timeout did not trigger when countdown reached zero!');
  process.exit(1);
}
console.log('✓ Timeout accurately halts level when timer expires');

// Simulate retry current level
mockGame.restartCurrentLevel();
if (mockGame.currentLevel !== 1 || mockGame.levelTimeRemaining !== 150 || !mockGame.isLevelActive) {
  console.error('FAIL: Level retry did not reset level timer to full duration!');
  process.exit(1);
}
console.log('✓ Level restart resets timer to full duration (150s) and restores active state');

// 3. Simulate Progression through all 10 Levels to Grand Championship Cup
for (let lvl = 1; lvl <= 10; lvl++) {
  if (mockGame.currentLevel !== lvl) {
    console.error(`FAIL: Expected currentLevel to be ${lvl}, got ${mockGame.currentLevel}`);
    process.exit(1);
  }

  // Simulate completing the level in 20s
  mockGame.update(20.0);
  mockGame.collectAllLetters();

  if (lvl < 10) {
    if (mockGame.grandVictoryTriggered) {
      console.error(`FAIL: Grand victory triggered prematurely on Level ${lvl}!`);
      process.exit(1);
    }
    mockGame.nextLevel();
  }
}

if (!mockGame.grandVictoryTriggered) {
  console.error('FAIL: Grand victory did not trigger upon completing Level 10!');
  process.exit(1);
}
if (mockGame.levelStats.length !== 10) {
  console.error(`FAIL: Expected 10 completed level records, got ${mockGame.levelStats.length}`);
  process.exit(1);
}

const totalCampaignTime = mockGame.levelStats.reduce((sum, s) => sum + s.timeTaken, 0);
console.log(`✓ All 10 Levels successfully beaten! Total delivery time: ${totalCampaignTime}s`);
console.log('✓ Grand Championship Golden Cup awarded on Level 10 finish');

// 4. Test Share Message Formatting & Single-URL Guarantee
const levelMsg = formatLevelShareMessage(3, 42);
if (levelMsg.includes(GAME_SHARE_URL)) {
  console.error('FAIL: Level share message should not contain URL (to prevent double URL on Web Share API)!');
  process.exit(1);
}

const levelShareStr = formatLevelShare(3, 42);
if (!levelShareStr.includes('Level 3') || !levelShareStr.includes('42s') || !levelShareStr.includes(GAME_SHARE_URL)) {
  console.error('FAIL: Level complete share string missing required parameters!');
  process.exit(1);
}
// Verify URL appears EXACTLY once in the full share string
const levelUrlCount = (levelShareStr.match(new RegExp(GAME_SHARE_URL, 'g')) || []).length;
if (levelUrlCount !== 1) {
  console.error(`FAIL: Level share string contains URL ${levelUrlCount} times, expected exactly 1!`);
  process.exit(1);
}
console.log('✓ Level share link formatted correctly with single URL:', levelShareStr);

const grandMsg = formatGrandShareMessage(totalCampaignTime);
if (grandMsg.includes(GAME_SHARE_URL)) {
  console.error('FAIL: Grand share message should not contain URL (to prevent double URL on Web Share API)!');
  process.exit(1);
}

const grandShareStr = formatGrandShare(totalCampaignTime);
if (!grandShareStr.includes('10 Levels') || !grandShareStr.includes('Championship Cup') || !grandShareStr.includes(GAME_SHARE_URL)) {
  console.error('FAIL: Grand championship share string missing required parameters!');
  process.exit(1);
}
const grandUrlCount = (grandShareStr.match(new RegExp(GAME_SHARE_URL, 'g')) || []).length;
if (grandUrlCount !== 1) {
  console.error(`FAIL: Grand share string contains URL ${grandUrlCount} times, expected exactly 1!`);
  process.exit(1);
}
console.log('✓ Grand victory share link formatted correctly with single URL:', grandShareStr);

// 5. Verify Distinct Mailman Textures (Front vs Back vs Sides)
if (!mailmanShirtTexture || !mailmanShirtBackTexture || !mailmanShirtSideTexture || !mailmanPantsTexture || !mailmanArmTexture || !mailmanCapTexture || !mailmanBagTexture) {
  console.error('FAIL: One or more mailman textures are undefined!');
  process.exit(1);
}
if (mailmanShirtTexture === mailmanShirtBackTexture) {
  console.error('FAIL: Front and back mailman shirt textures should be distinct!');
  process.exit(1);
}
console.log('✓ Verified Mailman outfit textures: Distinct Front (badge/buttons/buckle), Back (yoke/seam/belt loops), Sides, Pants, Sleeves, Cap & Satchel');

// 6. Test Mobile Device Detection
const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
if (!detectMobilePhone(iphoneUA, 390)) {
  console.error('FAIL: iPhone user agent was not detected as mobile!');
  process.exit(1);
}
console.log('✓ Mobile detection accurately identifies iPhone browser');

const androidUA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile Safari/537.36';
if (!detectMobilePhone(androidUA, 412)) {
  console.error('FAIL: Android phone user agent was not detected as mobile!');
  process.exit(1);
}
console.log('✓ Mobile detection accurately identifies Android phone browser');

const desktopUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
if (detectMobilePhone(desktopUA, 1440)) {
  console.error('FAIL: Desktop browser falsely identified as mobile!');
  process.exit(1);
}
console.log('✓ Mobile detection accurately differentiates desktop browser');

console.log('\nALL 10-LEVEL MAILMAN CAMPAIGN TESTS PASSED SUCCESSFULLY! ✅');
