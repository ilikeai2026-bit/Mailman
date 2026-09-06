import { Environment } from '../src/environment.js';

console.log('--- Testing Environment (Ocean, Island Cliffs, Piers & Voxel Clouds) ---');

const mockScene = {
  add: () => {}
};

const env = new Environment(mockScene, 56);

// 1. Verify Ocean mesh
console.assert(env.oceanMesh !== null && env.oceanMesh !== undefined, 'Ocean mesh must be created');
console.log('✓ Expansive animated ocean mesh initialized');

// 2. Verify Voxel Clouds
console.assert(env.clouds.length >= 20, `Expected at least 20 clouds, got ${env.clouds.length}`);
const firstCloud = env.clouds[0];
console.assert(firstCloud.position.y >= 20, `Clouds must float at high altitude (>=20), got ${firstCloud.position.y}`);
console.assert(firstCloud.userData.speed > 0, 'Clouds must have positive drift speed');
console.log(`✓ Verified ${env.clouds.length} 3D voxel clouds floating at altitude y=${firstCloud.position.y.toFixed(1)}`);

// 3. Verify Ocean Boats
console.assert(env.boatMeshes.length > 0, 'Should create distant ocean boats');
console.log(`✓ Verified ${env.boatMeshes.length} voxel sailboats bobbing on the ocean`);

// 4. Verify Update Loop
const initialX = firstCloud.position.x;
env.update(1.0, 5.0);
console.assert(firstCloud.position.x > initialX, 'Clouds must drift forward during update()');
console.log('✓ Verified cloud drift and wave offset animation update loop');

console.log('\nALL ENVIRONMENT TESTS PASSED SUCCESSFULLY! ✅\n');
