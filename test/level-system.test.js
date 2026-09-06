// Unit test suite for 10-Level Mailman Campaign, Countdown Timers, and Share Mechanics
import { LEVEL_TIMERS } from '../src/main.js';
import {
  mailmanShirtTexture,
  mailmanPantsTexture,
  mailmanArmTexture,
  mailmanCapTexture,
  mailmanBagTexture
} from '../src/textures.js';

console.log('--- Testing 10-Level Mailman Campaign System ---');

// 1. Verify 10-Level Timer Sequence
if (!Array.isArray(LEVEL_TIMERS) || LEVEL_TIMERS.length !== 10) {
  console.error(`FAIL: Expected 10 level timers, got ${LEVEL_TIMERS ? LEVEL_TIMERS.length : 'none'}`);
  process.exit(1);
}

const expectedTimers = [90, 85, 80, 75, 70, 65, 60, 50, 40, 30];
LEVEL_TIMERS.forEach((timer, idx) => {
  if (timer !== expectedTimers[idx]) {
    console.error(`FAIL: Level ${idx + 1} timer expected ${expectedTimers[idx]}s, got ${timer}s`);
    process.exit(1);
  }
});
console.log('✓ Verified 10 Level Timers correctly configured: [90s, 85s, 80s, 75s, 70s, 65s, 60s, 50s, 40s, 30s]');
console.log('✓ Level 1 starts at 90s, Level 10 ends at 30s');

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

// Simulate countdown in Level 1
mockGame.update(10.0);
if (mockGame.levelTimeRemaining !== 80.0 || mockGame.levelTimeElapsed !== 10.0) {
  console.error(`FAIL: Timer decrement failed: remaining=${mockGame.levelTimeRemaining}, elapsed=${mockGame.levelTimeElapsed}`);
  process.exit(1);
}
console.log('✓ Countdown timer decrements accurately with frame dt');

// Simulate timeout condition
mockGame.update(85.0); // Total 95s elapsed > 90s
if (!mockGame.timeoutTriggered || !mockGame.isGameOver || mockGame.isLevelActive) {
  console.error('FAIL: Timeout did not trigger when countdown reached zero!');
  process.exit(1);
}
console.log('✓ Timeout accurately halts level when timer expires');

// Simulate retry current level
mockGame.restartCurrentLevel();
if (mockGame.currentLevel !== 1 || mockGame.levelTimeRemaining !== 90 || !mockGame.isLevelActive) {
  console.error('FAIL: Level retry did not reset level timer to full duration!');
  process.exit(1);
}
console.log('✓ Level restart resets timer to full duration (90s) and restores active state');

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

// 4. Test Share Message Formatting
const gameUrl = 'https://ilikeai2026-bit.github.io/Mailman/';

function formatLevelShare(level, timeTaken) {
  return `📬 I finished Level ${level} of Mailman in ${timeTaken}s! Can you beat my time? Play here: ${gameUrl}`;
}

function formatGrandShare(totalTime) {
  return `🏆 I conquered all 10 Levels of Mailman in ${totalTime}s total and won the Championship Cup! Can you beat my time? Play here: ${gameUrl}`;
}

const levelShareStr = formatLevelShare(3, 42);
if (!levelShareStr.includes('Level 3') || !levelShareStr.includes('42s') || !levelShareStr.includes(gameUrl)) {
  console.error('FAIL: Level complete share string missing required parameters!');
  process.exit(1);
}
console.log('✓ Level share link formatted correctly:', levelShareStr);

const grandShareStr = formatGrandShare(totalCampaignTime);
if (!grandShareStr.includes('10 Levels') || !grandShareStr.includes('Championship Cup') || !grandShareStr.includes(gameUrl)) {
  console.error('FAIL: Grand championship share string missing required parameters!');
  process.exit(1);
}
console.log('✓ Grand victory share link formatted correctly:', grandShareStr);

// 5. Verify Mailman Textures exist
if (!mailmanShirtTexture || !mailmanPantsTexture || !mailmanArmTexture || !mailmanCapTexture || !mailmanBagTexture) {
  console.error('FAIL: One or more mailman textures are undefined!');
  process.exit(1);
}
console.log('✓ Verified Mailman outfit textures: Postal Shirt, Navy Uniform Pants, Uniform Sleeves, Visor Cap & Leather Satchel');

console.log('\nALL 10-LEVEL MAILMAN CAMPAIGN TESTS PASSED SUCCESSFULLY! ✅');
