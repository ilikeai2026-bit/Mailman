import * as THREE from 'three';
import {
  steveFaceTexture,
  steveHairTexture,
  mailmanShirtTexture,
  mailmanShirtBackTexture,
  mailmanShirtSideTexture,
  mailmanArmTexture,
  mailmanPantsTexture,
  mailmanCapTexture,
  mailmanBagTexture,
  steveShoeTexture
} from './textures.js';
import { sound } from './audio.js';

export class Player {
  constructor(scene, startX = 0, startZ = 0) {
    this.scene = scene;
    this.speed = 5.2; // blocks per second
    this.turnSpeed = 3.2; // radians per second for turning left/right
    this.radius = 0.32; // collision radius
    this.isMoving = false;
    this.isTurning = false;
    this.walkTime = 0;
    this.heading = 0; // facing angle in radians (0 = facing +Z)
    this.targetRotationY = 0;
    this.currentRotationY = 0;

    this.position = new THREE.Vector3(startX, 0, startZ);
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.buildSteveModel();
    this.scene.add(this.group);
  }

  buildSteveModel() {
    // Proportions (approx 1.8 blocks tall total)
    // Head: 0.44 x 0.44 x 0.44
    // Torso: 0.44 x 0.66 x 0.24
    // Arms: 0.2 x 0.66 x 0.2
    // Legs: 0.2 x 0.66 x 0.2

    const skinColor = 0xc68b6b;

    // Materials
    const headMaterials = [
      new THREE.MeshLambertMaterial({ map: steveHairTexture }), // right
      new THREE.MeshLambertMaterial({ map: steveHairTexture }), // left
      new THREE.MeshLambertMaterial({ map: steveHairTexture }), // top
      new THREE.MeshLambertMaterial({ color: skinColor }),      // bottom
      new THREE.MeshLambertMaterial({ map: steveFaceTexture }), // front (+Z)
      new THREE.MeshLambertMaterial({ map: steveHairTexture })  // back
    ];

    // Mailman Uniform Materials: Distinct front, back, and side textures
    const shirtFrontMat = new THREE.MeshLambertMaterial({
      map: mailmanShirtTexture,
      emissive: 0x113355,
      emissiveIntensity: 0.25
    });
    const shirtBackMat = new THREE.MeshLambertMaterial({
      map: mailmanShirtBackTexture,
      emissive: 0x113355,
      emissiveIntensity: 0.25
    });
    const shirtSideMat = new THREE.MeshLambertMaterial({
      map: mailmanShirtSideTexture,
      emissive: 0x113355,
      emissiveIntensity: 0.25
    });
    const shirtPlainMat = new THREE.MeshLambertMaterial({
      color: 0x4383b5,
      emissive: 0x113355,
      emissiveIntensity: 0.25
    });

    // BoxGeometry faces: [+X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)]
    const torsoMaterials = [
      shirtSideMat,  // +X (right side)
      shirtSideMat,  // -X (left side)
      shirtPlainMat, // +Y (shoulders/collar)
      shirtPlainMat, // -Y (waist tuck)
      shirtFrontMat, // +Z (front: courier badge, collar, buttons, pocket, belt buckle)
      shirtBackMat   // -Z (back: shoulder yoke, center spine pleat, belt loops, NO buckle)
    ];

    const armMat = new THREE.MeshLambertMaterial({ map: mailmanArmTexture });
    const pantsMat = new THREE.MeshLambertMaterial({ map: mailmanPantsTexture });

    // Inner wrapper for bobbing
    this.innerGroup = new THREE.Group();
    this.group.add(this.innerGroup);

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.44, 0.66, 0.24);
    this.torso = new THREE.Mesh(torsoGeo, torsoMaterials);
    this.torso.position.y = 0.66 + 0.33; // bottom at y=0.66, center at 0.99
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.innerGroup.add(this.torso);

    // 1b. Leather Mail Satchel & Crossbody Strap
    const satchelGeo = new THREE.BoxGeometry(0.14, 0.24, 0.28);
    const satchelMat = new THREE.MeshLambertMaterial({ map: mailmanBagTexture });
    this.mailSatchel = new THREE.Mesh(satchelGeo, satchelMat);
    this.mailSatchel.position.set(0.24, -0.10, 0.03);
    this.mailSatchel.castShadow = true;
    this.torso.add(this.mailSatchel);

    const strapGeo = new THREE.BoxGeometry(0.04, 0.68, 0.25);
    const strapMat = new THREE.MeshLambertMaterial({ color: 0x5a3217 });
    const strap = new THREE.Mesh(strapGeo, strapMat);
    strap.position.set(0, 0.02, 0.01);
    strap.rotation.z = -0.58;
    this.torso.add(strap);

    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.44, 0.44, 0.44);
    this.head = new THREE.Mesh(headGeo, headMaterials);
    this.head.position.y = 0.99 + 0.33 + 0.22; // on top of torso = 1.54
    this.head.castShadow = true;
    this.head.receiveShadow = true;
    this.innerGroup.add(this.head);

    // 2b. 3D Mailman Visor Cap & Gold Badge
    const capCrownGeo = new THREE.BoxGeometry(0.46, 0.13, 0.46);
    const capCrownMat = new THREE.MeshLambertMaterial({ map: mailmanCapTexture });
    this.mailCap = new THREE.Mesh(capCrownGeo, capCrownMat);
    this.mailCap.position.set(0, 0.21, 0);
    this.head.add(this.mailCap);

    const visorGeo = new THREE.BoxGeometry(0.42, 0.03, 0.16);
    const visorMat = new THREE.MeshLambertMaterial({ color: 0x111622 });
    this.mailVisor = new THREE.Mesh(visorGeo, visorMat);
    this.mailVisor.position.set(0, 0.15, 0.24);
    this.mailVisor.rotation.x = 0.14;
    this.head.add(this.mailVisor);

    const badgeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 0.21, 0.235);
    this.head.add(badge);

    // 3. Left Arm (shoulder pivot)
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.33, 1.25, 0); // shoulder height
    const armGeo = new THREE.BoxGeometry(0.2, 0.66, 0.2);
    // Shift mesh down so pivot is at top of arm
    armGeo.translate(0, -0.3, 0);
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.castShadow = true;
    this.leftArmPivot.add(this.leftArm);
    this.innerGroup.add(this.leftArmPivot);

    // 4. Right Arm (shoulder pivot)
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.33, 1.25, 0);
    const rightArmGeo = armGeo.clone();
    this.rightArm = new THREE.Mesh(rightArmGeo, armMat);
    this.rightArm.castShadow = true;
    this.rightArmPivot.add(this.rightArm);
    this.innerGroup.add(this.rightArmPivot);

    // 5. Left Leg (hip pivot)
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.11, 0.66, 0); // hip height
    const legGeo = new THREE.BoxGeometry(0.2, 0.66, 0.2);
    legGeo.translate(0, -0.33, 0);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.castShadow = true;
    this.leftLegPivot.add(this.leftLeg);
    this.innerGroup.add(this.leftLegPivot);

    // 6. Right Leg (hip pivot)
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.11, 0.66, 0);
    const rightLegGeo = legGeo.clone();
    this.rightLeg = new THREE.Mesh(rightLegGeo, pantsMat);
    this.rightLeg.castShadow = true;
    this.rightLegPivot.add(this.rightLeg);
    this.innerGroup.add(this.rightLegPivot);

    // 7. Player Blue Glow Effects
    // Dynamic blue point light illuminating player and nearby ground
    this.blueLight = new THREE.PointLight(0x00d4ff, 2.0, 5.0);
    this.blueLight.position.set(0, 1.0, 0);
    this.group.add(this.blueLight);

    // Soft cyan/blue glowing ground aura beneath player's feet
    const groundAuraGeo = new THREE.RingGeometry(0.12, 0.58, 32);
    groundAuraGeo.rotateX(-Math.PI / 2);
    const groundAuraMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    this.groundAura = new THREE.Mesh(groundAuraGeo, groundAuraMat);
    this.groundAura.position.y = 0.03;
    this.group.add(this.groundAura);

    // Floating blue energy halo ring around torso
    const bodyHaloGeo = new THREE.TorusGeometry(0.40, 0.025, 8, 32);
    const bodyHaloMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.8
    });
    this.bodyHalo = new THREE.Mesh(bodyHaloGeo, bodyHaloMat);
    this.bodyHalo.rotation.x = Math.PI / 2;
    this.bodyHalo.position.y = 0.95;
    this.innerGroup.add(this.bodyHalo);
  }

  animateGlow(dt) {
    this.glowTime = (this.glowTime || 0) + dt * 3.5;
    const glowPulse = 1 + Math.sin(this.glowTime) * 0.12;
    if (this.groundAura) {
      this.groundAura.scale.set(glowPulse, glowPulse, glowPulse);
    }
    if (this.bodyHalo) {
      this.bodyHalo.rotation.z += dt * 1.5;
      this.bodyHalo.scale.set(glowPulse, glowPulse, glowPulse);
    }
    if (this.blueLight) {
      this.blueLight.intensity = 2.0 + Math.sin(this.glowTime) * 0.4;
    }
  }

  // 3rd-Person Controls:
  // - Pressing Left turns Steve left (increases heading towards +X)
  // - Pressing Right turns Steve right (decreases heading towards -X)
  // - Pressing Forward moves Steve along his heading
  // - Pressing Backward steps Steve backward
  updateThirdPerson(dt, throttle = 0, turn = 0, map) {
    this.animateGlow(dt);

    // 1. Turn Left / Right
    if (turn !== 0) {
      this.heading += turn * this.turnSpeed * dt;
      while (this.heading > Math.PI) this.heading -= Math.PI * 2;
      while (this.heading < -Math.PI) this.heading += Math.PI * 2;
      this.targetRotationY = this.heading;
      this.currentRotationY = this.heading;
      this.innerGroup.rotation.y = this.heading;
      this.isTurning = true;
    } else {
      this.isTurning = false;
    }

    // 2. Throttle Forward / Backward
    this.isMoving = throttle !== 0;
    if (this.isMoving) {
      const moveSpeed = throttle > 0 ? this.speed : this.speed * 0.72;
      const moveStep = throttle * moveSpeed * dt;
      const moveX = Math.sin(this.heading) * moveStep;
      const moveZ = Math.cos(this.heading) * moveStep;

      const newX = this.position.x + moveX;
      const newZ = this.position.z + moveZ;

      // Collision detection with sliding
      if (!map.isBlocked(newX, newZ, this.radius)) {
        this.position.x = newX;
        this.position.z = newZ;
      } else if (!map.isBlocked(newX, this.position.z, this.radius)) {
        this.position.x = newX;
      } else if (!map.isBlocked(this.position.x, newZ, this.radius)) {
        this.position.z = newZ;
      }

      this.group.position.x = this.position.x;
      this.group.position.z = this.position.z;

      // Play footstep audio
      const isStone = map.isStoneTile(this.position.x, this.position.z);
      sound.playFootstep(isStone);

      // Forward / backward walk animation
      this.walkTime += dt * 11 * (throttle > 0 ? 1 : -1);
      const swing = Math.sin(this.walkTime);

      this.leftLegPivot.rotation.x = swing * 0.65;
      this.rightLegPivot.rotation.x = -swing * 0.65;
      this.leftArmPivot.rotation.x = -swing * 0.65;
      this.rightArmPivot.rotation.x = swing * 0.65;

      this.innerGroup.position.y = Math.abs(Math.sin(this.walkTime)) * 0.07;
      this.head.rotation.y = Math.sin(this.walkTime * 0.5) * 0.08;
    } else if (this.isTurning) {
      // Turning in place limb shuffle
      this.walkTime += dt * 7;
      const turnSwing = Math.sin(this.walkTime) * 0.25;
      this.leftLegPivot.rotation.x = turnSwing;
      this.rightLegPivot.rotation.x = -turnSwing;
      this.leftArmPivot.rotation.x = -turnSwing * 0.5;
      this.rightArmPivot.rotation.x = turnSwing * 0.5;
      this.innerGroup.position.y = Math.abs(Math.sin(this.walkTime)) * 0.03;
      this.head.rotation.y = 0;
    } else {
      // Return smoothly to idle stance
      this.leftLegPivot.rotation.x *= 0.8;
      this.rightLegPivot.rotation.x *= 0.8;
      this.leftArmPivot.rotation.x *= 0.8;
      this.rightArmPivot.rotation.x *= 0.8;
      this.innerGroup.position.y *= 0.8;
      this.head.rotation.y *= 0.8;
    }
  }

  // Isometric directional movement
  updateIsometric(dt, moveDir = { x: 0, z: 0 }, map) {
    this.animateGlow(dt);

    const len = Math.hypot(moveDir.x, moveDir.z);
    this.isMoving = len > 0.05;

    if (this.isMoving) {
      const normX = moveDir.x / len;
      const normZ = moveDir.z / len;

      const moveStep = this.speed * dt;
      let newX = this.position.x + normX * moveStep;
      let newZ = this.position.z + normZ * moveStep;

      // Collision detection with sliding
      if (!map.isBlocked(newX, newZ, this.radius)) {
        this.position.x = newX;
        this.position.z = newZ;
      } else {
        if (!map.isBlocked(newX, this.position.z, this.radius)) {
          this.position.x = newX;
        }
        if (!map.isBlocked(this.position.x, newZ, this.radius)) {
          this.position.z = newZ;
        }
      }

      this.group.position.x = this.position.x;
      this.group.position.z = this.position.z;

      this.targetRotationY = Math.atan2(normX, normZ);
      this.heading = this.targetRotationY;

      // Play footstep audio
      const isStone = map.isStoneTile(this.position.x, this.position.z);
      sound.playFootstep(isStone);

      this.walkTime += dt * 11;
      const swing = Math.sin(this.walkTime);

      this.leftLegPivot.rotation.x = swing * 0.65;
      this.rightLegPivot.rotation.x = -swing * 0.65;
      this.leftArmPivot.rotation.x = -swing * 0.65;
      this.rightArmPivot.rotation.x = swing * 0.65;

      this.innerGroup.position.y = Math.abs(Math.sin(this.walkTime)) * 0.07;
      this.head.rotation.y = Math.sin(this.walkTime * 0.5) * 0.08;
    } else {
      this.leftLegPivot.rotation.x *= 0.8;
      this.rightLegPivot.rotation.x *= 0.8;
      this.leftArmPivot.rotation.x *= 0.8;
      this.rightArmPivot.rotation.x *= 0.8;
      this.innerGroup.position.y *= 0.8;
      this.head.rotation.y *= 0.8;
    }

    let diff = this.targetRotationY - this.currentRotationY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.currentRotationY += diff * Math.min(1, dt * 14);
    this.innerGroup.rotation.y = this.currentRotationY;
  }

  // Unified update handler
  update(dt, input, map, cameraMode = 'third-person') {
    if (cameraMode === 'third-person') {
      const throttle = input.throttle !== undefined ? input.throttle : (input.z ? -input.z : 0);
      const turn = input.turn !== undefined ? input.turn : (input.x ? -input.x : 0);
      this.updateThirdPerson(dt, throttle, turn, map);
    } else {
      const moveDir = input.moveDir || input;
      this.updateIsometric(dt, moveDir, map);
    }
  }

  reset(x, z) {
    this.position.set(x, 0, z);
    this.group.position.copy(this.position);
    this.heading = 0;
    this.targetRotationY = 0;
    this.currentRotationY = 0;
    this.innerGroup.rotation.y = 0;
    this.walkTime = 0;
    this.isMoving = false;
    this.isTurning = false;
  }
}
