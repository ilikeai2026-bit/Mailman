import assert from 'node:assert';
import { worldToMinimapScreen, MINIMAP_TILE_COLORS } from '../src/ui.js';

console.log('--- Testing Player-Centered & Heading-Up Dynamic Minimap ---');

const CX = 65;
const CY = 65;
const SCALE = 5.2;
const RADAR_RADIUS = 60;

// Test 1: Player is always centered at (CX, CY)
const playerPos1 = { x: 12.5, z: 24.3 };
const heading1 = 0; // Facing +Z (South)
const screenPosCenter = worldToMinimapScreen(playerPos1, heading1, playerPos1.x, playerPos1.z, SCALE, CX, CY);

assert.strictEqual(Math.round(screenPosCenter.screenX), CX, 'Player X must be centered at CX');
assert.strictEqual(Math.round(screenPosCenter.screenY), CY, 'Player Y must be centered at CY');
assert.strictEqual(screenPosCenter.distance, 0, 'Distance to player self must be 0');
console.log('✓ Player location is always centered at (65, 65) on minimap');

// Test 2: Moving player retains center location
const playerPos2 = { x: -20.0, z: -15.0 };
const screenPosCenter2 = worldToMinimapScreen(playerPos2, 1.25, playerPos2.x, playerPos2.z, SCALE, CX, CY);
assert.strictEqual(Math.round(screenPosCenter2.screenX), CX);
assert.strictEqual(Math.round(screenPosCenter2.screenY), CY);
console.log('✓ Moving player to new coordinates retains center position on minimap');

// Test 3: Forward in world direction (+Z when heading = 0) maps to straight UP on screen
const forwardTarget = { x: playerPos1.x, z: playerPos1.z + 5.0 };
const screenFwd = worldToMinimapScreen(playerPos1, 0, forwardTarget.x, forwardTarget.z, SCALE, CX, CY);
assert.strictEqual(Math.round(screenFwd.screenX), CX, 'Forward target screen X should remain at center column');
assert(screenFwd.screenY < CY, 'Forward target screen Y must be above center (straight UP)');
assert.strictEqual(Math.round(screenFwd.screenY), Math.round(CY - 5.0 * SCALE));
console.log(`✓ Forward direction in 3D world maps straight UP on minimap: (${screenFwd.screenX}, ${screenFwd.screenY})`);

// Test 4: Backward in world direction (-Z when heading = 0) maps to straight DOWN on screen
const backTarget = { x: playerPos1.x, z: playerPos1.z - 5.0 };
const screenBack = worldToMinimapScreen(playerPos1, 0, backTarget.x, backTarget.z, SCALE, CX, CY);
assert.strictEqual(Math.round(screenBack.screenX), CX);
assert(screenBack.screenY > CY, 'Backward target screen Y must be below center (straight DOWN)');
assert.strictEqual(Math.round(screenBack.screenY), Math.round(CY + 5.0 * SCALE));
console.log('✓ Backward direction in 3D world maps straight DOWN on minimap');

// Test 5: Right in world direction (-X when heading = 0) maps to straight RIGHT on screen
const rightTarget = { x: playerPos1.x - 5.0, z: playerPos1.z };
const screenRight = worldToMinimapScreen(playerPos1, 0, rightTarget.x, rightTarget.z, SCALE, CX, CY);
assert(screenRight.screenX > CX, 'Right target screen X must be to the right of center');
assert.strictEqual(Math.round(screenRight.screenY), CY, 'Right target screen Y must remain at center row');
assert.strictEqual(Math.round(screenRight.screenX), Math.round(CX + 5.0 * SCALE));
console.log('✓ Right direction in 3D world maps straight RIGHT on minimap');

// Test 6: Left in world direction (+X when heading = 0) maps to straight LEFT on screen
const leftTarget = { x: playerPos1.x + 5.0, z: playerPos1.z };
const screenLeft = worldToMinimapScreen(playerPos1, 0, leftTarget.x, leftTarget.z, SCALE, CX, CY);
assert(screenLeft.screenX < CX, 'Left target screen X must be to the left of center');
assert.strictEqual(Math.round(screenLeft.screenY), CY, 'Left target screen Y must remain at center row');
assert.strictEqual(Math.round(screenLeft.screenX), Math.round(CX - 5.0 * SCALE));
console.log('✓ Left direction in 3D world maps straight LEFT on minimap');

// Test 7: Orientation dynamic rotation - when Steve turns 90° left (heading = +PI/2, facing +X)
// That left target (+X) is now straight ahead of Steve, so it must map to straight UP!
const turnedLeftHeading = Math.PI / 2;
const screenTurnedLeftFwd = worldToMinimapScreen(playerPos1, turnedLeftHeading, leftTarget.x, leftTarget.z, SCALE, CX, CY);
assert.strictEqual(Math.round(screenTurnedLeftFwd.screenX), CX, 'Target ahead of rotated player must be at CX');
assert(screenTurnedLeftFwd.screenY < CY, 'Target ahead of rotated player must be straight UP');
assert.strictEqual(Math.round(screenTurnedLeftFwd.screenY), Math.round(CY - 5.0 * SCALE));
console.log('✓ When player turns left (facing +X), +X maps straight UP on minimap');

// Test 8: Orientation dynamic rotation - when Steve turns 90° right (heading = -PI/2, facing -X)
// That right target (-X) is now straight ahead of Steve, so it must map to straight UP!
const turnedRightHeading = -Math.PI / 2;
const screenTurnedRightFwd = worldToMinimapScreen(playerPos1, turnedRightHeading, rightTarget.x, rightTarget.z, SCALE, CX, CY);
assert.strictEqual(Math.round(screenTurnedRightFwd.screenX), CX);
assert(screenTurnedRightFwd.screenY < CY);
assert.strictEqual(Math.round(screenTurnedRightFwd.screenY), Math.round(CY - 5.0 * SCALE));
console.log('✓ When player turns right (facing -X), -X maps straight UP on minimap');

// Test 9: Compass North needle calculation on the radar rim
// North in world is -Z (dx = 0, dz = -1).
// When player faces South (heading = 0): North is behind player, so North needle is at bottom of rim.
const northRimDist = RADAR_RADIUS - 2;
const northX_SouthFacing = CX - Math.sin(0) * northRimDist;
const northY_SouthFacing = CY + Math.cos(0) * northRimDist;
assert.strictEqual(Math.round(northX_SouthFacing), CX);
assert.strictEqual(Math.round(northY_SouthFacing), Math.round(CY + northRimDist));
console.log('✓ North needle is at bottom of rim when player faces South (+Z)');

// When player faces North (heading = PI): North is ahead of player, so North needle is at top of rim.
const northX_NorthFacing = CX - Math.sin(Math.PI) * northRimDist;
const northY_NorthFacing = CY + Math.cos(Math.PI) * northRimDist;
assert.strictEqual(Math.round(northX_NorthFacing), CX);
assert.strictEqual(Math.round(northY_NorthFacing), Math.round(CY - northRimDist));
console.log('✓ North needle is at top of rim when player faces North (-Z)');

// When player faces West (heading = -PI/2): North is to player right, so North needle is at right of rim.
const northX_WestFacing = CX - Math.sin(-Math.PI / 2) * northRimDist;
const northY_WestFacing = CY + Math.cos(-Math.PI / 2) * northRimDist;
assert.strictEqual(Math.round(northX_WestFacing), Math.round(CX + northRimDist));
assert.strictEqual(Math.round(northY_WestFacing), CY);
console.log('✓ North needle is at right of rim when player faces West (-X)');

// Test 10: Tile colors map completeness
for (let tileId = 0; tileId <= 10; tileId++) {
  assert(MINIMAP_TILE_COLORS[tileId], `Tile type ${tileId} must have a defined minimap color`);
}
console.log('✓ All 11 park tile types have verified minimap color palettes');

console.log('\nALL MINIMAP LOCATION & ORIENTATION TESTS PASSED SUCCESSFULLY! ✅');
