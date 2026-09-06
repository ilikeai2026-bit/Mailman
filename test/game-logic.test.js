// Node.js test script to verify guaranteed path reachability and envelope placement
import { ParkMap, TILE } from '../src/map.js';
import * as THREE from 'three';

console.log('--- Testing ParkMap & Guaranteed Accessibility Pathfinding ---');

// Mock scene for headless environment
const mockScene = {
  add: () => {}
};

// Instantiate map with expanded 56x56 grid
const map = new ParkMap(mockScene, 56);

console.log(`Map initialized: size ${map.size}x${map.size}`);
console.log(`Player spawn tile: (${map.spawnTile.x}, ${map.spawnTile.z})`);

// 1. Verify spawn tile is walkable
const spawnType = map.grid[map.spawnTile.z][map.spawnTile.x];
if (!map.isWalkableTile(spawnType)) {
  console.error(`FAIL: Spawn tile type ${spawnType} is not walkable!`);
  process.exit(1);
}
console.log(`✓ Spawn tile is walkable (type: ${spawnType})`);

// 2. Verify reachable tiles count
console.log(`Reachable walkable tiles found via BFS: ${map.reachableTiles.length}`);
if (map.reachableTiles.length < 50) {
  console.error(`FAIL: Too few reachable tiles (${map.reachableTiles.length})!`);
  process.exit(1);
}
console.log('✓ BFS successfully explored park alleys and lawns');

// 3. Test 5 envelope selections across multiple random seeds
for (let run = 1; run <= 10; run++) {
  const spots = map.getFiveAccessibleEnvelopeSpots();

  if (spots.length !== 5) {
    console.error(`FAIL Run #${run}: Expected 5 envelopes, got ${spots.length}`);
    process.exit(1);
  }

  // Verify all 5 spots are in reachableTiles and have valid paths
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    const isReachable = map.reachableTiles.some(t => t.x === s.gridX && t.z === s.gridZ);
    if (!isReachable) {
      console.error(`FAIL Run #${run} Envelope #${i + 1} at (${s.gridX}, ${s.gridZ}) is NOT reachable!`);
      process.exit(1);
    }

    const tileType = map.grid[s.gridZ][s.gridX];
    if (!map.isWalkableTile(tileType)) {
      console.error(`FAIL Run #${run} Envelope #${i + 1} tile type ${tileType} is blocked!`);
      process.exit(1);
    }
  }

  // Verify no duplicate spots
  const uniqueKeys = new Set(spots.map(s => `${s.gridX},${s.gridZ}`));
  if (uniqueKeys.size !== 5) {
    console.error(`FAIL Run #${run}: Duplicate envelope locations!`);
    process.exit(1);
  }
}

console.log('✓ Verified 10 randomized runs: all 5 envelopes guaranteed 100% reachable with accessible walking paths!');

// 4. Test Obstacle Collisions
console.log('--- Testing Obstacle Collision Boundaries ---');
const spawnWorld = map.gridToWorld(map.spawnTile.x, map.spawnTile.z);
if (map.isBlocked(spawnWorld.x, spawnWorld.z, 0.3)) {
  console.error('FAIL: Player spawn location reported as blocked!');
  process.exit(1);
}
console.log('✓ Spawn world position is unblocked');

// Test outer fence boundary (outside map size)
const outsideCoord = -(map.halfSize + 5);
if (!map.isBlocked(outsideCoord, outsideCoord, 0.3)) {
  console.error('FAIL: Position outside park bounds was not blocked!');
  process.exit(1);
}
console.log('✓ Outer boundary fence collision working');

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! ✅');
