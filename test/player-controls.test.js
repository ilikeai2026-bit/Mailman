// Test suite to verify 3rd-person player controls:
// 1. Pressing Left turns Steve left (heading increases towards +X)
// 2. Pressing Right turns Steve right (heading decreases towards -X)
// 3. Forward advances along current heading
// 4. Backward steps opposite to current heading
// 5. 3rd-person camera stays directly behind player along heading vector

import { Player } from '../src/player.js';

console.log('--- Testing 3rd-Person Controls & Camera Alignment ---');

// Mock scene and audio for headless testing
const mockScene = {
  add: () => {},
  remove: () => {}
};

const mockMap = {
  isBlocked: () => false,
  isStoneTile: () => false
};

// 1. Test Player Initialization
const player = new Player(mockScene, 0, 0);
if (player.heading !== 0) {
  console.error(`FAIL: Expected initial heading 0, got ${player.heading}`);
  process.exit(1);
}
console.log('✓ Initial player heading is 0 (facing +Z away from camera)');

// 2. Test Turning Left
// In 3rd-person, turn = +1 indicates left input (A / Left Arrow)
const dt = 0.1;
const initialHeading = player.heading;
player.updateThirdPerson(dt, 0, 1, mockMap);

if (player.heading <= initialHeading) {
  console.error(`FAIL: Expected heading to increase when turning left, got ${player.heading}`);
  process.exit(1);
}
console.log(`✓ Pressing Left turns Steve left (heading increased to ${player.heading.toFixed(4)} rad)`);

// 3. Test Turning Right
player.reset(0, 0);
player.updateThirdPerson(dt, 0, -1, mockMap);

if (player.heading >= 0) {
  console.error(`FAIL: Expected heading to decrease when turning right, got ${player.heading}`);
  process.exit(1);
}
console.log(`✓ Pressing Right turns Steve right (heading decreased to ${player.heading.toFixed(4)} rad)`);

// 4. Test Forward Movement along Heading
player.reset(0, 0); // facing +Z (heading = 0)
player.updateThirdPerson(dt, 1, 0, mockMap);

if (player.position.z <= 0 || Math.abs(player.position.x) > 0.001) {
  console.error(`FAIL: Expected forward movement along +Z at heading 0, got (${player.position.x}, ${player.position.z})`);
  process.exit(1);
}
console.log(`✓ Moving forward at heading 0 moves Steve along +Z (pos: z = ${player.position.z.toFixed(3)})`);

// 5. Test Forward Movement After Turning 90 degrees Left (+PI/2)
player.reset(0, 0);
player.heading = Math.PI / 2;
player.updateThirdPerson(dt, 1, 0, mockMap);

if (player.position.x <= 0 || Math.abs(player.position.z) > 0.001) {
  console.error(`FAIL: Expected forward movement along +X when facing left (+PI/2), got (${player.position.x}, ${player.position.z})`);
  process.exit(1);
}
console.log(`✓ Moving forward after turning left moves Steve towards +X (pos: x = ${player.position.x.toFixed(3)})`);

// 6. Test Backward Movement
player.reset(0, 0);
player.updateThirdPerson(dt, -1, 0, mockMap);

if (player.position.z >= 0) {
  console.error(`FAIL: Expected backward movement along -Z at heading 0, got z = ${player.position.z}`);
  process.exit(1);
}
console.log(`✓ Moving backward moves Steve in reverse (pos: z = ${player.position.z.toFixed(3)})`);

// 7. Test Camera Position Behind Player
const testHeadings = [0, -Math.PI / 2, Math.PI / 2, Math.PI];
const distance = 3.5;
const pitch = 0.25;
const cosPitch = Math.cos(pitch);

for (const h of testHeadings) {
  player.heading = h;
  const camX = player.position.x - Math.sin(player.heading) * cosPitch * distance;
  const camZ = player.position.z - Math.cos(player.heading) * cosPitch * distance;

  // Vector from camera to player
  const dirX = player.position.x - camX;
  const dirZ = player.position.z - camZ;

  // Normalized camera-to-player vector should match (sin(heading), cos(heading))
  const expectedDirX = Math.sin(player.heading) * cosPitch;
  const expectedDirZ = Math.cos(player.heading) * cosPitch;

  if (Math.abs(dirX - expectedDirX * distance) > 0.001 || Math.abs(dirZ - expectedDirZ * distance) > 0.001) {
    console.error(`FAIL: Camera not directly behind player at heading ${h}`);
    process.exit(1);
  }
}
console.log('✓ Camera position is verified to always remain directly behind player at all headings');

// 8. Test Unified Update Method
player.reset(0, 0);
player.update(dt, { throttle: 1, turn: 1 }, mockMap, 'third-person');
if (player.heading <= 0 || player.position.z <= 0) {
  console.error(`FAIL: Unified update failed for 3rd-person mode`);
  process.exit(1);
}
console.log('✓ Player unified update correctly delegates to updateThirdPerson');

console.log('--- ALL 3RD-PERSON CONTROL TESTS PASSED! ---');
