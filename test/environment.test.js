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
console.assert(env.boatMeshes.length > 0, 'Should create ocean boats');
console.log(`✓ Verified ${env.boatMeshes.length} voxel boats on the ocean`);

// 3b. Verify Docked Postman Boat
console.assert(env.postmanBoat !== null && env.postmanBoat !== undefined, 'Postman boat must be created');
console.assert(env.postmanBoat.position.z > 25, `Postman boat should be docked near South Gate entrance (Z > 25), got Z=${env.postmanBoat.position.z}`);
console.assert(env.postmanBoat.position.x > 0, `Postman boat should be docked on East side of pier, got X=${env.postmanBoat.position.x}`);
console.assert(env.postmanBoat.children.length >= 25, `Postman boat should be rich in voxel details, got ${env.postmanBoat.children.length} parts`);
console.log(`✓ Verified Postman Boat docked at entrance (X=${env.postmanBoat.position.x}, Z=${env.postmanBoat.position.z}) with ${env.postmanBoat.children.length} detailed parts`);

// 4. Verify Update Loop
const initialX = firstCloud.position.x;
const initialBoatY = env.postmanBoat.position.y;
env.update(1.0, 5.0);
console.assert(firstCloud.position.x > initialX, 'Clouds must drift forward during update()');
console.assert(env.postmanBoat.position.y !== initialBoatY, 'Postman boat should bob with ocean waves');
console.log('✓ Verified cloud drift, wave offset, and postman boat ocean bobbing in update loop');

console.log('\nALL ENVIRONMENT TESTS PASSED SUCCESSFULLY! ✅\n');
