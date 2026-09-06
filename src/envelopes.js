import * as THREE from 'three';
import { envelopeTexture } from './textures.js';
import { sound } from './audio.js';

export class EnvelopeManager {
  constructor(scene, onCollectCallback, onWinCallback) {
    this.scene = scene;
    this.onCollect = onCollectCallback;
    this.onWin = onWinCallback;

    this.envelopes = []; // Active envelope objects { id, group, mesh, x, z, collected }
    this.collectedCount = 0;
    this.totalCount = 5;
    this.particles = []; // Particle burst effects

    this.initMaterials();
  }

  initMaterials() {
    const paperSideMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.45
    });
    const envelopeFrontMat = new THREE.MeshLambertMaterial({
      map: envelopeTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.55
    });

    // Box geometry faces: [right, left, top, bottom, front, back]
    this.envelopeMaterials = [
      paperSideMat,
      paperSideMat,
      paperSideMat,
      paperSideMat,
      envelopeFrontMat,
      envelopeFrontMat
    ];

    this.envelopeGeometry = new THREE.BoxGeometry(0.55, 0.38, 0.08);
  }

  spawnEnvelopes(spots) {
    // Clean up previous envelopes if restarting
    this.clear();

    spots.slice(0, 5).forEach((spot, idx) => {
      const group = new THREE.Group();
      group.position.set(spot.x, 0.55, spot.z);

      const mesh = new THREE.Mesh(this.envelopeGeometry, this.envelopeMaterials);
      mesh.castShadow = true;
      group.add(mesh);

      // 1. Soft white ground glow disk
      const auraGeo = new THREE.RingGeometry(0.08, 0.52, 32);
      auraGeo.rotateX(-Math.PI / 2);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.position.y = -0.52;
      group.add(aura);

      // 2. Floating white glow halo ring orbiting envelope
      const haloGeo = new THREE.TorusGeometry(0.42, 0.025, 8, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      group.add(halo);

      // 3. White point light illuminating surroundings
      const light = new THREE.PointLight(0xffffff, 1.8, 3.8);
      light.position.set(0, 0, 0);
      group.add(light);

      this.scene.add(group);

      this.envelopes.push({
        id: idx + 1,
        group,
        mesh,
        aura,
        halo,
        light,
        x: spot.x,
        z: spot.z,
        baseY: 0.55,
        collected: false
      });
    });

    this.collectedCount = 0;
  }

  update(dt, time, playerPos) {
    // 1. Animate active envelopes & check player collection
    for (let i = 0; i < this.envelopes.length; i++) {
      const env = this.envelopes[i];
      if (env.collected) continue;

      // Bobbing, rotating, and pulsing white glow
      env.group.rotation.y += dt * 1.8;
      env.group.position.y = env.baseY + Math.sin(time * 3 + env.id) * 0.1;
      env.aura.rotation.z += dt * 1.2;

      const pulse = 1 + Math.sin(time * 4 + env.id) * 0.12;
      env.aura.scale.set(pulse, pulse, pulse);
      if (env.halo) {
        env.halo.rotation.z -= dt * 2.0;
        env.halo.scale.set(pulse, pulse, pulse);
      }
      if (env.light) {
        env.light.intensity = 1.8 + Math.sin(time * 4 + env.id) * 0.5;
      }

      // Check if player walks on top of envelope
      const dist = Math.hypot(playerPos.x - env.x, playerPos.z - env.z);
      if (dist < 0.72) {
        this.collectEnvelope(env);
      }
    }

    // 2. Animate particle bursts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 9.8 * dt * 0.6; // gravity
      p.mesh.rotation.x += p.rotSpeed.x * dt;
      p.mesh.rotation.y += p.rotSpeed.y * dt;

      const progress = p.age / p.maxAge;
      p.mesh.scale.setScalar(Math.max(0.01, (1 - progress) * p.initialScale));
    }
  }

  collectEnvelope(env) {
    env.collected = true;
    this.collectedCount++;

    // Remove from 3D scene
    this.scene.remove(env.group);

    // Audio chime with rising pitch
    sound.playEnvelopeCollect(this.collectedCount);

    // Spawn celebratory sparkle confetti
    this.createConfettiBurst(env.x, env.group.position.y, env.z);

    // Notify UI
    if (this.onCollect) {
      this.onCollect(this.collectedCount, this.totalCount, env);
    }

    // Check win condition (when player collects all 5 envelopes)
    if (this.collectedCount >= this.totalCount) {
      setTimeout(() => {
        sound.playWinFanfare();
        if (this.onWin) {
          this.onWin();
        }
      }, 350);
    }
  }

  createConfettiBurst(x, y, z) {
    const colors = [0xffd700, 0xffeb3b, 0xff5722, 0x4caf50, 0x2196f3, 0xffffff];
    const count = 28;

    for (let i = 0; i < count; i++) {
      const size = 0.08 + Math.random() * 0.06;
      const geo = new THREE.BoxGeometry(size, size, size);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 3.5;
      const vY = 2.5 + Math.random() * 3.0;

      this.particles.push({
        mesh,
        age: 0,
        maxAge: 0.75 + Math.random() * 0.35,
        initialScale: 1.0,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          vY,
          Math.sin(angle) * speed
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          0
        )
      });
    }
  }

  getNearestActiveEnvelope(playerPos) {
    let nearest = null;
    let minDist = Infinity;

    for (const env of this.envelopes) {
      if (env.collected) continue;
      const dist = Math.hypot(env.x - playerPos.x, env.z - playerPos.z);
      if (dist < minDist) {
        minDist = dist;
        nearest = env;
      }
    }

    return { envelope: nearest, distance: minDist };
  }

  clear() {
    for (const env of this.envelopes) {
      this.scene.remove(env.group);
    }
    this.envelopes = [];
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
    this.particles = [];
    this.collectedCount = 0;
  }
}
