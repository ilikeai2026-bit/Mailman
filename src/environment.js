import * as THREE from 'three';
import {
  oceanWaterTexture,
  sandTexture,
  woodPlankTexture,
  cobblestoneTexture,
  envelopeTexture,
  mailmanBagTexture
} from './textures.js';

export class Environment {
  constructor(scene, parkSize = 56) {
    this.scene = scene;
    this.parkSize = parkSize;
    this.halfSize = parkSize / 2;

    this.clouds = [];
    this.oceanTexture = oceanWaterTexture;
    this.oceanTexture2 = null;
    this.boatMeshes = [];
    this.postmanBoat = null;

    this.initOcean();
    this.initIslandCliffs();
    this.initPiers();
    this.initPostmanBoat();
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
  // 3b. DOCKED POSTMAN / COURIER BOAT (South Gate Pier)
  // =========================================================================
  initPostmanBoat() {
    const boat = new THREE.Group();

    // Materials
    const hullWoodMat = new THREE.MeshLambertMaterial({
      map: woodPlankTexture,
      color: 0x8a6242 // rich oak/spruce wood tone
    });
    const darkWoodMat = new THREE.MeshLambertMaterial({
      map: woodPlankTexture,
      color: 0x4a3220 // dark keel / trim
    });
    const postalNavyMat = new THREE.MeshLambertMaterial({
      color: 0x1d3e63 // Postal courier uniform navy
    });
    const postalGoldMat = new THREE.MeshLambertMaterial({
      color: 0xffd13b // Gold courier insignia & trim
    });
    const cabinWallMat = new THREE.MeshLambertMaterial({
      color: 0x2b4c73 // Postal blue cabin siding
    });
    const cabinRoofMat = new THREE.MeshLambertMaterial({
      color: 0x182c44 // Dark navy weather-sealed roof
    });
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x9ed8f6,
      transparent: true,
      opacity: 0.72
    });
    const whiteTrimMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
    const ropeMat = new THREE.MeshLambertMaterial({ color: 0xc8b082 });
    const fenderMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    // Mail cargo materials
    const envelopeMat = new THREE.MeshLambertMaterial({
      map: envelopeTexture,
      transparent: true
    });
    const bagMat = new THREE.MeshLambertMaterial({
      map: mailmanBagTexture
    });
    const parcelMat1 = new THREE.MeshLambertMaterial({ color: 0xc99c63 }); // Kraft parcel box
    const parcelMat2 = new THREE.MeshLambertMaterial({ color: 0xb5854e }); // Cardboard crate
    const sackMat = new THREE.MeshLambertMaterial({ color: 0xddd0b5 });    // Canvas mail sack

    // -----------------------------------------------------------------------
    // A. HULL & KEEL
    // -----------------------------------------------------------------------
    // 1. Keel / Bottom spine
    const keel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 4.6), darkWoodMat);
    keel.position.set(0, -0.4, 0);
    keel.castShadow = true;
    boat.add(keel);

    // 2. Main Hull Body (spruce planking)
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 4.4), hullWoodMat);
    hull.position.set(0, 0.05, 0);
    hull.castShadow = true;
    hull.receiveShadow = true;
    boat.add(hull);

    // 3. Voxel Tapered Bow (stepped voxels narrowing towards front +Z)
    const bowStep1 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.75, 0.8), hullWoodMat);
    bowStep1.position.set(0, 0.05, 2.5);
    bowStep1.castShadow = true;
    boat.add(bowStep1);

    const bowStep2 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.75, 0.6), hullWoodMat);
    bowStep2.position.set(0, 0.05, 3.1);
    bowStep2.castShadow = true;
    boat.add(bowStep2);

    const bowProw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.95, 0.4), darkWoodMat);
    bowProw.position.set(0, 0.18, 3.5);
    bowProw.castShadow = true;
    boat.add(bowProw);

    // 4. Stern Transom (squared back -Z)
    const sternTransom = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.85, 0.25), darkWoodMat);
    sternTransom.position.set(0, 0.1, -2.3);
    sternTransom.castShadow = true;
    boat.add(sternTransom);

    // "MAIL" Brass Nameplate on Stern
    const nameplate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.26, 0.06), postalGoldMat);
    nameplate.position.set(0, 0.28, -2.45);
    boat.add(nameplate);

    const mailTextDeco = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.08), postalNavyMat);
    mailTextDeco.position.set(0, 0.28, -2.46);
    boat.add(mailTextDeco);

    // -----------------------------------------------------------------------
    // B. COURIER BLUE & GOLD GUNWALE TRIM & FENDERS
    // -----------------------------------------------------------------------
    // Port Gunwale (pier side, X = -1.0)
    const portGunwale = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 4.6), postalNavyMat);
    portGunwale.position.set(-1.0, 0.5, 0);
    boat.add(portGunwale);

    const portGoldRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.6), postalGoldMat);
    portGoldRail.position.set(-1.0, 0.65, 0);
    boat.add(portGoldRail);

    // Starboard Gunwale (outer water side, X = +1.0)
    const stbGunwale = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 4.6), postalNavyMat);
    stbGunwale.position.set(1.0, 0.5, 0);
    boat.add(stbGunwale);

    const stbGoldRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.6), postalGoldMat);
    stbGoldRail.position.set(1.0, 0.65, 0);
    boat.add(stbGoldRail);

    // Bow railing angled trim
    const bowRailLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 1.4), postalNavyMat);
    bowRailLeft.position.set(-0.6, 0.52, 2.85);
    bowRailLeft.rotation.y = 0.42;
    boat.add(bowRailLeft);

    const bowRailRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 1.4), postalNavyMat);
    bowRailRight.position.set(0.6, 0.52, 2.85);
    bowRailRight.rotation.y = -0.42;
    boat.add(bowRailRight);

    // Rubber docking bumper fenders along the port gunwale (facing dock)
    const fenderPositionsZ = [-1.4, 0.1, 1.6];
    fenderPositionsZ.forEach(fz => {
      const fender = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.35), fenderMat);
      fender.position.set(-1.12, 0.2, fz);
      boat.add(fender);

      const cord = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), ropeMat);
      cord.position.set(-1.08, 0.48, fz);
      boat.add(cord);
    });

    // -----------------------------------------------------------------------
    // C. WHEELHOUSE CABIN (Aft section, Z = -0.95)
    // -----------------------------------------------------------------------
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.15, 1.9), cabinWallMat);
    cabin.position.set(0, 0.95, -0.95);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    boat.add(cabin);

    const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.16, 2.15), cabinRoofMat);
    cabinRoof.position.set(0, 1.58, -0.95);
    cabinRoof.castShadow = true;
    boat.add(cabinRoof);

    // Front windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.08), glassMat);
    windshield.position.set(0, 1.15, 0.02);
    boat.add(windshield);

    const windshieldFrame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 0.04), whiteTrimMat);
    windshieldFrame.position.set(0, 1.15, 0.0);
    boat.add(windshieldFrame);

    // Side windows
    const portWindow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.8), glassMat);
    portWindow.position.set(-0.82, 1.15, -0.95);
    boat.add(portWindow);

    const stbWindow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.8), glassMat);
    stbWindow.position.set(0.82, 1.15, -0.95);
    boat.add(stbWindow);

    // Rear window
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 0.08), glassMat);
    rearWindow.position.set(0, 1.15, -1.92);
    boat.add(rearWindow);

    // Steering Helm inside cabin
    const helmStand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), darkWoodMat);
    helmStand.position.set(0, 0.8, -0.3);
    boat.add(helmStand);

    const helmWheel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.06), postalGoldMat);
    helmWheel.position.set(0, 1.05, -0.26);
    boat.add(helmWheel);

    // Lifebuoy ring mounted on cabin exterior
    const lifebuoyRed = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.52), new THREE.MeshLambertMaterial({ color: 0xdb3236 }));
    lifebuoyRed.position.set(0.85, 0.95, -0.95);
    boat.add(lifebuoyRed);

    const lifebuoyCenter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.28), cabinWallMat);
    lifebuoyCenter.position.set(0.85, 0.95, -0.95);
    boat.add(lifebuoyCenter);

    const lifebuoyStripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.54), whiteTrimMat);
    lifebuoyStripe.position.set(0.85, 0.95, -0.95);
    boat.add(lifebuoyStripe);

    // Copper Stovepipe Chimney on Roof
    const stovepipe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), new THREE.MeshLambertMaterial({ color: 0xb26b38 }));
    stovepipe.position.set(0.55, 1.9, -1.45);
    boat.add(stovepipe);

    const stovepipeCap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.24), ironMat);
    stovepipeCap.position.set(0.55, 2.25, -1.45);
    boat.add(stovepipeCap);

    // Tiny voxel puff of smoke
    const smokePuff = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 })
    );
    smokePuff.position.set(0.58, 2.45, -1.48);
    boat.add(smokePuff);

    // -----------------------------------------------------------------------
    // D. CARGO HOLD PACKED WITH MAIL & PARCELS (Forward section, Z = 0.5 to 2.2)
    // -----------------------------------------------------------------------
    // Wooden Cargo Pallet Decking
    const cargoFloor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 2.1), darkWoodMat);
    cargoFloor.position.set(0, 0.44, 1.15);
    boat.add(cargoFloor);

    // Large Oak Postal Freight Crate
    const largeCrate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 0.68), hullWoodMat);
    largeCrate.position.set(0.42, 0.74, 0.75);
    largeCrate.castShadow = true;
    boat.add(largeCrate);

    // Iron corner bands on crate
    const crateIron = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), ironMat);
    crateIron.position.set(0.42, 0.95, 0.75);
    boat.add(crateIron);

    // Stamped Parcel Crate stacked on top of large crate
    const stackedCrate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.4, 0.48), parcelMat2);
    stackedCrate.position.set(0.38, 1.25, 0.78);
    stackedCrate.rotation.y = 0.12;
    stackedCrate.castShadow = true;
    boat.add(stackedCrate);

    // Medium Postal Box (Port side)
    const medCrate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.52), parcelMat1);
    medCrate.position.set(-0.45, 0.68, 0.7);
    medCrate.castShadow = true;
    boat.add(medCrate);

    // Stack of Envelopes with Red Seals on top of medCrate
    const envelopeStack1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.28), envelopeMat);
    envelopeStack1.position.set(-0.45, 0.98, 0.7);
    envelopeStack1.rotation.y = -0.15;
    boat.add(envelopeStack1);

    // Cardboard parcels with shipping labels & red twine
    const parcel1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.42), parcelMat1);
    parcel1.position.set(-0.35, 0.6, 1.55);
    boat.add(parcel1);

    const parcelString1 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.06), new THREE.MeshLambertMaterial({ color: 0xcc3333 }));
    parcelString1.position.set(-0.35, 0.6, 1.55);
    boat.add(parcelString1);

    const parcel2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.38), parcelMat2);
    parcel2.position.set(0.42, 0.57, 1.5);
    boat.add(parcel2);

    // Second stack of Letters / Envelopes on parcel2
    const envelopeStack2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.24), envelopeMat);
    envelopeStack2.position.set(0.42, 0.76, 1.5);
    envelopeStack2.rotation.y = 0.2;
    boat.add(envelopeStack2);

    // Steve's Spare Postal Bag resting in cargo bay
    const spareBag = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.16), bagMat);
    spareBag.position.set(0.04, 0.58, 0.95);
    spareBag.rotation.y = 0.35;
    spareBag.rotation.z = -0.1;
    boat.add(spareBag);

    // Canvas Mail Sacks (Burlap tied with postal blue stripe)
    const mailSack1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.42), sackMat);
    mailSack1.position.set(0.02, 0.65, 1.85);
    mailSack1.castShadow = true;
    boat.add(mailSack1);

    const sackStripe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), postalNavyMat);
    sackStripe.position.set(0.02, 0.65, 1.85);
    boat.add(sackStripe);

    const sackTie = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), ropeMat);
    sackTie.position.set(0.02, 0.92, 1.85);
    boat.add(sackTie);

    // -----------------------------------------------------------------------
    // E. FORWARD MAST & SWALLOWTAIL POSTAL HORN PENNANT
    // -----------------------------------------------------------------------
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.7, 0.15), darkWoodMat);
    mast.position.set(0, 1.7, 2.35);
    mast.castShadow = true;
    boat.add(mast);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.08), darkWoodMat);
    crossbar.position.set(0, 2.5, 2.35);
    boat.add(crossbar);

    const finial = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), postalGoldMat);
    finial.position.set(0, 3.12, 2.35);
    boat.add(finial);

    // Flying Postal Swallowtail Pennant
    const pennantMain = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.85), postalNavyMat);
    pennantMain.position.set(0, 2.78, 1.85);
    boat.add(pennantMain);

    const swallowtailTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.35), postalNavyMat);
    swallowtailTop.position.set(0, 2.94, 1.3);
    boat.add(swallowtailTop);

    const swallowtailBot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.35), postalNavyMat);
    swallowtailBot.position.set(0, 2.62, 1.3);
    boat.add(swallowtailBot);

    // Golden Postal Horn Insignia on Pennant
    const postalHorn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.42), postalGoldMat);
    postalHorn.position.set(0, 2.78, 1.85);
    boat.add(postalHorn);

    // -----------------------------------------------------------------------
    // F. BRASS BOW LANTERN WITH WARM GLOW
    // -----------------------------------------------------------------------
    const lanternBracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.45), ironMat);
    lanternBracket.position.set(0, 0.72, 3.65);
    boat.add(lanternBracket);

    const lanternCasing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.24), postalGoldMat);
    lanternCasing.position.set(0, 0.58, 3.82);
    boat.add(lanternCasing);

    const lanternCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.24, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xffea78 })
    );
    lanternCore.position.set(0, 0.58, 3.82);
    boat.add(lanternCore);

    const boatLight = new THREE.PointLight(0xffaa33, 0.85, 8.5);
    boatLight.position.set(0, 0.65, 3.85);
    boat.add(boatLight);

    // -----------------------------------------------------------------------
    // G. MOORING CLEATS & TETHER ROPES (Connecting to South Gate Pier)
    // -----------------------------------------------------------------------
    const cleatGeo = new THREE.BoxGeometry(0.12, 0.1, 0.24);
    const bowCleat = new THREE.Mesh(cleatGeo, ironMat);
    bowCleat.position.set(-0.98, 0.65, 2.0);
    boat.add(bowCleat);

    const sternCleat = new THREE.Mesh(cleatGeo, ironMat);
    sternCleat.position.set(-0.98, 0.65, -1.9);
    boat.add(sternCleat);

    // Mooring ropes tying boat to pier posts:
    const bowRope = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.06), ropeMat);
    bowRope.position.set(-1.22, 0.65, 2.0);
    boat.add(bowRope);

    const sternRope = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.06), ropeMat);
    sternRope.position.set(-1.22, 0.65, -1.9);
    boat.add(sternRope);

    // -----------------------------------------------------------------------
    // H. POSITIONING AT SOUTH GATE ENTRANCE PIER & WATER BOBBING
    // -----------------------------------------------------------------------
    boat.position.set(2.55, -0.42, 31.5);
    boat.rotation.y = 0; // Bow pointing South toward the open sea

    boat.userData = {
      initialY: boat.position.y,
      initialZ: boat.position.z,
      timeOffset: 0.4
    };

    this.postmanBoat = boat;
    this.boatMeshes.push(boat);
    this.scene.add(boat);
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
