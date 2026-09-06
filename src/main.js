import * as THREE from 'three';
import { Player } from './player.js';
import { ParkMap } from './map.js';
import { Environment } from './environment.js';
import { EnvelopeManager } from './envelopes.js';
import { UIManager } from './ui.js';
import { sound } from './audio.js';

// 10-Level campaign timers in seconds: from 150s down to 50s in Level 10
export const LEVEL_TIMERS = [150, 135, 120, 110, 100, 90, 80, 70, 60, 50];

export class Game {
  constructor() {
    this.container = document.getElementById('game-container') || document.body;
    this.clock = new THREE.Clock();

    // 10-Level Campaign Configuration
    this.currentLevel = 1;
    this.maxLevels = LEVEL_TIMERS.length;
    this.levelTimers = LEVEL_TIMERS;
    this.levelTotalTime = this.levelTimers[0]; // 150s for Level 1
    this.levelTimeRemaining = this.levelTotalTime;
    this.levelTimeElapsed = 0;
    this.levelStats = [];
    this.isLevelActive = true;
    this.isLevelComplete = false;
    this.isGameOver = false;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x82b8ea); // Minecraft sunny sky blue

    // Camera Modes: 'third-person' or 'isometric'
    this.cameraMode = 'third-person';

    // Camera setup
    const width = window.innerWidth || 800;
    const height = window.innerHeight || 600;
    this.aspect = width / height;
    this.viewSize = 7.5;
    this.targetViewSize = 7.5;
    this.minViewSize = 4.0;
    this.maxViewSize = 14.0;

    // 1. Top-Down / Isometric Orthographic Camera
    this.isoCamera = new THREE.OrthographicCamera(
      -this.viewSize * this.aspect,
      this.viewSize * this.aspect,
      this.viewSize,
      -this.viewSize,
      1,
      500
    );

    // 2. 3rd-Person Perspective Camera
    this.tpCamera = new THREE.PerspectiveCamera(65, this.aspect, 0.1, 1000);
    this.activeCamera = this.tpCamera;

    // Top-down tracking angles
    this.cameraDistance = 32;
    this.cameraPitch = 1.16; // ~66.5° steep top-down-ish bird's-eye angle
    this.cameraYaw = Math.PI / 4; // 45°
    this.targetCameraYaw = Math.PI / 4;
    this.cameraTarget = new THREE.Vector3();

    // 3rd Person camera parameters
    this.tpYaw = 0; // horizontal orbit angle behind player
    this.tpPitch = 0.25; // vertical tilt looking slightly down
    this.tpDistance = 3.5; // distance behind Steve
    this.tpTarget = new THREE.Vector3();

    // Pointer drag for mouse-look / orbit
    this.isPointerDown = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Input state
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };
    this.virtualInput = {
      up: false,
      down: false,
      left: false,
      right: false
    };
    this.voiceThrottle = 0; // +1 forward, -1 backward (relative to player heading)
    this.voiceThrottleTimeout = null;

    // Initialize subsystems
    this.setupLights();
    this.setupParkAndEntities();

    this.ui = new UIManager(this);
    this.ui.updateLevelHUD(this.currentLevel, this.maxLevels);
    this.ui.updateCountdownHUD(this.levelTimeRemaining, this.levelTotalTime);
    this.ui.updateEnvelopeHUD(0, 5);
    this.ui.updateCameraModeUI(this.cameraMode);

    this.setupWindowListeners();

    // Start loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    console.log('[Game] Minecraft Mailman Courier initialized (10 Levels)!');
  }

  setupLights() {
    // Soft sky ambient light
    const ambientLight = new THREE.AmbientLight(0xdde8ff, 0.8);
    this.scene.add(ambientLight);

    // Directional sunlight casting shadows
    this.sunLight = new THREE.DirectionalLight(0xfff7e8, 1.25);
    this.sunLight.position.set(25, 45, 20);
    this.sunLight.castShadow = true;

    // Shadow camera bounds
    const d = 32;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Horizon Atmospheric Fog matching sunny sky blue
    this.scene.fog = new THREE.Fog(0x82b8ea, 95, 260);
  }

  setupParkAndEntities() {
    // 1. Build park map (grand 56x56 grid)
    this.map = new ParkMap(this.scene, 56);

    // 1b. Build surrounding ocean, cliffs, piers & clouds
    this.environment = new Environment(this.scene, 56);

    // 2. Spawn player at park entrance
    const spawnWorld = this.map.gridToWorld(this.map.spawnTile.x, this.map.spawnTile.z);
    this.player = new Player(this.scene, spawnWorld.x, spawnWorld.z);
    this.cameraTarget.copy(this.player.position);

    // 3. Envelope Manager
    this.envelopeManager = new EnvelopeManager(
      this.scene,
      (collected, total, env) => {
        this.ui.updateEnvelopeHUD(collected, total);
      },
      () => {
        this.handleLevelComplete();
      }
    );

    // Spawn 5 guaranteed-accessible envelopes
    const spots = this.map.getFiveAccessibleEnvelopeSpots();
    console.log('[Game] Placed 5 accessible envelopes at spots:', spots);
    this.envelopeManager.spawnEnvelopes(spots);
  }

  handleLevelComplete() {
    if (!this.isLevelActive) return;
    this.isLevelActive = false;
    this.isLevelComplete = true;

    const timeTaken = Math.max(1, Math.round(this.levelTimeElapsed));
    const timeRemaining = Math.max(0, Math.round(this.levelTimeRemaining));

    this.levelStats.push({
      level: this.currentLevel,
      timeTaken,
      timeRemaining
    });

    if (this.currentLevel < this.maxLevels) {
      this.ui.showLevelCompleteModal(this.currentLevel, timeTaken, timeRemaining);
    } else {
      // Completed Level 10! Award the Grand Golden Cup!
      const totalTime = this.levelStats.reduce((sum, stat) => sum + stat.timeTaken, 0);
      this.ui.showGrandVictoryModal(totalTime, this.levelStats);
    }
  }

  handleTimeOut() {
    if (!this.isLevelActive) return;
    this.isLevelActive = false;
    this.isGameOver = true;

    if (sound.playTimeoutSound) {
      sound.playTimeoutSound();
    }

    const collected = this.envelopeManager ? this.envelopeManager.collectedCount : 0;
    this.ui.showTimeoutModal(this.currentLevel, collected, 5);
  }

  startLevel(levelNum) {
    this.currentLevel = Math.max(1, Math.min(levelNum, this.maxLevels));
    this.levelTotalTime = this.levelTimers[this.currentLevel - 1];
    this.levelTimeRemaining = this.levelTotalTime;
    this.levelTimeElapsed = 0;
    this.isLevelActive = true;
    this.isLevelComplete = false;
    this.isGameOver = false;

    this.ui.closeAllModals();

    // Reset player position
    const spawnWorld = this.map.gridToWorld(this.map.spawnTile.x, this.map.spawnTile.z);
    this.player.reset(spawnWorld.x, spawnWorld.z);
    this.cameraTarget.copy(this.player.position);

    // Spawn 5 fresh accessible spots
    const spots = this.map.getFiveAccessibleEnvelopeSpots();
    this.envelopeManager.spawnEnvelopes(spots);

    // Reset UI
    this.ui.updateLevelHUD(this.currentLevel, this.maxLevels);
    this.ui.updateEnvelopeHUD(0, 5);
    this.ui.updateCountdownHUD(this.levelTimeRemaining, this.levelTotalTime);
  }

  nextLevel() {
    if (this.currentLevel < this.maxLevels) {
      this.startLevel(this.currentLevel + 1);
    } else {
      this.restartCampaign();
    }
  }

  restartCurrentLevel() {
    this.startLevel(this.currentLevel);
  }

  restartCampaign() {
    this.levelStats = [];
    this.startLevel(1);
  }

  restartGame() {
    this.restartCampaign();
  }

  rotateCamera() {
    if (this.cameraMode === 'third-person') {
      this.player.heading += Math.PI / 4;
      while (this.player.heading > Math.PI) this.player.heading -= Math.PI * 2;
      while (this.player.heading < -Math.PI) this.player.heading += Math.PI * 2;
      this.player.targetRotationY = this.player.heading;
      this.player.currentRotationY = this.player.heading;
      this.player.innerGroup.rotation.y = this.player.heading;
      this.tpYaw = this.player.heading;
    } else {
      this.targetCameraYaw += Math.PI / 2;
    }
  }

  toggleCameraMode() {
    if (this.cameraMode === 'third-person') {
      this.cameraMode = 'isometric';
      this.activeCamera = this.isoCamera;
    } else {
      this.cameraMode = 'third-person';
      this.activeCamera = this.tpCamera;
      this.tpYaw = this.player.heading;
    }
    if (this.ui) {
      this.ui.updateCameraModeUI(this.cameraMode);
    }
  }

  zoomIn() {
    if (this.cameraMode === 'third-person') {
      this.tpDistance = Math.max(1.8, this.tpDistance - 0.5);
    } else {
      this.targetViewSize = Math.max(this.minViewSize, this.targetViewSize - 1.2);
    }
  }

  zoomOut() {
    if (this.cameraMode === 'third-person') {
      this.tpDistance = Math.min(6.5, this.tpDistance + 0.5);
    } else {
      this.targetViewSize = Math.min(this.maxViewSize, this.targetViewSize + 1.2);
    }
  }

  setVirtualInput(dir, active) {
    if (this.virtualInput.hasOwnProperty(dir)) {
      this.virtualInput[dir] = active;
    }
  }

  turnPlayer90(direction = 'left') {
    if (this.isLevelActive && this.player && typeof this.player.turn90 === 'function') {
      this.player.turn90(direction);
    }
  }

  movePlayerForward(durationMs = 1200) {
    if (!this.isLevelActive) return;
    this.voiceThrottle = 1;
    if (this.voiceThrottleTimeout) clearTimeout(this.voiceThrottleTimeout);
    this.voiceThrottleTimeout = setTimeout(() => {
      this.voiceThrottle = 0;
      this.voiceThrottleTimeout = null;
    }, durationMs);
  }

  movePlayerBackward(durationMs = 1200) {
    if (!this.isLevelActive) return;
    this.voiceThrottle = -1;
    if (this.voiceThrottleTimeout) clearTimeout(this.voiceThrottleTimeout);
    this.voiceThrottleTimeout = setTimeout(() => {
      this.voiceThrottle = 0;
      this.voiceThrottleTimeout = null;
    }, durationMs);
  }

  stopPlayerMovement() {
    this.voiceThrottle = 0;
    if (this.voiceThrottleTimeout) {
      clearTimeout(this.voiceThrottleTimeout);
      this.voiceThrottleTimeout = null;
    }
  }

  clearAllInputs() {
    this.keys.up = false;
    this.keys.down = false;
    this.keys.left = false;
    this.keys.right = false;
    this.virtualInput.up = false;
    this.virtualInput.down = false;
    this.virtualInput.left = false;
    this.virtualInput.right = false;
    this.stopPlayerMovement();
    if (this.player) {
      this.player.turnTargetHeading = null;
    }
  }

  setupWindowListeners() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      // Audio activation on first user interaction
      sound.init();

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = true;
          this.stopPlayerMovement();
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = true;
          this.stopPlayerMovement();
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          this.stopPlayerMovement();
          if (this.player) this.player.turnTargetHeading = null;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          this.stopPlayerMovement();
          if (this.player) this.player.turnTargetHeading = null;
          break;
        case 'KeyV':
          this.toggleCameraMode();
          break;
        case 'KeyQ':
          if (this.cameraMode === 'third-person') {
            this.player.heading += Math.PI / 4;
            while (this.player.heading > Math.PI) this.player.heading -= Math.PI * 2;
            this.player.targetRotationY = this.player.heading;
            this.player.currentRotationY = this.player.heading;
            this.player.innerGroup.rotation.y = this.player.heading;
            this.tpYaw = this.player.heading;
          } else {
            this.targetCameraYaw -= Math.PI / 2;
          }
          break;
        case 'KeyE':
          if (this.cameraMode === 'third-person') {
            this.player.heading -= Math.PI / 4;
            while (this.player.heading < -Math.PI) this.player.heading += Math.PI * 2;
            this.player.targetRotationY = this.player.heading;
            this.player.currentRotationY = this.player.heading;
            this.player.innerGroup.rotation.y = this.player.heading;
            this.tpYaw = this.player.heading;
          } else {
            this.targetCameraYaw += Math.PI / 2;
          }
          break;
        case 'KeyN':
          sound.nextTrack();
          break;
        case 'KeyM':
          {
            const isMuted = sound.toggleMute();
            const muteBtn = document.getElementById('mute-btn');
            if (muteBtn) {
              muteBtn.textContent = isMuted ? '🔇' : '🔊';
              muteBtn.title = isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)';
            }
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.aspect = window.innerWidth / window.innerHeight;

      // Update Isometric camera
      this.isoCamera.left = -this.viewSize * this.aspect;
      this.isoCamera.right = this.viewSize * this.aspect;
      this.isoCamera.top = this.viewSize;
      this.isoCamera.bottom = -this.viewSize;
      this.isoCamera.updateProjectionMatrix();

      // Update 3rd person perspective camera
      this.tpCamera.aspect = this.aspect;
      this.tpCamera.updateProjectionMatrix();

      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Pointer drag for mouse-look / 360 orbit
    window.addEventListener('pointerdown', (e) => {
      sound.init();
      const target = e.target;
      if (target && target.closest && target.closest('#ui-overlay')) {
        return;
      }
      this.isPointerDown = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      if (this.cameraMode === 'third-person') {
        this.player.heading -= dx * 0.005;
        while (this.player.heading > Math.PI) this.player.heading -= Math.PI * 2;
        while (this.player.heading < -Math.PI) this.player.heading += Math.PI * 2;
        this.player.targetRotationY = this.player.heading;
        this.player.currentRotationY = this.player.heading;
        this.player.innerGroup.rotation.y = this.player.heading;
        this.tpYaw = this.player.heading;
        this.tpPitch = Math.max(-0.2, Math.min(0.85, this.tpPitch + dy * 0.004));
      } else {
        this.targetCameraYaw -= dx * 0.004;
      }
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });
    window.addEventListener('pointercancel', () => {
      this.isPointerDown = false;
    });

    // Mouse wheel zoom
    window.addEventListener('wheel', (e) => {
      if (this.cameraMode === 'third-person') {
        this.tpDistance += (e.deltaY > 0 ? 0.3 : -0.3);
        this.tpDistance = Math.max(1.8, Math.min(6.5, this.tpDistance));
      } else {
        this.targetViewSize += (e.deltaY > 0 ? 0.8 : -0.8);
        this.targetViewSize = Math.max(this.minViewSize, Math.min(this.maxViewSize, this.targetViewSize));
      }
    }, { passive: true });
  }

  calculateMovementDirection() {
    const up = this.keys.up || this.virtualInput.up ? 1 : 0;
    const down = this.keys.down || this.virtualInput.down ? 1 : 0;
    const left = this.keys.left || this.virtualInput.left ? 1 : 0;
    const right = this.keys.right || this.virtualInput.right ? 1 : 0;

    const screenY = up - down; // Forward / Back
    const screenX = right - left; // Right / Left

    if (screenX === 0 && screenY === 0) {
      return { x: 0, z: 0 };
    }

    if (this.cameraMode === 'third-person') {
      // In 3rd person: W moves in camera's horizontal facing direction
      const sinYaw = Math.sin(this.tpYaw);
      const cosYaw = Math.cos(this.tpYaw);

      // Camera forward vector on X-Z
      const forwardX = sinYaw;
      const forwardZ = cosYaw;

      // Camera right vector on X-Z (perpendicular to forward)
      const rightX = -cosYaw;
      const rightZ = sinYaw;

      const worldX = forwardX * screenY + rightX * screenX;
      const worldZ = forwardZ * screenY + rightZ * screenX;
      return { x: worldX, z: worldZ };
    } else {
      // Isometric view
      const sinYaw = Math.sin(this.cameraYaw);
      const cosYaw = Math.cos(this.cameraYaw);

      const forwardX = -sinYaw;
      const forwardZ = -cosYaw;
      const rightX = cosYaw;
      const rightZ = -sinYaw;

      const worldX = forwardX * screenY + rightX * screenX;
      const worldZ = forwardZ * screenY + rightZ * screenX;
      return { x: worldX, z: worldZ };
    }
  }

  updateCamera(dt) {
    if (this.cameraMode === 'third-person') {
      // Camera is always directly behind Steve along his current heading
      this.tpYaw = this.player.heading;
      const cosPitch = Math.cos(this.tpPitch);
      const sinPitch = Math.sin(this.tpPitch);

      const targetX = this.player.position.x - Math.sin(this.tpYaw) * cosPitch * this.tpDistance;
      const targetY = this.player.position.y + 1.2 + sinPitch * this.tpDistance;
      const targetZ = this.player.position.z - Math.cos(this.tpYaw) * cosPitch * this.tpDistance;

      this.tpCamera.position.set(targetX, targetY, targetZ);
      this.tpCamera.lookAt(this.player.position.x, this.player.position.y + 1.0, this.player.position.z);

      // Sunlight follows player
      this.sunLight.position.set(
        this.player.position.x + 25,
        45,
        this.player.position.z + 20
      );
      this.sunLight.target.position.copy(this.player.position);
    } else {
      // Isometric camera mode
      if (Math.abs(this.targetViewSize - this.viewSize) > 0.01) {
        this.viewSize += (this.targetViewSize - this.viewSize) * Math.min(1, dt * 10);
        this.isoCamera.left = -this.viewSize * this.aspect;
        this.isoCamera.right = this.viewSize * this.aspect;
        this.isoCamera.top = this.viewSize;
        this.isoCamera.bottom = -this.viewSize;
        this.isoCamera.updateProjectionMatrix();
      }

      let yawDiff = this.targetCameraYaw - this.cameraYaw;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      this.cameraYaw += yawDiff * Math.min(1, dt * 8);

      this.cameraTarget.lerp(this.player.position, Math.min(1, dt * 7));

      const cy = Math.sin(this.cameraPitch) * this.cameraDistance;
      const groundDist = Math.cos(this.cameraPitch) * this.cameraDistance;
      const cx = Math.sin(this.cameraYaw) * groundDist;
      const cz = Math.cos(this.cameraYaw) * groundDist;

      this.isoCamera.position.set(
        this.cameraTarget.x + cx,
        this.cameraTarget.y + cy,
        this.cameraTarget.z + cz
      );
      this.isoCamera.lookAt(this.cameraTarget.x, this.cameraTarget.y + 0.5, this.cameraTarget.z);

      this.sunLight.position.set(
        this.cameraTarget.x + 25,
        45,
        this.cameraTarget.z + 20
      );
      this.sunLight.target.position.copy(this.cameraTarget);
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // 0. Update Level Countdown Timer
    if (this.isLevelActive) {
      this.levelTimeRemaining -= dt;
      this.levelTimeElapsed += dt;

      if (this.levelTimeRemaining <= 0) {
        this.levelTimeRemaining = 0;
        this.handleTimeOut();
      }

      this.ui.updateCountdownHUD(this.levelTimeRemaining, this.levelTotalTime);
    }

    // 1. Process movement only if level is active
    if (this.isLevelActive) {
      if (this.cameraMode === 'third-person') {
        const up = (this.keys.up || this.virtualInput.up ? 1 : 0) || (this.voiceThrottle > 0 ? 1 : 0);
        const down = (this.keys.down || this.virtualInput.down ? 1 : 0) || (this.voiceThrottle < 0 ? 1 : 0);
        const left = this.keys.left || this.virtualInput.left ? 1 : 0;
        const right = this.keys.right || this.virtualInput.right ? 1 : 0;

        const throttle = up - down; // Forward (+1) / Backward (-1)
        const turn = left - right;   // Turn Left (+1) / Turn Right (-1)

        this.player.update(dt, { throttle, turn }, this.map, this.cameraMode);
      } else {
        let moveDir = this.calculateMovementDirection();

        // In Top-Down mode: if no keyboard/dpad direction is active, voice throttle moves to player front/back
        if (moveDir.x === 0 && moveDir.z === 0 && this.voiceThrottle !== 0) {
          const heading = this.player.heading;
          const fwdX = Math.sin(heading);
          const fwdZ = Math.cos(heading);
          if (this.voiceThrottle > 0) {
            moveDir = { x: fwdX, z: fwdZ };
          } else {
            moveDir = { x: fwdX, z: fwdZ, reverse: true };
          }
        }

        this.player.update(dt, { moveDir }, this.map, this.cameraMode);
      }
    } else {
      // Idle player if modal / timeout is showing
      this.player.update(dt, { throttle: 0, turn: 0, moveDir: { x: 0, z: 0 } }, this.map, this.cameraMode);
    }

    // 2. Update envelopes & particles
    const activePlayerPos = this.isLevelActive ? this.player.position : { x: 99999, y: 0, z: 99999 };
    this.envelopeManager.update(dt, elapsed, activePlayerPos);

    // 2b. Update ocean waves, drifting clouds, and boats
    if (this.environment) {
      this.environment.update(dt, elapsed);
    }

    // 3. Update Camera
    this.updateCamera(dt);

    // 4. Update UI Radar & Minimap
    const nearest = this.envelopeManager.getNearestActiveEnvelope(this.player.position);
    const activeYaw = this.cameraMode === 'third-person' ? this.player.heading : this.cameraYaw;
    this.ui.updateRadar(this.player.position, nearest, activeYaw);
    this.ui.drawMinimap(
      this.map,
      this.player.position,
      this.envelopeManager.envelopes,
      this.player.currentRotationY
    );

    // 5. Render 3D Scene with active camera
    this.renderer.render(this.scene, this.activeCamera);
  }
}

// Start game when DOM is loaded or immediately if already ready
function startGame() {
  try {
    console.log('[Game] Starting Minecraft Park Explorer...');
    window.game = new Game();
  } catch (err) {
    console.error('[Game] Fatal error initializing game:', err);
    const errBox = document.createElement('div');
    errBox.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(30,30,30,0.95);border:3px solid #ff4444;color:#ff8888;padding:24px;font-family:monospace;font-size:12px;z-index:99999;max-width:90%;text-align:center;box-shadow:0 0 25px rgba(0,0,0,0.8);line-height:1.6;';
    errBox.innerHTML = `<h3 style="color:#ff4444;margin-bottom:12px;font-size:16px;">⚠️ Game Initialization Error</h3><p style="color:#ffffff;margin-bottom:10px;">${err.message}</p><pre style="text-align:left;background:#111;padding:10px;overflow:auto;max-height:200px;font-size:11px;color:#ccc;border:1px solid #444;">${err.stack || err}</pre>`;
    document.body.appendChild(errBox);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
  } else {
    startGame();
  }
}
