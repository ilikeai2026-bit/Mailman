import { sound } from './audio.js';

export class UIManager {
  constructor(game) {
    this.game = game;

    // Elements
    this.envelopeSlots = document.querySelectorAll('.envelope-slot');
    this.counterEl = document.getElementById('envelope-counter');
    this.timerEl = document.getElementById('game-timer');
    this.radarArrowEl = document.getElementById('radar-arrow');
    this.radarDistanceEl = document.getElementById('radar-distance');
    this.winDialog = document.getElementById('win-dialog');
    this.winStatsEl = document.getElementById('win-stats');
    this.playAgainBtn = document.getElementById('play-again-btn');
    this.muteBtn = document.getElementById('mute-btn');
    this.zoomInBtn = document.getElementById('zoom-in-btn');
    this.zoomOutBtn = document.getElementById('zoom-out-btn');
    this.viewToggleBtn = document.getElementById('view-toggle-btn');
    this.rotateCamBtn = document.getElementById('rotate-cam-btn');
    this.voiceBtn = document.getElementById('voice-btn');
    this.voiceStatusEl = document.getElementById('voice-status');

    // Jukebox & Song Notification Elements
    this.jukeboxPill = document.getElementById('jukebox-pill');
    this.jukeboxTrackName = document.getElementById('jukebox-track-name');
    this.jukeboxArtist = document.getElementById('jukebox-artist');
    this.nextTrackBtn = document.getElementById('next-track-btn');
    this.songToast = document.getElementById('song-toast');
    this.toastTitle = document.getElementById('toast-title');
    this.toastTimeout = null;

    // Minimap canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.timerStartTime = null;
    this.elapsedSeconds = 0;
    this.timerInterval = null;

    // Voice recognition
    this.recognition = null;
    this.isListening = false;

    // Initialize track display & listen to track change events
    if (sound.getCurrentTrack()) {
      this.updateTrackInfo(sound.getCurrentTrack());
    }
    sound.onTrackChange((track) => {
      this.updateTrackInfo(track);
      this.showSongToast(track);
    });

    this.setupEventListeners();
    this.setupVoiceRecognition();
  }

  updateTrackInfo(track) {
    if (this.jukeboxTrackName) {
      this.jukeboxTrackName.textContent = track.title;
    }
    if (this.jukeboxArtist) {
      this.jukeboxArtist.textContent = `${track.artist} · 8-Bit Piano`;
    }
  }

  showSongToast(track) {
    if (!this.songToast || !this.toastTitle) return;
    this.toastTitle.textContent = `${track.artist} - ${track.title} (8-Bit Piano)`;
    this.songToast.classList.add('show');
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      if (this.songToast) this.songToast.classList.remove('show');
    }, 3200);
  }

  updateCameraModeUI(mode) {
    if (this.viewToggleBtn) {
      this.viewToggleBtn.textContent = mode === 'third-person' ? '🎥 3rd Person' : '🎥 Isometric';
      this.viewToggleBtn.title = `Current: ${mode}. Click or press V to switch view`;
    }
  }

  startTimer() {
    this.timerStartTime = Date.now();
    this.elapsedSeconds = 0;
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.timerStartTime) / 1000);
      const mins = String(Math.floor(this.elapsedSeconds / 60)).padStart(2, '0');
      const secs = String(this.elapsedSeconds % 60).padStart(2, '0');
      if (this.timerEl) {
        this.timerEl.textContent = `${mins}:${secs}`;
      }
    }, 500);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateEnvelopeHUD(collected, total) {
    if (this.counterEl) {
      this.counterEl.textContent = `${collected} / ${total}`;
    }

    this.envelopeSlots.forEach((slot, idx) => {
      if (idx < collected) {
        slot.classList.add('collected');
        slot.classList.add('pulse');
        setTimeout(() => slot.classList.remove('pulse'), 500);
      } else {
        slot.classList.remove('collected');
      }
    });
  }

  updateRadar(playerPos, nearestInfo, cameraYaw) {
    if (!this.radarArrowEl || !this.radarDistanceEl) return;

    if (!nearestInfo.envelope) {
      this.radarArrowEl.style.display = 'none';
      this.radarDistanceEl.textContent = 'All Found!';
      return;
    }

    this.radarArrowEl.style.display = 'block';
    const dx = nearestInfo.envelope.x - playerPos.x;
    const dz = nearestInfo.envelope.z - playerPos.z;

    // Angle in world coordinates
    const worldAngle = Math.atan2(dx, dz);
    // Adjust relative to current camera yaw angle
    const screenAngle = worldAngle - cameraYaw;

    this.radarArrowEl.style.transform = `rotate(${screenAngle}rad)`;
    this.radarDistanceEl.textContent = `${Math.round(nearestInfo.distance)}m away`;
  }

  drawMinimap(map, playerPos, envelopes, playerRotY) {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const size = map.size;
    const canvasSize = this.minimapCanvas.width;
    const tileSize = canvasSize / size;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Ocean blue background
    ctx.fillStyle = '#1a64ad';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // 1. Draw tiles
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const type = map.grid[z][x];
        switch (type) {
          case 0: // Grass
            ctx.fillStyle = '#4f9e30';
            break;
          case 1: // Cobble
            ctx.fillStyle = '#888888';
            break;
          case 2: // Gravel
            ctx.fillStyle = '#aba197';
            break;
          case 3: // Flowers
            ctx.fillStyle = '#e27163';
            break;
          case 4: // Water
            ctx.fillStyle = '#2e74c9';
            break;
          case 5: // Hedge
            ctx.fillStyle = '#265717';
            break;
          case 6: // Tree
            ctx.fillStyle = '#1c4912';
            break;
          case 7: // Bench
            ctx.fillStyle = '#9e6d3d';
            break;
          case 10: // Gate
            ctx.fillStyle = '#ffaa00';
            break;
          default:
            ctx.fillStyle = '#444444';
            break;
        }
        ctx.fillRect(x * tileSize, z * tileSize, tileSize + 0.3, tileSize + 0.3);
      }
    }

    // 2. Draw remaining active envelopes
    const now = Date.now() * 0.005;
    envelopes.forEach(env => {
      if (env.collected) return;
      const g = map.worldToGrid(env.x, env.z);
      const px = (g.gx + 0.5) * tileSize;
      const py = (g.gz + 0.5) * tileSize;

      const pulse = 2.5 + Math.sin(now + env.id) * 0.8;
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(px, py, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d32f2f';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 3. Draw player position & facing indicator
    const playerGrid = map.worldToGrid(playerPos.x, playerPos.z);
    const pX = (playerPos.x - (-map.halfSize + 0.5)) * tileSize;
    const pZ = (playerPos.z - (-map.halfSize + 0.5)) * tileSize;

    ctx.save();
    ctx.translate(pX, pZ);
    ctx.rotate(playerRotY);

    // Player marker: red triangle
    ctx.fillStyle = '#00e5ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-3.5, -4);
    ctx.lineTo(3.5, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  showVictoryModal() {
    this.stopTimer();
    const mins = Math.floor(this.elapsedSeconds / 60);
    const secs = this.elapsedSeconds % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs} seconds`;

    if (this.winStatsEl) {
      this.winStatsEl.innerHTML = `
        <div class="stat-row"><span>Envelopes Found:</span> <strong>5 / 5</strong></div>
        <div class="stat-row"><span>Time Elapsed:</span> <strong>${timeStr}</strong></div>
        <div class="stat-row"><span>Park Explored:</span> <strong>100%</strong></div>
      `;
    }

    if (this.winDialog) {
      this.winDialog.showModal();
    }
  }

  setupEventListeners() {
    // Play Again button
    if (this.playAgainBtn) {
      this.playAgainBtn.addEventListener('click', () => {
        if (this.winDialog) this.winDialog.close();
        this.game.restartGame();
      });
    }

    // Audio mute button
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        this.muteBtn.textContent = isMuted ? '🔇' : '🔊';
        this.muteBtn.title = isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)';
      });
    }

    // Next track button
    if (this.nextTrackBtn) {
      this.nextTrackBtn.addEventListener('click', () => {
        sound.init();
        sound.nextTrack();
      });
    }

    // Jukebox pill click
    if (this.jukeboxPill) {
      this.jukeboxPill.addEventListener('click', () => {
        sound.init();
        sound.nextTrack();
      });
    }

    // Camera view toggle (3rd person / isometric)
    if (this.viewToggleBtn) {
      this.viewToggleBtn.addEventListener('click', () => {
        this.game.toggleCameraMode();
      });
    }

    // Rotate camera
    if (this.rotateCamBtn) {
      this.rotateCamBtn.addEventListener('click', () => {
        this.game.rotateCamera();
      });
    }

    // Zoom buttons
    if (this.zoomInBtn) {
      this.zoomInBtn.addEventListener('click', () => {
        this.game.zoomIn();
      });
    }

    if (this.zoomOutBtn) {
      this.zoomOutBtn.addEventListener('click', () => {
        this.game.zoomOut();
      });
    }

    // Virtual D-pad for mobile / touch
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    dpadButtons.forEach(btn => {
      const dir = btn.dataset.dir;
      const activate = (e) => {
        e.preventDefault();
        this.game.setVirtualInput(dir, true);
      };
      const deactivate = (e) => {
        e.preventDefault();
        this.game.setVirtualInput(dir, false);
      };

      btn.addEventListener('touchstart', activate, { passive: false });
      btn.addEventListener('touchend', deactivate, { passive: false });
      btn.addEventListener('mousedown', activate);
      btn.addEventListener('mouseup', deactivate);
      btn.addEventListener('mouseleave', deactivate);
    });
  }

  setupVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (this.voiceBtn) {
        this.voiceBtn.style.display = 'none';
      }
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim().toLowerCase();
      console.log('[Voice Command]:', transcript);

      if (this.voiceStatusEl) {
        this.voiceStatusEl.textContent = `Heard: "${transcript}"`;
        setTimeout(() => {
          if (this.voiceStatusEl) this.voiceStatusEl.textContent = this.isListening ? 'Listening...' : '';
        }, 1500);
      }

      this.processVoiceCommand(transcript);
    };

    this.recognition.onerror = (e) => {
      console.warn('[Voice Recognition Error]:', e);
      if (e.error === 'not-allowed') {
        this.stopVoice();
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (err) {
          // ignore already started
        }
      }
    };

    if (this.voiceBtn) {
      this.voiceBtn.addEventListener('click', () => {
        if (this.isListening) {
          this.stopVoice();
        } else {
          this.startVoice();
        }
      });
    }
  }

  startVoice() {
    if (!this.recognition) return;
    try {
      this.recognition.start();
      this.isListening = true;
      if (this.voiceBtn) {
        this.voiceBtn.classList.add('active');
        this.voiceBtn.textContent = '🎙️ Listening...';
      }
      if (this.voiceStatusEl) {
        this.voiceStatusEl.textContent = 'Listening (say "up", "down", "left", "right", "stop")...';
      }
    } catch (e) {
      console.warn('Voice start failed:', e);
    }
  }

  stopVoice() {
    if (!this.recognition) return;
    this.isListening = false;
    try {
      this.recognition.stop();
    } catch (e) {}
    if (this.voiceBtn) {
      this.voiceBtn.classList.remove('active');
      this.voiceBtn.textContent = '🎙️ Voice Control';
    }
    if (this.voiceStatusEl) {
      this.voiceStatusEl.textContent = '';
    }
    this.game.clearAllInputs();
  }

  processVoiceCommand(cmd) {
    // Clear previous direction
    this.game.clearAllInputs();

    // Music & Playlist Voice Commands
    if (cmd.includes('next song') || cmd.includes('next track') || cmd.includes('skip song') || cmd.includes('skip')) {
      sound.init();
      sound.nextTrack();
      return;
    }
    if (cmd.includes('previous song') || cmd.includes('prev track') || cmd.includes('last song')) {
      sound.init();
      sound.prevTrack();
      return;
    }
    if (cmd.includes('venom') || cmd.includes('pink venom')) {
      sound.init();
      sound.selectTrack('pink_venom');
      return;
    }
    if (cmd.includes('shut down') || cmd.includes('shutdown')) {
      sound.init();
      sound.selectTrack('shut_down');
      return;
    }
    if (cmd.includes('ddu') || cmd.includes('ddudu') || cmd.includes('du du')) {
      sound.init();
      sound.selectTrack('ddudu');
      return;
    }
    if (cmd.includes('how you like that')) {
      sound.init();
      sound.selectTrack('how_you_like_that');
      return;
    }
    if (cmd.includes('kill this love')) {
      sound.init();
      sound.selectTrack('kill_this_love');
      return;
    }
    if (cmd.includes('mute') || cmd.includes('unmute') || cmd.includes('quiet') || cmd.includes('silence')) {
      const isMuted = sound.toggleMute();
      if (this.muteBtn) {
        this.muteBtn.textContent = isMuted ? '🔇' : '🔊';
        this.muteBtn.title = isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)';
      }
      return;
    }

    if (cmd.includes('up') || cmd.includes('forward') || cmd.includes('north')) {
      this.game.setVirtualInput('up', true);
      setTimeout(() => this.game.setVirtualInput('up', false), 1200);
    } else if (cmd.includes('down') || cmd.includes('back') || cmd.includes('south')) {
      this.game.setVirtualInput('down', true);
      setTimeout(() => this.game.setVirtualInput('down', false), 1200);
    } else if (cmd.includes('left') || cmd.includes('west')) {
      this.game.setVirtualInput('left', true);
      setTimeout(() => this.game.setVirtualInput('left', false), 1200);
    } else if (cmd.includes('right') || cmd.includes('east')) {
      this.game.setVirtualInput('right', true);
      setTimeout(() => this.game.setVirtualInput('right', false), 1200);
    } else if (cmd.includes('stop') || cmd.includes('wait') || cmd.includes('halt')) {
      this.game.clearAllInputs();
    }
  }
}
