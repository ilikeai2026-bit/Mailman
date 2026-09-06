import { sound } from './audio.js';

export const MINIMAP_TILE_COLORS = {
  0: '#4fa332', // Grass
  1: '#8a8a8a', // Cobblestone path
  2: '#aba197', // Gravel path
  3: '#e27163', // Flowers
  4: '#2b7cd3', // Water
  5: '#1f5715', // Hedge
  6: '#153d10', // Tree
  7: '#9e6d3d', // Bench
  8: '#333333', // Fence
  9: '#ffd54f', // Lamp
  10: '#ffaa00' // Gate
};

export function worldToMinimapScreen(playerPos, playerRotY, targetX, targetZ, scale, cx, cy) {
  const dx = targetX - (playerPos ? playerPos.x : 0);
  const dz = targetZ - (playerPos ? playerPos.z : 0);
  const cosH = Math.cos(playerRotY || 0);
  const sinH = Math.sin(playerRotY || 0);

  // In 3D: heading=0 faces +Z. Turning left increases heading towards +X.
  // Forward vector: (sinH, cosH)
  // Right vector: (-cosH, sinH)
  const right = -dx * cosH + dz * sinH;
  const fwd = dx * sinH + dz * cosH;

  return {
    screenX: cx + right * scale,
    screenY: cy - fwd * scale, // Screen -Y is UP (Forward)
    distance: Math.hypot(dx, dz)
  };
}

export function detectMobilePhone(customUA = null, customWidth = null) {
  if (typeof window === 'undefined' && customUA === null && customWidth === null) return false;
  const ua = customUA !== null ? customUA : (typeof navigator !== 'undefined' ? (navigator.userAgent || navigator.vendor || (typeof window !== 'undefined' && window.opera) || '') : '');
  const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  const isTouch = typeof window !== 'undefined' ? (('ontouchstart' in window) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)) : false;
  const width = customWidth !== null ? customWidth : (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isSmallScreen = width <= 840;
  return mobileRegex.test(ua) || (isTouch && isSmallScreen);
}

export class UIManager {
  constructor(game) {
    this.game = game;

    // Elements
    this.levelCounterEl = document.getElementById('level-counter');
    this.timerPillEl = document.getElementById('timer-pill');
    this.envelopeSlots = document.querySelectorAll('.envelope-slot');
    this.counterEl = document.getElementById('envelope-counter');
    this.timerEl = document.getElementById('game-timer');
    this.radarArrowEl = document.getElementById('radar-arrow');
    this.radarDistanceEl = document.getElementById('radar-distance');

    // Modals & Dialogs
    this.winDialog = document.getElementById('win-dialog');
    this.winStatsEl = document.getElementById('win-stats');

    this.levelCompleteDialog = document.getElementById('level-complete-dialog');
    this.levelWinTitleEl = document.getElementById('level-win-title');
    this.levelStatsEl = document.getElementById('level-stats');
    this.nextLevelBtn = document.getElementById('next-level-btn');
    this.shareProgressBtn = document.getElementById('share-progress-btn');

    this.grandVictoryDialog = document.getElementById('grand-victory-dialog');
    this.grandStatsEl = document.getElementById('grand-stats');
    this.grandShareBtn = document.getElementById('grand-share-btn');
    this.playAgainBtn = document.getElementById('play-again-btn');

    this.timeoutDialog = document.getElementById('timeout-dialog');
    this.timeoutStatsEl = document.getElementById('timeout-stats');
    this.retryLevelBtn = document.getElementById('retry-level-btn');

    // Share Toast Notification
    this.shareToast = document.getElementById('share-toast');
    this.shareToastMsg = document.getElementById('share-toast-msg');
    this.shareToastTimeout = null;

    // Track completed metrics for sharing
    this.lastCompletedLevel = 1;
    this.lastTimeTaken = 0;
    this.lastTotalTime = 0;

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

    this.isMobile = detectMobilePhone();
    this.checkMobileMode();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.checkMobileMode());
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.checkMobileMode(), 120);
      });
    }

    this.setupEventListeners();
    this.setupVoiceRecognition();
  }

  checkMobileMode() {
    this.isMobile = detectMobilePhone();
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('is-mobile', this.isMobile);
    }
    this.updateCameraModeUI(this.game ? this.game.cameraMode : 'third-person');
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
      const label = mode === 'third-person' ? (this.isMobile ? '3P' : '3rd Person') : (this.isMobile ? 'Top' : 'Top-Down');
      const labelEl = this.viewToggleBtn.querySelector('.btn-label');
      if (labelEl) {
        labelEl.textContent = label;
      } else {
        this.viewToggleBtn.textContent = `🎥 ${label}`;
      }
      this.viewToggleBtn.title = `Current: ${mode === 'third-person' ? '3rd Person' : 'Top-Down'}. Click or press V to switch view`;
    }
  }

  updateLevelHUD(level, maxLevels) {
    if (this.levelCounterEl) {
      this.levelCounterEl.textContent = `${level} / ${maxLevels}`;
    }
  }

  updateCountdownHUD(secondsRemaining, totalSeconds) {
    const clamped = Math.max(0, Math.ceil(secondsRemaining));
    const mins = String(Math.floor(clamped / 60)).padStart(2, '0');
    const secs = String(clamped % 60).padStart(2, '0');
    if (this.timerEl) {
      this.timerEl.textContent = `${mins}:${secs}`;
      if (clamped <= 15 && clamped > 0) {
        this.timerEl.classList.add('timer-urgent');
      } else {
        this.timerEl.classList.remove('timer-urgent');
      }
    }
  }

  startTimer() {
    // Kept for backward compatibility
  }

  stopTimer() {
    // Kept for backward compatibility
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

  drawMinimap(map, playerPos, envelopes = [], playerRotY = 0) {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const canvasSize = this.minimapCanvas.width || 130;
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const radarRadius = Math.floor(canvasSize / 2) - 4; // ~61px
    const scale = 5.2; // World units to pixels (~11.7 tiles radius visible)

    const px = playerPos ? playerPos.x : 0;
    const pz = playerPos ? playerPos.z : 0;
    const rotY = playerRotY || 0;

    // Clear entire canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // --- LAYER 1: ROTATING WORLD TILES (CLIPPED TO RADAR DISC) ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius - 1, 0, Math.PI * 2);
    ctx.clip();

    // Ocean blue background for areas outside the park island
    ctx.fillStyle = '#154374';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Set 2D transformation matrix: Player at center, rotated so player facing is UP
    const cosH = Math.cos(rotY);
    const sinH = Math.sin(rotY);
    const a = -scale * cosH;
    const b = -scale * sinH;
    const c = scale * sinH;
    const d = -scale * cosH;
    const e = cx + scale * (cosH * px - sinH * pz);
    const f = cy + scale * (sinH * px + cosH * pz);

    ctx.setTransform(a, b, c, d, e, f);

    // Visible bounding box in grid coordinates (only render visible tiles)
    const playerGrid = map && map.worldToGrid ? map.worldToGrid(px, pz) : {
      gx: Math.floor(px - 0.5 + (map ? map.halfSize : 28)),
      gz: Math.floor(pz - 0.5 + (map ? map.halfSize : 28))
    };
    const halfSize = map ? map.halfSize : 28;
    const mapSize = map ? map.size : 56;
    const viewTileRadius = Math.ceil((radarRadius / scale) * 1.45); // ~17 tiles
    const minGX = Math.max(0, playerGrid.gx - viewTileRadius);
    const maxGX = Math.min(mapSize - 1, playerGrid.gx + viewTileRadius);
    const minGZ = Math.max(0, playerGrid.gz - viewTileRadius);
    const maxGZ = Math.min(mapSize - 1, playerGrid.gz + viewTileRadius);

    if (map && map.grid) {
      for (let gz = minGZ; gz <= maxGZ; gz++) {
        const row = map.grid[gz];
        if (!row) continue;
        const wz = gz - halfSize;
        for (let gx = minGX; gx <= maxGX; gx++) {
          const type = row[gx];
          const wx = gx - halfSize;
          ctx.fillStyle = MINIMAP_TILE_COLORS[type] || '#4fa332';
          ctx.fillRect(wx, wz, 1.04, 1.04);

          // Extra detail for tree canopies
          if (type === 6) {
            ctx.fillStyle = '#0d2d09';
            ctx.beginPath();
            ctx.arc(wx + 0.5, wz + 0.5, 0.42, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    ctx.restore(); // Restore back to standard screen coordinates

    // --- LAYER 2: RADAR RANGE RING & CROSSHAIRS ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, (radarRadius - 1) * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - radarRadius + 5);
    ctx.lineTo(cx, cy + radarRadius - 5);
    ctx.moveTo(cx - radarRadius + 5, cy);
    ctx.lineTo(cx + radarRadius - 5, cy);
    ctx.stroke();

    // --- LAYER 3: ENVELOPES (NEARBY & OFF-SCREEN RADAR BLIPS) ---
    const now = Date.now() * 0.005;
    const maxRadarDist = radarRadius - 7;

    if (Array.isArray(envelopes)) {
      envelopes.forEach(env => {
        if (env.collected) return;
        const screenPos = worldToMinimapScreen(playerPos, rotY, env.x, env.z, scale, cx, cy);
        const pulse = Math.sin(now + env.id * 1.4);

        if (screenPos.distance * scale <= maxRadarDist) {
          // Inside radar circle: draw pulsing golden envelope icon
          const r = 3.6 + pulse * 0.7;

          // Glow aura
          ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
          ctx.beginPath();
          ctx.arc(screenPos.screenX, screenPos.screenY, r + 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Golden envelope body
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(screenPos.screenX, screenPos.screenY, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d32f2f';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Envelope seal / fold
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(screenPos.screenX - 1.2, screenPos.screenY - 1, 2.4, 2);
        } else {
          // Outside radar circle: clamp to rim with directional beacon
          const angle = Math.atan2(screenPos.screenY - cy, screenPos.screenX - cx);
          const rimX = cx + Math.cos(angle) * maxRadarDist;
          const rimY = cy + Math.sin(angle) * maxRadarDist;

          const rimPulse = 3.2 + pulse * 0.8;
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(rimX, rimY, rimPulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d32f2f';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });
    }

    // --- LAYER 4: PLAYER COURIER ICON AT EXACT CENTER (ALWAYS FACING UP) ---
    // Translucent forward FOV cone
    const fovGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
    fovGrad.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
    fovGrad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');
    ctx.fillStyle = fovGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 26, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
    ctx.closePath();
    ctx.fill();

    // Sleek player courier chevron
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);       // Front tip pointing UP
    ctx.lineTo(cx + 5.5, cy + 6); // Bottom right
    ctx.lineTo(cx, cy + 2.5);     // Inner notch
    ctx.lineTo(cx - 5.5, cy + 6); // Bottom left
    ctx.closePath();
    ctx.fillStyle = '#00e5ff';    // Courier cyan
    ctx.fill();
    ctx.strokeStyle = '#ffffff';   // White outline
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center satchel gold dot
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- LAYER 5: RADAR BEZEL & DYNAMIC COMPASS NORTH MARKER ---
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#222222';
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#606060';
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius - 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Dynamic North marker rotated around the rim to match world North (-Z)
    const northRimDist = radarRadius - 2;
    const northX = cx - Math.sin(rotY) * northRimDist;
    const northY = cy + Math.cos(rotY) * northRimDist;
    const northAngle = Math.atan2(northY - cy, northX - cx);

    ctx.save();
    ctx.translate(northX, northY);
    ctx.rotate(northAngle);

    // Red triangle marker pointing outward along rim
    ctx.fillStyle = '#ff3333';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(5, 0);         // Tip pointing outward
    ctx.lineTo(-3, -3.5);     // Top left
    ctx.lineTo(-1.5, 0);      // Inner notch
    ctx.lineTo(-3, 3.5);      // Bottom left
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // "N" label inside the rim towards center
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', -8, 0);
    ctx.restore();
  }

  showLevelCompleteModal(level, timeTaken, timeRemaining) {
    this.lastCompletedLevel = level;
    this.lastTimeTaken = timeTaken;

    if (this.levelWinTitleEl) {
      this.levelWinTitleEl.textContent = `LEVEL ${level} COMPLETE!`;
    }

    if (this.levelStatsEl) {
      this.levelStatsEl.innerHTML = `
        <div class="stat-row"><span>Level Completed:</span> <strong>${level} / 10</strong></div>
        <div class="stat-row"><span>Envelopes Delivered:</span> <strong>5 / 5</strong></div>
        <div class="stat-row"><span>Delivery Time:</span> <strong>${timeTaken}s</strong></div>
        <div class="stat-row"><span>Time Remaining:</span> <strong>${timeRemaining}s</strong></div>
      `;
    }

    this.closeAllModals();
    if (this.levelCompleteDialog) {
      this.levelCompleteDialog.showModal();
    }
  }

  showGrandVictoryModal(totalTime, levelStats) {
    this.lastTotalTime = totalTime;

    if (this.grandStatsEl) {
      const mins = Math.floor(totalTime / 60);
      const secs = totalTime % 60;
      const formattedTime = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

      this.grandStatsEl.innerHTML = `
        <div class="stat-row"><span>All Levels Conquered:</span> <strong>10 / 10</strong></div>
        <div class="stat-row"><span>Total Mail Delivered:</span> <strong>50 Letters</strong></div>
        <div class="stat-row"><span>Grand Delivery Time:</span> <strong>${formattedTime} (${totalTime}s)</strong></div>
        <div class="stat-row"><span>Championship Reward:</span> <strong style="color: #ffd700;">Grand Golden Cup 🏆</strong></div>
      `;
    }

    this.closeAllModals();
    if (this.grandVictoryDialog) {
      this.grandVictoryDialog.showModal();
    }
  }

  showTimeoutModal(level, collected, total) {
    if (this.timeoutStatsEl) {
      this.timeoutStatsEl.innerHTML = `
        <div class="stat-row"><span>Level Attempted:</span> <strong>Level ${level} / 10</strong></div>
        <div class="stat-row"><span>Letters Delivered:</span> <strong>${collected} / ${total}</strong></div>
        <div class="stat-row"><span>Status:</span> <strong style="color: #e53935;">Time Expired (00:00)</strong></div>
      `;
    }

    this.closeAllModals();
    if (this.timeoutDialog) {
      this.timeoutDialog.showModal();
    }
  }

  closeAllModals() {
    if (this.levelCompleteDialog && this.levelCompleteDialog.open) {
      this.levelCompleteDialog.close();
    }
    if (this.grandVictoryDialog && this.grandVictoryDialog.open) {
      this.grandVictoryDialog.close();
    }
    if (this.timeoutDialog && this.timeoutDialog.open) {
      this.timeoutDialog.close();
    }
    if (this.winDialog && this.winDialog.open) {
      this.winDialog.close();
    }
  }

  showShareToast(message) {
    if (!this.shareToast) return;
    if (this.shareToastMsg) {
      this.shareToastMsg.textContent = message || 'Delivery record copied to clipboard! Share it with friends!';
    }
    this.shareToast.classList.add('show');
    if (this.shareToastTimeout) clearTimeout(this.shareToastTimeout);
    this.shareToastTimeout = setTimeout(() => {
      if (this.shareToast) this.shareToast.classList.remove('show');
    }, 3200);
  }

  async shareProgress(level, timeTaken) {
    const url = 'https://ilikeai2026-bit.github.io/Mailman/';
    const shareText = `📬 I finished Level ${level} of Mailman in ${timeTaken}s! Can you beat my time? Play here: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Mailman - Level ${level} Complete!`,
          text: shareText,
          url: url
        });
        this.showShareToast('Shared successfully!');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        this.showShareToast('Delivery record copied to clipboard! Share it with friends!');
      } else {
        const input = document.createElement('textarea');
        input.value = shareText;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        this.showShareToast('Delivery record copied to clipboard! Share it with friends!');
      }
    } catch (e) {
      console.warn('Share copy failed:', e);
      this.showShareToast('Link ready: https://ilikeai2026-bit.github.io/Mailman/');
    }
  }

  async shareGrandVictory(totalTime) {
    const url = 'https://ilikeai2026-bit.github.io/Mailman/';
    const shareText = `🏆 I conquered all 10 Levels of Mailman in ${totalTime}s total and won the Championship Cup! Can you beat my time? Play here: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mailman - Ultimate Grand Champion!',
          text: shareText,
          url: url
        });
        this.showShareToast('Record shared successfully!');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        this.showShareToast('Championship record copied to clipboard!');
      } else {
        const input = document.createElement('textarea');
        input.value = shareText;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        this.showShareToast('Championship record copied to clipboard!');
      }
    } catch (e) {
      console.warn('Share copy failed:', e);
      this.showShareToast('Link ready: https://ilikeai2026-bit.github.io/Mailman/');
    }
  }

  showVictoryModal() {
    this.showLevelCompleteModal(1, 0, 0);
  }

  setupEventListeners() {
    // Next Level button (Level complete dialog)
    if (this.nextLevelBtn) {
      this.nextLevelBtn.addEventListener('click', () => {
        this.closeAllModals();
        this.game.nextLevel();
      });
    }

    // Share progress button (Level complete dialog)
    if (this.shareProgressBtn) {
      this.shareProgressBtn.addEventListener('click', () => {
        this.shareProgress(this.lastCompletedLevel, this.lastTimeTaken);
      });
    }

    // Grand Championship share button (Grand victory dialog)
    if (this.grandShareBtn) {
      this.grandShareBtn.addEventListener('click', () => {
        this.shareGrandVictory(this.lastTotalTime);
      });
    }

    // Retry level button (Timeout dialog)
    if (this.retryLevelBtn) {
      this.retryLevelBtn.addEventListener('click', () => {
        this.closeAllModals();
        this.game.restartCurrentLevel();
      });
    }

    // Play Again button (Grand victory & win dialogs)
    if (this.playAgainBtn) {
      this.playAgainBtn.addEventListener('click', () => {
        this.closeAllModals();
        this.game.restartCampaign();
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

    // Virtual D-pad for mobile / touch with multi-touch and thumb gliding
    const dpadContainer = document.querySelector('.dpad-container');
    const dpadButtons = document.querySelectorAll('.dpad-btn');
    let activeTouchId = null;

    const setDirection = (targetDir) => {
      ['up', 'down', 'left', 'right'].forEach(dir => {
        const shouldBeActive = (dir === targetDir);
        this.game.setVirtualInput(dir, shouldBeActive);
        const btn = document.querySelector(`.dpad-btn[data-dir="${dir}"]`);
        if (btn) {
          btn.classList.toggle('active', shouldBeActive);
        }
      });
    };

    const clearAllDpad = () => {
      ['up', 'down', 'left', 'right'].forEach(dir => {
        this.game.setVirtualInput(dir, false);
        const btn = document.querySelector(`.dpad-btn[data-dir="${dir}"]`);
        if (btn) {
          btn.classList.remove('active');
        }
      });
    };

    if (dpadContainer) {
      dpadContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        activeTouchId = touch.identifier;
        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
        const btn = elem ? elem.closest('.dpad-btn') : null;
        if (btn && btn.dataset.dir) {
          setDirection(btn.dataset.dir);
        }
      }, { passive: false });

      dpadContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === activeTouchId) {
            const elem = document.elementFromPoint(touch.clientX, touch.clientY);
            const btn = elem ? elem.closest('.dpad-btn') : null;
            if (btn && btn.dataset.dir) {
              setDirection(btn.dataset.dir);
            } else {
              clearAllDpad();
            }
            break;
          }
        }
      }, { passive: false });

      const handleTouchEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchId) {
            activeTouchId = null;
            clearAllDpad();
            break;
          }
        }
      };

      dpadContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
      dpadContainer.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    // Mouse clicks for desktop
    dpadButtons.forEach(btn => {
      const dir = btn.dataset.dir;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        setDirection(dir);
      });
      btn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        clearAllDpad();
      });
      btn.addEventListener('mouseleave', () => {
        clearAllDpad();
      });
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
