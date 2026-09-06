import * as THREE from 'three';
import { oceanWaterTexture, sandTexture, woodPlankTexture, cobblestoneTexture } from './textures.js';

export class Environment {
  constructor(scene, parkSize = 56) {
    this.scene = scene;
    this.parkSize = parkSize;
    this.halfSize = parkSize / 2;

    this.clouds = [];
    this.oceanTexture = oceanWaterTexture;
    this.oceanTexture2 = null;
    this.boatMeshes = [];

    this.initOcean();
    this.initIslandCliffs();
    this.initPiers();
    this.initDistantIslands();
    this.initClouds();
  }

  // =========================================================================
  // 1. EXPANSIVE ANIMATED VOXEL OCEAN
  // =========================================================================
  initOcean() {
    const oceanExtent = 460; // Extends 460x460 blocks across the horizon
    const waterY = -0.58; // Just below the top of the island grass (y = 0)

    // Configure repeating ocean texture
    if (this.oceanTexture) {
      this.oceanTexture.wrapS = THREE.RepeatWrapping;
      this.oceanTexture.wrapT = THREE.RepeatWrapping;
      this.oceanTexture.repeat.set(110, 110);
    }

    // Main Ocean Surface
    const oceanGeo = new THREE.PlaneGeometry(oceanExtent, oceanExtent, 1, 1);
    const oceanMat = new THREE.MeshLambertMaterial({
      map: this.oceanTexture,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide
    });

    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(0, waterY, 0);
    this.oceanMesh.receiveShadow = true;
    this.scene.add(this.oceanMesh);

    // Deep Seafloor Bed (Sandy shelf underneath water)
    const seafloorGeo = new THREE.PlaneGeometry(oceanExtent, oceanExtent, 1, 1);
    const seafloorMat = new THREE.MeshLambertMaterial({
      map: sandTexture,
      color: 0xa8c4db
    });
    const seafloorMesh = new THREE.Mesh(seafloorGeo, seafloorMat);
    seafloorMesh.rotation.x = -Math.PI / 2;
    seafloorMesh.position.set(0, -3.8, 0);
    seafloorMesh.receiveShadow = true;
    this.scene.add(seafloorMesh);
  }

  // =========================================================================
  // 2. ISLAND CLIFF FOUNDATION & BEACH SHELF
  // =========================================================================
  initIslandCliffs() {
    const hs = this.halfSize;
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const cliffMat = new THREE.MeshLambertMaterial({ map: cobblestoneTexture });
    const sandMat = new THREE.MeshLambertMaterial({ map: sandTexture });

    const cliffGroup = new THREE.Group();
    const matricesCliff = [];
    const matricesSand = [];

    // Ring of stone cliff blocks under the park border fence (y = -1.5)
    // Plus a surrounding ring of submerged sand blocks (y = -0.7)
    for (let i = -hs - 1; i <= hs + 1; i++) {
      // North & South edges
      const edgePositions = [
        { x: i + 0.5, z: -hs - 0.5 },
        { x: i + 0.5, z: hs + 0.5 },
        { x: -hs - 0.5, z: i + 0.5 },
        { x: hs + 0.5, z: i + 0.5 }
      ];

      edgePositions.forEach(p => {
        // Vertical stone cliff walls dropping down 2 blocks below island
        matricesCliff.push(new THREE.Matrix4().setPosition(p.x, -1.5, p.z));
        matricesCliff.push(new THREE.Matrix4().setPosition(p.x, -2.5, p.z));

        // Submerged beach/sand reef extending 1-2 blocks into water
        const dirX = Math.sign(p.x);
        const dirZ = Math.sign(p.z);
        if (Math.abs(p.x) >= hs) {
          matricesSand.push(new THREE.Matrix4().setPosition(p.x + dirX * 1.0, -0.85, p.z));
        }
        if (Math.abs(p.z) >= hs) {
          matricesSand.push(new THREE.Matrix4().setPosition(p.x, -0.85, p.z + dirZ * 1.0));
        }
      });
    }

    if (matricesCliff.length > 0) {
      const cliffInst = new THREE.InstancedMesh(cubeGeo, cliffMat, matricesCliff.length);
      cliffInst.receiveShadow = true;
      for (let i = 0; i < matricesCliff.length; i++) {
        cliffInst.setMatrixAt(i, matricesCliff[i]);
      }
      this.scene.add(cliffInst);
    }

    if (matricesSand.length > 0) {
      const sandInst = new THREE.InstancedMesh(cubeGeo, sandMat, matricesSand.length);
      sandInst.receiveShadow = true;
      for (let i = 0; i < matricesSand.length; i++) {
        sandInst.setMatrixAt(i, matricesSand[i]);
      }
      this.scene.add(sandInst);
    }
  }

  // =========================================================================
  // 3. SCENIC PIERS & BOAT DOCKS OUTSIDE THE 4 GATES
  // =========================================================================
  initPiers() {
    const hs = this.halfSize;
    const plankMat = new THREE.MeshLambertMaterial({ map: woodPlankTexture });
    const postMat = new THREE.MeshLambertMaterial({ map: woodPlankTexture });
    const plankGeo = new THREE.BoxGeometry(1, 0.25, 1);
    const postGeo = new THREE.BoxGeometry(0.25, 2.5, 0.25);

    // Dock positions outside each of the 4 gates
    const docks = [
      { startX: 0, startZ: -hs - 1, dirX: 0, dirZ: -1 }, // North Gate dock
      { startX: 0, startZ: hs + 1, dirX: 0, dirZ: 1 },    // South Gate dock
      { startX: -hs - 1, startZ: 0, dirX: -1, dirZ: 0 }, // West Gate dock
      { startX: hs + 1, startZ: 0, dirX: 1, dirZ: 0 }    // East Gate dock
    ];

    docks.forEach(dock => {
      const pierGroup = new THREE.Group();

      // Extend 5 blocks into the ocean
      for (let step = 0; step < 5; step++) {
        for (let w = -1; w <= 1; w++) {
          const posX = dock.dirX !== 0 ? dock.startX + step * dock.dirX : dock.startX + w;
          const posZ = dock.dirZ !== 0 ? dock.startZ + step * dock.dirZ : dock.startZ + w;

          // Pier deck planks
          const deck = new THREE.Mesh(plankGeo, plankMat);
          deck.position.set(posX, -0.38, posZ);
          deck.receiveShadow = true;
          pierGroup.add(deck);

          // Support stilts on outer edges
          if (step % 2 === 0 && (w === -1 || w === 1 || step === 4)) {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(posX, -1.5, posZ);
            post.castShadow = true;
            post.receiveShadow = true;
            pierGroup.add(post);
          }
        }
      }

      // End of dock mooring posts with warm lanterns
      const endX = dock.dirX !== 0 ? dock.startX + 4.5 * dock.dirX : dock.startX;
      const endZ = dock.dirZ !== 0 ? dock.startZ + 4.5 * dock.dirZ : dock.startZ;

      const mooringLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), postMat);
      mooringLeft.position.set(
        dock.dirX !== 0 ? endX : endX - 1.2,
        0.05,
        dock.dirZ !== 0 ? endZ : endZ - 1.2
      );
      pierGroup.add(mooringLeft);

      const mooringRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), postMat);
      mooringRight.position.set(
        dock.dirX !== 0 ? endX : endX + 1.2,
        0.05,
        dock.dirZ !== 0 ? endZ : endZ + 1.2
      );
      pierGroup.add(mooringRight);

      // Hanging lantern
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffd15c });
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), lanternMat);
      lantern.position.set(endX, 0.4, endZ);
      pierGroup.add(lantern);

      const lanternLight = new THREE.PointLight(0xffaa33, 0.6, 6);
      lanternLight.position.set(endX, 0.4, endZ);
      pierGroup.add(lanternLight);

      this.scene.add(pierGroup);
    });
  }

  // =========================================================================
  // 4. DISTANT VOXEL ISLANDS & OCEAN BOATS
  // =========================================================================
  initDistantIslands() {
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const sandMat = new THREE.MeshLambertMaterial({ map: sandTexture });
    const woodMat = new THREE.MeshLambertMaterial({ map: woodPlankTexture });

    const islandPositions = [
      { x: -90, z: -100, radius: 10 },
      { x: 110, z: -85,  radius: 8 },
      { x: -105, z: 95,  radius: 12 },
      { x: 120, z: 115,  radius: 9 }
    ];

    islandPositions.forEach(isle => {
      const group = new THREE.Group();
      for (let dx = -isle.radius; dx <= isle.radius; dx++) {
        for (let dz = -isle.radius; dz <= isle.radius; dz++) {
          const dist = Math.hypot(dx, dz);
          if (dist <= isle.radius) {
            const h = (isle.radius - dist) * 0.3;
            const sand = new THREE.Mesh(cubeGeo, sandMat);
            sand.position.set(isle.x + dx, -0.6 + h * 0.5, isle.z + dz);
            sand.scale.set(1, 1 + h, 1);
            sand.receiveShadow = true;
            group.add(sand);
          }
        }
      }
      this.scene.add(group);
    });

    // Little voxel sailboat bobbing on the ocean
    const boatSpots = [
      { x: -45, z: -65, rot: 0.5 },
      { x: 60, z: 50, rot: -1.2 },
      { x: -55, z: 55, rot: 2.1 }
    ];

    boatSpots.forEach(s => {
      const boat = new THREE.Group();
      // Hull
      const hullMat = new THREE.MeshLambertMaterial({ map: woodPlankTexture });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 4.5), hullMat);
      hull.position.y = -0.35;
      hull.castShadow = true;
      boat.add(hull);

      // Mast & White Voxel Sail
      const mastMat = new THREE.MeshLambertMaterial({ color: 0x5a3d28 });
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.5, 0.2), mastMat);
      mast.position.set(0, 1.8, 0);
      boat.add(mast);

      const sailMat = new THREE.MeshLambertMaterial({ color: 0xfafafa, side: THREE.DoubleSide });
      const sail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, 2.2), sailMat);
      sail.position.set(0, 2.2, 0.6);
      boat.add(sail);

      boat.position.set(s.x, 0, s.z);
      boat.rotation.y = s.rot;
      boat.userData = { initialY: boat.position.y, initialZ: boat.position.z, timeOffset: Math.random() * 10 };

      this.boatMeshes.push(boat);
      this.scene.add(boat);
    });
  }

  // =========================================================================
  // 5. MINECRAFT 3D VOXEL CLOUDS
  // =========================================================================
  initClouds() {
    this.cloudGroup = new THREE.Group();

    // Minecraft Cloud Material: Crisp, semi-translucent white voxel slabs
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    });

    const cloudCount = 32;
    const skySpan = 380;
    const baseCloudY = 24.0; // High in the sky above Steve and trees

    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Group();

      // Randomized chunky Minecraft cloud dimensions
      const length = 12 + Math.floor(Math.random() * 18); // X dimension
      const width = 8 + Math.floor(Math.random() * 14);   // Z dimension
      const height = 1.4;                                 // Flat voxel slab thickness

      // Main cloud body
      const mainGeo = new THREE.BoxGeometry(length, height, width);
      const mainBlock = new THREE.Mesh(mainGeo, cloudMat);
      cloud.add(mainBlock);

      // Fluffy secondary layer offset
      if (Math.random() > 0.4) {
        const subLength = length * (0.5 + Math.random() * 0.3);
        const subWidth = width * (0.5 + Math.random() * 0.3);
        const subGeo = new THREE.BoxGeometry(subLength, height * 0.8, subWidth);
        const subBlock = new THREE.Mesh(subGeo, cloudMat);
        subBlock.position.set(
          (Math.random() - 0.5) * 6,
          height * 0.5,
          (Math.random() - 0.5) * 6
        );
        cloud.add(subBlock);
      }

      // Initial distributed position
      cloud.position.x = (Math.random() - 0.5) * skySpan;
      cloud.position.y = baseCloudY + (Math.random() - 0.5) * 4.0;
      cloud.position.z = (Math.random() - 0.5) * skySpan;

      // Unique drift speed
      cloud.userData = {
        speed: 1.2 + Math.random() * 0.8,
        minX: -skySpan / 2,
        maxX: skySpan / 2
      };

      this.clouds.push(cloud);
      this.cloudGroup.add(cloud);
    }

    this.scene.add(this.cloudGroup);
  }

  // =========================================================================
  // 6. ANIMATION UPDATE LOOP (Waves, Floating Boats, Drifting Clouds)
  // =========================================================================
  update(delta, elapsed) {
    // 1. Gentle wave texture animation
    if (this.oceanTexture && this.oceanTexture.offset) {
      this.oceanTexture.offset.x = (this.oceanTexture.offset.x + delta * 0.016) % 1;
      this.oceanTexture.offset.y = (this.oceanTexture.offset.y + delta * 0.012) % 1;
    }

    // 2. Bobbing sailboats on the water
    this.boatMeshes.forEach(boat => {
      const t = elapsed + boat.userData.timeOffset;
      boat.position.y = boat.userData.initialY + Math.sin(t * 1.8) * 0.08;
      boat.rotation.z = Math.sin(t * 1.2) * 0.04;
      boat.rotation.x = Math.cos(t * 1.5) * 0.03;
    });

    // 3. Slowly drifting 3D Minecraft clouds
    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      cloud.position.x += cloud.userData.speed * delta;

      // Wrap around when past boundary
      if (cloud.position.x > cloud.userData.maxX) {
        cloud.position.x = cloud.userData.minX;
        cloud.position.z = (Math.random() - 0.5) * (cloud.userData.maxX * 2);
      }
    }
  }
}
