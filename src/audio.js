// Web Audio API procedural sound engine: 8-Bit Piano BLACKPINK Playlist & SFX
// Track 1: Pink Venom (Iconic Geomungo hook & trap piano bounce)
// Track 2: Shut Down (Paganini La Campanella sampling in 8-bit piano)
// Track 3: DDU-DU DDU-DU (High-energy punchy trap anthem)
// Track 4: How You Like That (Arabic/Middle Eastern trap drop & dramatic hook)
// Track 5: Kill This Love (Marching brass fanfare & piano hook)

// Pitch frequency reference (Equal Temperament A4 = 440Hz)
export const N = {
  // Octave 1
  C1: 32.70, Cs1: 34.65, D1: 36.71, Ds1: 38.89, E1: 41.20, F1: 43.65, Fs1: 46.25, G1: 49.00, Gs1: 51.91, A1: 55.00, As1: 58.27, B1: 61.74,
  // Octave 2
  C2: 65.41, Cs2: 69.30, D2: 73.42, Ds2: 77.78, E2: 82.41, F2: 87.31, Fs2: 92.50, G2: 98.00, Gs2: 103.83, A2: 110.00, As2: 116.54, B2: 123.47,
  // Octave 3
  C3: 130.81, Cs3: 138.59, D3: 146.83, Ds3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Gs3: 207.65, A3: 220.00, As3: 233.08, B3: 246.94,
  // Octave 4
  C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Gs4: 415.30, A4: 440.00, As4: 466.16, B4: 493.88,
  // Octave 5
  C5: 523.25, Cs5: 554.37, D5: 587.33, Ds5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Gs5: 830.61, A5: 880.00, As5: 932.33, B5: 987.77,
  // Octave 6
  C6: 1046.50, Cs6: 1108.73, D6: 1174.66, Ds6: 1244.51, E6: 1318.51, F6: 1396.91, Fs6: 1479.98, G6: 1567.98, Gs6: 1661.22, A6: 1760.00, As6: 1864.66, B6: 1975.53
};

// Flat aliases
N.Db1 = N.Cs1; N.Eb1 = N.Ds1; N.Gb1 = N.Fs1; N.Ab1 = N.Gs1; N.Bb1 = N.As1;
N.Db2 = N.Cs2; N.Eb2 = N.Ds2; N.Gb2 = N.Fs2; N.Ab2 = N.Gs2; N.Bb2 = N.As2;
N.Db3 = N.Cs3; N.Eb3 = N.Ds3; N.Gb3 = N.Fs3; N.Ab3 = N.Gs3; N.Bb3 = N.As3;
N.Db4 = N.Cs4; N.Eb4 = N.Ds4; N.Gb4 = N.Fs4; N.Ab4 = N.Gs4; N.Bb4 = N.As4;
N.Db5 = N.Cs5; N.Eb5 = N.Ds5; N.Gb5 = N.Fs5; N.Ab5 = N.Gs5; N.Bb5 = N.As5;
N.Db6 = N.Cs6; N.Eb6 = N.Ds6; N.Gb6 = N.Fs6; N.Ab6 = N.Gs6; N.Bb6 = N.As6;

export class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastFootstepTime = 0;

    // Audio Graph Gain Nodes
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    // Music Sequencer & Playlist State
    this.bgmPlaying = false;
    this.bgmInterval = null;
    this.nextBarTime = 0;
    this.currentBarIndex = 0;
    this.currentCycleCount = 0;
    this.repeatCyclesPerTrack = 2; // ~35s-45s per song before auto-transitioning
    this.currentTrackIndex = 0;

    // Listeners for track change
    this.trackChangeListeners = [];

    // BLACKPINK Playlist Definitions
    this.playlist = [
      {
        id: 'pink_venom',
        title: 'Pink Venom',
        artist: 'BLACKPINK',
        tempo: 104,
        barCount: 8,
        description: 'Iconic Geomungo pluck hook & trap piano bounce'
      },
      {
        id: 'shut_down',
        title: 'Shut Down',
        artist: 'BLACKPINK',
        tempo: 110,
        barCount: 8,
        description: 'Paganini La Campanella bell motif in 8-bit piano'
      },
      {
        id: 'ddudu',
        title: 'DDU-DU DDU-DU',
        artist: 'BLACKPINK',
        tempo: 136,
        barCount: 8,
        description: 'Punchy trap anthem & hit-you-with-that hook'
      },
      {
        id: 'how_you_like_that',
        title: 'How You Like That',
        artist: 'BLACKPINK',
        tempo: 128,
        barCount: 8,
        description: 'Dramatic Middle Eastern lead & badabing drop'
      },
      {
        id: 'kill_this_love',
        title: 'Kill This Love',
        artist: 'BLACKPINK',
        tempo: 132,
        barCount: 8,
        description: 'Triumphant brass fanfare & marching piano bounce'
      }
    ];

    this.updateTiming();
  }

  updateTiming() {
    const track = this.playlist[this.currentTrackIndex];
    this.tempo = track.tempo;
    this.beatDuration = 60 / this.tempo;
    this.barDuration = this.beatDuration * 4;
  }

  onTrackChange(callback) {
    this.trackChangeListeners.push(callback);
  }

  notifyTrackChange() {
    const track = this.playlist[this.currentTrackIndex];
    this.trackChangeListeners.forEach(cb => {
      try {
        cb(track, this.currentTrackIndex);
      } catch (e) {
        console.error('Error in track change listener:', e);
      }
    });
  }

  getCurrentTrack() {
    return this.playlist[this.currentTrackIndex];
  }

  init() {
    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // SFX Gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // BGM Gain
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Start background music loop on first user interaction
    if (this.ctx && !this.bgmPlaying && !this.muted) {
      this.startBackgroundMusic();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 1, now + 0.05);
    }
    if (!this.muted && !this.bgmPlaying) {
      this.startBackgroundMusic();
    }
    return this.muted;
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this.currentBarIndex = 0;
    this.currentCycleCount = 0;
    this.updateTiming();
    if (this.ctx) {
      this.nextBarTime = this.ctx.currentTime + 0.05;
    }
    this.notifyTrackChange();
  }

  prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    this.currentBarIndex = 0;
    this.currentCycleCount = 0;
    this.updateTiming();
    if (this.ctx) {
      this.nextBarTime = this.ctx.currentTime + 0.05;
    }
    this.notifyTrackChange();
  }

  selectTrack(trackIdOrIndex) {
    let index = -1;
    if (typeof trackIdOrIndex === 'number') {
      if (trackIdOrIndex >= 0 && trackIdOrIndex < this.playlist.length) {
        index = trackIdOrIndex;
      }
    } else if (typeof trackIdOrIndex === 'string') {
      index = this.playlist.findIndex(t => t.id === trackIdOrIndex || t.title.toLowerCase().includes(trackIdOrIndex.toLowerCase()));
    }

    if (index !== -1 && index !== this.currentTrackIndex) {
      this.currentTrackIndex = index;
      this.currentBarIndex = 0;
      this.currentCycleCount = 0;
      this.updateTiming();
      if (this.ctx) {
        this.nextBarTime = this.ctx.currentTime + 0.05;
      }
      this.notifyTrackChange();
    }
  }

  // =========================================================================
  // 8-BIT SYNTHESIS: PIANO & RETRO CHIPTUNE DRUMS
  // =========================================================================

  // Synthesize 8-bit piano chime note
  playPianoNote(freq, time, duration, volume = 0.2, isBass = false) {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    // Subtle 8-bit square harmonic for percussive bright piano attack
    const bite = this.ctx.createOscillator();
    bite.type = 'square';
    bite.frequency.setValueAtTime(freq * 2, time);

    // Percussive piano lowpass filter envelope
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const initFilter = isBass ? 750 : 2900;
    const endFilter = isBass ? 160 : 700;
    filter.frequency.setValueAtTime(initFilter, time);
    filter.frequency.exponentialRampToValueAtTime(endFilter, time + duration * 0.85);

    // Envelope: sharp attack, exponential piano decay
    const gain = this.ctx.createGain();
    const attack = 0.005;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    // Bite envelope
    const biteGain = this.ctx.createGain();
    biteGain.gain.setValueAtTime(volume * (isBass ? 0.15 : 0.28), time);
    biteGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.038);

    osc.connect(filter);
    bite.connect(biteGain);
    biteGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    bite.start(time);
    osc.stop(time + duration + 0.02);
    bite.stop(time + 0.05);
  }

  // Chiptune 8-bit percussion (subtle kick, snare, hi-hat)
  playChiptuneDrum(type, time, volume = 0.12) {
    if (!this.ctx || !this.musicGain) return;

    if (type === 'kick') {
      // 8-bit sub kick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(125, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.08);

      gain.gain.setValueAtTime(volume * 1.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.1);
    } else if (type === 'snare') {
      // 8-bit snare snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(70, time + 0.06);

      gain.gain.setValueAtTime(volume * 0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.08);
    } else if (type === 'hat') {
      // 8-bit high-hat tick
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, time);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000, time);

      gain.gain.setValueAtTime(volume * 0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.03);
    }
  }

  // =========================================================================
  // SEQUENCER & PLAYLIST LOOP
  // =========================================================================

  startBackgroundMusic() {
    if (this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;
    this.nextBarTime = this.ctx.currentTime + 0.08;
    this.currentBarIndex = 0;
    this.currentCycleCount = 0;

    this.notifyTrackChange();

    this.bgmInterval = setInterval(() => {
      if (!this.bgmPlaying || !this.ctx) return;

      while (this.nextBarTime < this.ctx.currentTime + 1.2) {
        const track = this.playlist[this.currentTrackIndex];
        this.scheduleTrackBar(this.nextBarTime, this.currentBarIndex, track.id);
        this.nextBarTime += this.barDuration;

        this.currentBarIndex++;
        if (this.currentBarIndex >= track.barCount) {
          this.currentBarIndex = 0;
          this.currentCycleCount++;

          // Auto-queue next BLACKPINK song after repeatCyclesPerTrack
          if (this.currentCycleCount >= this.repeatCyclesPerTrack) {
            this.currentCycleCount = 0;
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
            this.updateTiming();
            this.notifyTrackChange();
          }
        }
      }
    }, 120);
  }

  stopBackgroundMusic() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  scheduleTrackBar(barStart, barIndex, trackId) {
    switch (trackId) {
      case 'pink_venom':
        this.schedulePinkVenomBar(barStart, barIndex);
        break;
      case 'shut_down':
        this.scheduleShutDownBar(barStart, barIndex);
        break;
      case 'ddudu':
        this.scheduleDduduBar(barStart, barIndex);
        break;
      case 'how_you_like_that':
        this.scheduleHowYouLikeThatBar(barStart, barIndex);
        break;
      case 'kill_this_love':
        this.scheduleKillThisLoveBar(barStart, barIndex);
        break;
      default:
        this.schedulePinkVenomBar(barStart, barIndex);
        break;
    }
  }

  // =========================================================================
  // SONG 1: BLACKPINK - "PINK VENOM" (8-Bit Piano & Geomungo Trap)
  // =========================================================================
  schedulePinkVenomBar(barStart, bar) {
    const b = this.beatDuration;

    // Standard trap drum rhythm accompaniment
    this.playChiptuneDrum('kick', barStart + 0 * b, 0.16);
    this.playChiptuneDrum('snare', barStart + 1 * b, 0.12);
    this.playChiptuneDrum('hat', barStart + 1.5 * b, 0.08);
    this.playChiptuneDrum('kick', barStart + 2.5 * b, 0.15);
    this.playChiptuneDrum('snare', barStart + 3 * b, 0.13);
    this.playChiptuneDrum('hat', barStart + 3.5 * b, 0.08);

    if (bar === 0) {
      // Intro Geomungo Pluck Riff 1
      this.playPianoNote(N.D2, barStart + 0 * b, b * 0.7, 0.24, true);
      this.playPianoNote(N.D2, barStart + 2.5 * b, b * 0.6, 0.22, true);
      this.playPianoNote(N.D3, barStart + 3.5 * b, b * 0.4, 0.18, true);

      const notes = [
        { f: N.D4,  t: 0.00 * b, d: 0.22 },
        { f: N.D4,  t: 0.50 * b, d: 0.20 },
        { f: N.F4,  t: 1.00 * b, d: 0.22 },
        { f: N.G4,  t: 1.50 * b, d: 0.22 },
        { f: N.A4,  t: 2.00 * b, d: 0.35 },
        { f: N.G4,  t: 2.50 * b, d: 0.20 },
        { f: N.F4,  t: 2.85 * b, d: 0.20 },
        { f: N.E4,  t: 3.25 * b, d: 0.22 },
        { f: N.Cs4, t: 3.65 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.23));
    } else if (bar === 1) {
      // Geomungo Pluck Riff 2
      this.playPianoNote(N.D2, barStart + 0 * b, b * 0.7, 0.24, true);
      this.playPianoNote(N.Bb1, barStart + 2.0 * b, b * 0.6, 0.22, true);
      this.playPianoNote(N.C2, barStart + 3.0 * b, b * 0.5, 0.20, true);

      const notes = [
        { f: N.D4,  t: 0.00 * b, d: 0.30 },
        { f: N.F4,  t: 0.75 * b, d: 0.20 },
        { f: N.A4,  t: 1.25 * b, d: 0.22 },
        { f: N.Bb4, t: 1.75 * b, d: 0.30 },
        { f: N.A4,  t: 2.50 * b, d: 0.22 },
        { f: N.G4,  t: 3.00 * b, d: 0.20 },
        { f: N.F4,  t: 3.40 * b, d: 0.20 },
        { f: N.E4,  t: 3.70 * b, d: 0.20 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.23));
    } else if (bar === 2) {
      // Geomungo Pluck Riff 3
      this.playPianoNote(N.D2, barStart + 0 * b, b * 0.7, 0.24, true);
      this.playPianoNote(N.D2, barStart + 2.5 * b, b * 0.6, 0.22, true);
      this.playPianoNote(N.D3, barStart + 3.5 * b, b * 0.4, 0.18, true);

      const notes = [
        { f: N.D4,  t: 0.00 * b, d: 0.22 },
        { f: N.D4,  t: 0.50 * b, d: 0.20 },
        { f: N.F4,  t: 1.00 * b, d: 0.22 },
        { f: N.G4,  t: 1.50 * b, d: 0.22 },
        { f: N.A4,  t: 2.00 * b, d: 0.35 },
        { f: N.G4,  t: 2.50 * b, d: 0.20 },
        { f: N.F4,  t: 2.85 * b, d: 0.20 },
        { f: N.E4,  t: 3.25 * b, d: 0.20 },
        { f: N.D4,  t: 3.65 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.23));
    } else if (bar === 3) {
      // Pre-drop turnaround: "I bring the pain like..."
      this.playPianoNote(N.G2, barStart + 0 * b, b * 0.7, 0.24, true);
      this.playPianoNote(N.A2, barStart + 2.0 * b, b * 0.6, 0.24, true);
      this.playChiptuneDrum('snare', barStart + 3.25 * b, 0.14);
      this.playChiptuneDrum('snare', barStart + 3.5 * b, 0.15);
      this.playChiptuneDrum('snare', barStart + 3.75 * b, 0.16);

      const notes = [
        { f: N.Cs4, t: 0.00 * b, d: 0.25 },
        { f: N.E4,  t: 0.50 * b, d: 0.25 },
        { f: N.G4,  t: 1.00 * b, d: 0.25 },
        { f: N.Bb4, t: 1.50 * b, d: 0.30 },
        { f: N.A4,  t: 2.25 * b, d: 0.25 },
        { f: N.G4,  t: 2.75 * b, d: 0.20 },
        { f: N.F4,  t: 3.25 * b, d: 0.20 },
        { f: N.E4,  t: 3.65 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.24));
    } else if (bar === 4) {
      // Chorus Hook: "Straight to your dome like whoa whoa whoa"
      this.playPianoNote(N.D2, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.A2, barStart + 0 * b, b * 0.7, 0.18);
      this.playPianoNote(N.D2, barStart + 2.5 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.A4, t: 0.00 * b, d: 0.22 },
        { f: N.A4, t: 0.50 * b, d: 0.20 },
        { f: N.A4, t: 1.00 * b, d: 0.22 },
        { f: N.G4, t: 1.50 * b, d: 0.20 },
        { f: N.F4, t: 2.00 * b, d: 0.25 },
        { f: N.G4, t: 2.50 * b, d: 0.20 },
        { f: N.A4, t: 3.00 * b, d: 0.35 },
        { f: N.A4, t: 3.50 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.25));
    } else if (bar === 5) {
      // Chorus Hook: "Straight to your dome like ah ah ah"
      this.playPianoNote(N.Bb1, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.F2,  barStart + 0 * b, b * 0.7, 0.18);
      this.playPianoNote(N.Bb1, barStart + 2.5 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.A4, t: 0.00 * b, d: 0.22 },
        { f: N.A4, t: 0.50 * b, d: 0.20 },
        { f: N.A4, t: 1.00 * b, d: 0.22 },
        { f: N.G4, t: 1.50 * b, d: 0.20 },
        { f: N.F4, t: 2.00 * b, d: 0.25 },
        { f: N.E4, t: 2.50 * b, d: 0.22 },
        { f: N.D4, t: 3.00 * b, d: 0.35 },
        { f: N.D4, t: 3.50 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.25));
    } else if (bar === 6) {
      // Chorus Hook: "Taste that pink venom, taste that pink venom"
      this.playPianoNote(N.C2, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.G2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.D5, t: 0.00 * b, d: 0.20 },
        { f: N.D5, t: 0.35 * b, d: 0.20 },
        { f: N.C5, t: 0.70 * b, d: 0.20 },
        { f: N.D5, t: 1.00 * b, d: 0.25 },
        { f: N.F5, t: 1.50 * b, d: 0.28 },
        { f: N.D5, t: 2.00 * b, d: 0.20 },
        { f: N.D5, t: 2.35 * b, d: 0.20 },
        { f: N.C5, t: 2.70 * b, d: 0.20 },
        { f: N.D5, t: 3.00 * b, d: 0.25 },
        { f: N.A4, t: 3.50 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    } else if (bar === 7) {
      // Chorus Hook: "Get 'em, get 'em, get 'em... straight to your dome"
      this.playPianoNote(N.A1,  barStart + 0 * b, b * 0.8, 0.26, true);
      this.playPianoNote(N.Cs2, barStart + 2.0 * b, b * 0.6, 0.24, true);

      const notes = [
        { f: N.D5,  t: 0.00 * b, d: 0.18 },
        { f: N.D5,  t: 0.30 * b, d: 0.18 },
        { f: N.D5,  t: 0.60 * b, d: 0.18 },
        { f: N.F5,  t: 1.00 * b, d: 0.25 },
        { f: N.E5,  t: 1.50 * b, d: 0.25 },
        { f: N.D5,  t: 2.00 * b, d: 0.30 },
        { f: N.Cs5, t: 2.75 * b, d: 0.25 },
        { f: N.D5,  t: 3.25 * b, d: 0.35 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    }
  }

  // =========================================================================
  // SONG 2: BLACKPINK - "SHUT DOWN" (Paganini La Campanella in 8-Bit Piano)
  // =========================================================================
  scheduleShutDownBar(barStart, bar) {
    const b = this.beatDuration;

    this.playChiptuneDrum('kick', barStart + 0 * b, 0.16);
    this.playChiptuneDrum('snare', barStart + 1 * b, 0.13);
    this.playChiptuneDrum('kick', barStart + 2.5 * b, 0.15);
    this.playChiptuneDrum('snare', barStart + 3 * b, 0.13);
    this.playChiptuneDrum('hat', barStart + 0.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 1.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 2.0 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 3.5 * b, 0.07);

    if (bar === 0) {
      // Paganini La Campanella Bell Motif (Bar 1)
      this.playPianoNote(N.D2, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.D2, barStart + 2.5 * b, b * 0.6, 0.22, true);

      const bells = [
        { f: N.D6,  t: 0.00 * b, d: 0.16 },
        { f: N.Cs6, t: 0.35 * b, d: 0.16 },
        { f: N.D6,  t: 0.70 * b, d: 0.18 },
        { f: N.A5,  t: 1.25 * b, d: 0.22 },
        { f: N.D6,  t: 1.75 * b, d: 0.18 },
        { f: N.Bb5, t: 2.25 * b, d: 0.22 },
        { f: N.D6,  t: 2.75 * b, d: 0.18 },
        { f: N.G5,  t: 3.25 * b, d: 0.25 }
      ];
      bells.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    } else if (bar === 1) {
      // Paganini La Campanella Response (Bar 2)
      this.playPianoNote(N.Bb1, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.C2,  barStart + 2.0 * b, b * 0.6, 0.22, true);

      const bells = [
        { f: N.A5,  t: 0.00 * b, d: 0.22 },
        { f: N.F5,  t: 0.50 * b, d: 0.20 },
        { f: N.G5,  t: 1.00 * b, d: 0.22 },
        { f: N.E5,  t: 1.50 * b, d: 0.20 },
        { f: N.F5,  t: 2.00 * b, d: 0.22 },
        { f: N.D5,  t: 2.50 * b, d: 0.20 },
        { f: N.E5,  t: 3.00 * b, d: 0.22 },
        { f: N.Cs5, t: 3.50 * b, d: 0.25 }
      ];
      bells.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.25));
    } else if (bar === 2) {
      // Paganini Theme Variation
      this.playPianoNote(N.D2, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.D2, barStart + 2.5 * b, b * 0.6, 0.22, true);

      const bells = [
        { f: N.D6,  t: 0.00 * b, d: 0.16 },
        { f: N.Cs6, t: 0.35 * b, d: 0.16 },
        { f: N.D6,  t: 0.70 * b, d: 0.18 },
        { f: N.A5,  t: 1.25 * b, d: 0.22 },
        { f: N.D6,  t: 1.75 * b, d: 0.18 },
        { f: N.Bb5, t: 2.25 * b, d: 0.22 },
        { f: N.D6,  t: 2.75 * b, d: 0.18 },
        { f: N.G5,  t: 3.25 * b, d: 0.25 }
      ];
      bells.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    } else if (bar === 3) {
      // Virtuoso Run Down
      this.playPianoNote(N.G2, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.A2, barStart + 2.0 * b, b * 0.6, 0.24, true);

      const run = [
        { f: N.A5,  t: 0.00 * b, d: 0.18 },
        { f: N.Bb5, t: 0.40 * b, d: 0.18 },
        { f: N.A5,  t: 0.80 * b, d: 0.18 },
        { f: N.G5,  t: 1.20 * b, d: 0.18 },
        { f: N.F5,  t: 1.60 * b, d: 0.18 },
        { f: N.E5,  t: 2.00 * b, d: 0.18 },
        { f: N.D5,  t: 2.50 * b, d: 0.20 },
        { f: N.Cs5, t: 3.00 * b, d: 0.22 },
        { f: N.D5,  t: 3.50 * b, d: 0.28 }
      ];
      run.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    } else if (bar === 4) {
      // Vocal Hook: "When we pull up you know it's a shut down"
      this.playPianoNote(N.D2, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.D2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.A4, t: 0.00 * b, d: 0.20 },
        { f: N.A4, t: 0.40 * b, d: 0.20 },
        { f: N.A4, t: 0.80 * b, d: 0.20 },
        { f: N.G4, t: 1.20 * b, d: 0.20 },
        { f: N.F4, t: 1.60 * b, d: 0.22 },
        { f: N.F4, t: 2.00 * b, d: 0.20 },
        { f: N.G4, t: 2.40 * b, d: 0.20 },
        { f: N.A4, t: 2.80 * b, d: 0.25 },
        { f: N.D4, t: 3.30 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.25));
    } else if (bar === 5) {
      // Vocal Hook: "Shut you down, door lock"
      this.playPianoNote(N.Bb1, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.C2,  barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.A4, t: 0.00 * b, d: 0.20 },
        { f: N.A4, t: 0.40 * b, d: 0.20 },
        { f: N.A4, t: 0.80 * b, d: 0.20 },
        { f: N.G4, t: 1.20 * b, d: 0.20 },
        { f: N.F4, t: 1.60 * b, d: 0.22 },
        { f: N.G4, t: 2.00 * b, d: 0.22 },
        { f: N.A4, t: 2.40 * b, d: 0.25 },
        { f: N.D5, t: 3.00 * b, d: 0.28 },
        { f: N.C5, t: 3.50 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.25));
    } else if (bar === 6) {
      // Hook: "Whip it whip it whip it whip it"
      this.playPianoNote(N.D2, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.D2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.D5, t: 0.00 * b, d: 0.18 },
        { f: N.D5, t: 0.35 * b, d: 0.18 },
        { f: N.C5, t: 0.70 * b, d: 0.20 },
        { f: N.A4, t: 1.00 * b, d: 0.22 },
        { f: N.D5, t: 1.50 * b, d: 0.18 },
        { f: N.D5, t: 1.85 * b, d: 0.18 },
        { f: N.C5, t: 2.20 * b, d: 0.20 },
        { f: N.A4, t: 2.50 * b, d: 0.22 },
        { f: N.F4, t: 3.00 * b, d: 0.22 },
        { f: N.G4, t: 3.50 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.25));
    } else if (bar === 7) {
      // Resolution: "Keep watching me shut it down"
      this.playPianoNote(N.G2, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.A2, barStart + 2.0 * b, b * 0.8, 0.26, true);

      const notes = [
        { f: N.A4, t: 0.00 * b, d: 0.22 },
        { f: N.G4, t: 0.50 * b, d: 0.20 },
        { f: N.F4, t: 1.00 * b, d: 0.22 },
        { f: N.E4, t: 1.50 * b, d: 0.20 },
        { f: N.D4, t: 2.00 * b, d: 0.22 },
        { f: N.F4, t: 2.50 * b, d: 0.22 },
        { f: N.E4, t: 3.00 * b, d: 0.22 },
        { f: N.D4, t: 3.50 * b, d: 0.35 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    }
  }

  // =========================================================================
  // SONG 3: BLACKPINK - "DDU-DU DDU-DU" (Punchy Trap Anthem)
  // =========================================================================
  scheduleDduduBar(barStart, bar) {
    const b = this.beatDuration;

    this.playChiptuneDrum('kick', barStart + 0 * b, 0.17);
    this.playChiptuneDrum('snare', barStart + 1 * b, 0.13);
    this.playChiptuneDrum('kick', barStart + 2 * b, 0.16);
    this.playChiptuneDrum('snare', barStart + 3 * b, 0.13);
    this.playChiptuneDrum('hat', barStart + 0.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 1.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 2.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 3.5 * b, 0.07);

    if (bar === 0) {
      // Verse intro
      this.playPianoNote(N.E2, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.E2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.E4, t: 0.00 * b, d: 0.18 },
        { f: N.E4, t: 0.50 * b, d: 0.18 },
        { f: N.G4, t: 1.00 * b, d: 0.22 },
        { f: N.A4, t: 1.50 * b, d: 0.22 },
        { f: N.B4, t: 2.00 * b, d: 0.25 },
        { f: N.B4, t: 2.50 * b, d: 0.20 },
        { f: N.A4, t: 3.00 * b, d: 0.20 },
        { f: N.G4, t: 3.50 * b, d: 0.22 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.23));
    } else if (bar === 1) {
      this.playPianoNote(N.C2, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.D2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.E4, t: 0.00 * b, d: 0.18 },
        { f: N.G4, t: 0.50 * b, d: 0.20 },
        { f: N.A4, t: 1.00 * b, d: 0.22 },
        { f: N.B4, t: 1.50 * b, d: 0.22 },
        { f: N.D5, t: 2.00 * b, d: 0.28 },
        { f: N.B4, t: 2.50 * b, d: 0.22 },
        { f: N.A4, t: 3.00 * b, d: 0.20 },
        { f: N.G4, t: 3.50 * b, d: 0.22 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.23));
    } else if (bar === 2) {
      // Pre-chorus buildup
      this.playPianoNote(N.E2, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.G2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.G4,  t: 0.00 * b, d: 0.20 },
        { f: N.G4,  t: 0.50 * b, d: 0.20 },
        { f: N.A4,  t: 1.00 * b, d: 0.22 },
        { f: N.B4,  t: 1.50 * b, d: 0.22 },
        { f: N.C5,  t: 2.00 * b, d: 0.25 },
        { f: N.B4,  t: 2.50 * b, d: 0.22 },
        { f: N.A4,  t: 3.00 * b, d: 0.20 },
        { f: N.Fs4, t: 3.50 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.24));
    } else if (bar === 3) {
      // Building roll
      this.playPianoNote(N.A2, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.B2, barStart + 2.0 * b, b * 0.8, 0.26, true);

      const roll = [
        { f: N.B4, t: 0.00 * b, d: 0.16 },
        { f: N.B4, t: 0.50 * b, d: 0.16 },
        { f: N.B4, t: 1.00 * b, d: 0.16 },
        { f: N.B4, t: 1.50 * b, d: 0.16 },
        { f: N.B4, t: 2.00 * b, d: 0.16 },
        { f: N.B4, t: 2.50 * b, d: 0.16 },
        { f: N.C5, t: 3.00 * b, d: 0.20 },
        { f: N.D5, t: 3.50 * b, d: 0.25 }
      ];
      roll.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.25));
    } else if (bar === 4) {
      // Chorus Drop: "Hit you with that DDU-DU DDU-DU DU!"
      this.playPianoNote(N.E2, barStart + 0 * b, b * 0.9, 0.28, true);
      this.playPianoNote(N.B2, barStart + 0 * b, b * 0.7, 0.20);
      this.playPianoNote(N.E2, barStart + 2.5 * b, b * 0.6, 0.24, true);

      const notes = [
        { f: N.E5, t: 0.00 * b, d: 0.18 },
        { f: N.E5, t: 0.40 * b, d: 0.18 },
        { f: N.E5, t: 0.80 * b, d: 0.18 },
        { f: N.D5, t: 1.20 * b, d: 0.20 },
        { f: N.B4, t: 1.60 * b, d: 0.22 },
        { f: N.G4, t: 2.00 * b, d: 0.20 },
        { f: N.A4, t: 2.50 * b, d: 0.22 },
        { f: N.B4, t: 3.00 * b, d: 0.25 },
        { f: N.E4, t: 3.50 * b, d: 0.28 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    } else if (bar === 5) {
      // "Ah yeah, ay yeah!"
      this.playPianoNote(N.C2, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.D2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.G5,  t: 0.00 * b, d: 0.25 },
        { f: N.Fs5, t: 0.50 * b, d: 0.22 },
        { f: N.E5,  t: 1.00 * b, d: 0.28 },
        { f: N.B4,  t: 1.50 * b, d: 0.22 },
        { f: N.G5,  t: 2.25 * b, d: 0.25 },
        { f: N.Fs5, t: 2.75 * b, d: 0.22 },
        { f: N.E5,  t: 3.25 * b, d: 0.35 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    } else if (bar === 6) {
      // Second Hook: "Hit you with that DDU-DU DDU-DU DU!"
      this.playPianoNote(N.E2, barStart + 0 * b, b * 0.9, 0.28, true);
      this.playPianoNote(N.E2, barStart + 2.5 * b, b * 0.6, 0.24, true);

      const notes = [
        { f: N.E5, t: 0.00 * b, d: 0.18 },
        { f: N.E5, t: 0.40 * b, d: 0.18 },
        { f: N.E5, t: 0.80 * b, d: 0.18 },
        { f: N.D5, t: 1.20 * b, d: 0.20 },
        { f: N.B4, t: 1.60 * b, d: 0.22 },
        { f: N.G4, t: 2.00 * b, d: 0.20 },
        { f: N.A4, t: 2.50 * b, d: 0.22 },
        { f: N.B4, t: 3.00 * b, d: 0.25 },
        { f: N.E4, t: 3.50 * b, d: 0.28 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    } else if (bar === 7) {
      // "Hot like fire!"
      this.playPianoNote(N.G2, barStart + 0 * b, b * 0.8, 0.24, true);
      this.playPianoNote(N.B2, barStart + 2.0 * b, b * 0.8, 0.26, true);

      const notes = [
        { f: N.B4, t: 0.00 * b, d: 0.18 },
        { f: N.B4, t: 0.40 * b, d: 0.18 },
        { f: N.A4, t: 0.80 * b, d: 0.20 },
        { f: N.G4, t: 1.20 * b, d: 0.20 },
        { f: N.E4, t: 1.60 * b, d: 0.25 },
        { f: N.G4, t: 2.20 * b, d: 0.22 },
        { f: N.A4, t: 2.70 * b, d: 0.22 },
        { f: N.G4, t: 3.20 * b, d: 0.22 },
        { f: N.E4, t: 3.60 * b, d: 0.32 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    }
  }

  // =========================================================================
  // SONG 4: BLACKPINK - "HOW YOU LIKE THAT" (Dramatic Arabic Lead & Drop)
  // =========================================================================
  scheduleHowYouLikeThatBar(barStart, bar) {
    const b = this.beatDuration;

    this.playChiptuneDrum('kick', barStart + 0 * b, 0.16);
    this.playChiptuneDrum('snare', barStart + 1 * b, 0.13);
    this.playChiptuneDrum('kick', barStart + 2.5 * b, 0.15);
    this.playChiptuneDrum('snare', barStart + 3 * b, 0.13);
    this.playChiptuneDrum('hat', barStart + 0.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 1.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 2.0 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 3.5 * b, 0.07);

    if (bar === 0) {
      // "Look at you now look at me"
      this.playPianoNote(N.B1, barStart + 0 * b, b * 0.9, 0.25, true);
      this.playPianoNote(N.B1, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.Fs4, t: 0.00 * b, d: 0.20 },
        { f: N.Fs4, t: 0.40 * b, d: 0.20 },
        { f: N.Fs4, t: 0.80 * b, d: 0.20 },
        { f: N.A4,  t: 1.20 * b, d: 0.22 },
        { f: N.B4,  t: 1.60 * b, d: 0.25 },
        { f: N.Cs5, t: 2.20 * b, d: 0.25 },
        { f: N.B4,  t: 3.00 * b, d: 0.32 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.24));
    } else if (bar === 1) {
      this.playPianoNote(N.G1, barStart + 0 * b, b * 0.9, 0.25, true);
      this.playPianoNote(N.G1, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.Fs4, t: 0.00 * b, d: 0.20 },
        { f: N.Fs4, t: 0.40 * b, d: 0.20 },
        { f: N.Fs4, t: 0.80 * b, d: 0.20 },
        { f: N.A4,  t: 1.20 * b, d: 0.22 },
        { f: N.B4,  t: 1.60 * b, d: 0.22 },
        { f: N.Cs5, t: 2.00 * b, d: 0.22 },
        { f: N.D5,  t: 2.50 * b, d: 0.25 },
        { f: N.Cs5, t: 3.00 * b, d: 0.22 },
        { f: N.B4,  t: 3.50 * b, d: 0.28 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.24));
    } else if (bar === 2) {
      this.playPianoNote(N.E2, barStart + 0 * b, b * 0.9, 0.25, true);
      this.playPianoNote(N.E2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.B4,  t: 0.00 * b, d: 0.22 },
        { f: N.Cs5, t: 0.50 * b, d: 0.22 },
        { f: N.D5,  t: 1.00 * b, d: 0.25 },
        { f: N.E5,  t: 1.50 * b, d: 0.25 },
        { f: N.Fs5, t: 2.00 * b, d: 0.28 },
        { f: N.E5,  t: 2.50 * b, d: 0.22 },
        { f: N.D5,  t: 3.00 * b, d: 0.22 },
        { f: N.Cs5, t: 3.50 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.24));
    } else if (bar === 3) {
      this.playPianoNote(N.Fs1, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.Fs2, barStart + 2.0 * b, b * 0.6, 0.24, true);

      const notes = [
        { f: N.D5,  t: 0.00 * b, d: 0.22 },
        { f: N.Cs5, t: 0.50 * b, d: 0.22 },
        { f: N.B4,  t: 1.00 * b, d: 0.25 },
        { f: N.A4,  t: 1.50 * b, d: 0.22 },
        { f: N.B4,  t: 2.00 * b, d: 0.25 },
        { f: N.Cs5, t: 2.70 * b, d: 0.25 },
        { f: N.B4,  t: 3.30 * b, d: 0.35 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.24));
    } else if (bar === 4) {
      // Chorus Drop: "Ha! How you like that!"
      this.playPianoNote(N.B1,  barStart + 0 * b, b * 0.9, 0.28, true);
      this.playPianoNote(N.Fs2, barStart + 0 * b, b * 0.7, 0.20);
      this.playPianoNote(N.B1,  barStart + 2.5 * b, b * 0.6, 0.24, true);

      const notes = [
        { f: N.Fs5, t: 0.00 * b, d: 0.22 },
        { f: N.D5,  t: 0.50 * b, d: 0.22 },
        { f: N.Cs5, t: 1.00 * b, d: 0.22 },
        { f: N.B4,  t: 1.50 * b, d: 0.25 },
        { f: N.Fs4, t: 2.00 * b, d: 0.22 },
        { f: N.B4,  t: 2.50 * b, d: 0.25 },
        { f: N.D5,  t: 3.00 * b, d: 0.25 },
        { f: N.Cs5, t: 3.50 * b, d: 0.28 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    } else if (bar === 5) {
      // "You gon' like that that that that"
      this.playPianoNote(N.G1, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.G1, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.B4,  t: 0.00 * b, d: 0.18 },
        { f: N.B4,  t: 0.40 * b, d: 0.18 },
        { f: N.B4,  t: 0.80 * b, d: 0.18 },
        { f: N.A4,  t: 1.20 * b, d: 0.20 },
        { f: N.B4,  t: 1.60 * b, d: 0.22 },
        { f: N.D5,  t: 2.20 * b, d: 0.25 },
        { f: N.Cs5, t: 2.80 * b, d: 0.25 },
        { f: N.B4,  t: 3.30 * b, d: 0.30 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    } else if (bar === 6) {
      this.playPianoNote(N.E2, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.E2, barStart + 2.5 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.Fs5, t: 0.00 * b, d: 0.22 },
        { f: N.D5,  t: 0.50 * b, d: 0.22 },
        { f: N.Cs5, t: 1.00 * b, d: 0.22 },
        { f: N.B4,  t: 1.50 * b, d: 0.25 },
        { f: N.Fs4, t: 2.00 * b, d: 0.22 },
        { f: N.B4,  t: 2.50 * b, d: 0.25 },
        { f: N.D5,  t: 3.00 * b, d: 0.25 },
        { f: N.Cs5, t: 3.50 * b, d: 0.28 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    } else if (bar === 7) {
      // "Badabing badaboom boom boom"
      this.playPianoNote(N.Fs1, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.Fs2, barStart + 2.0 * b, b * 0.7, 0.24, true);

      const notes = [
        { f: N.B4,  t: 0.00 * b, d: 0.16 },
        { f: N.B4,  t: 0.35 * b, d: 0.16 },
        { f: N.B4,  t: 0.70 * b, d: 0.16 },
        { f: N.A4,  t: 1.00 * b, d: 0.20 },
        { f: N.B4,  t: 1.40 * b, d: 0.22 },
        { f: N.D5,  t: 1.80 * b, d: 0.25 },
        { f: N.Fs5, t: 2.30 * b, d: 0.28 },
        { f: N.E5,  t: 2.80 * b, d: 0.25 },
        { f: N.D5,  t: 3.30 * b, d: 0.25 },
        { f: N.B4,  t: 3.70 * b, d: 0.35 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    }
  }

  // =========================================================================
  // SONG 5: BLACKPINK - "KILL THIS LOVE" (Grand Brass & Marching Piano)
  // =========================================================================
  scheduleKillThisLoveBar(barStart, bar) {
    const b = this.beatDuration;

    this.playChiptuneDrum('kick', barStart + 0 * b, 0.17);
    this.playChiptuneDrum('snare', barStart + 1 * b, 0.13);
    this.playChiptuneDrum('kick', barStart + 2 * b, 0.16);
    this.playChiptuneDrum('snare', barStart + 3 * b, 0.14);
    this.playChiptuneDrum('hat', barStart + 0.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 1.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 2.5 * b, 0.07);
    this.playChiptuneDrum('hat', barStart + 3.5 * b, 0.07);

    if (bar === 0) {
      // Fanfare Phrase 1
      this.playPianoNote(N.C2, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.C2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.C5,  t: 0.00 * b, d: 0.22 },
        { f: N.C5,  t: 0.50 * b, d: 0.20 },
        { f: N.Eb5, t: 1.00 * b, d: 0.25 },
        { f: N.G5,  t: 1.50 * b, d: 0.28 },
        { f: N.F5,  t: 2.00 * b, d: 0.25 },
        { f: N.Eb5, t: 2.50 * b, d: 0.22 },
        { f: N.D5,  t: 3.00 * b, d: 0.22 },
        { f: N.C5,  t: 3.50 * b, d: 0.28 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    } else if (bar === 1) {
      // Fanfare Phrase 2
      this.playPianoNote(N.Ab1, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.Ab1, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.C5,  t: 0.00 * b, d: 0.22 },
        { f: N.Eb5, t: 0.50 * b, d: 0.22 },
        { f: N.G5,  t: 1.00 * b, d: 0.25 },
        { f: N.Ab5, t: 1.50 * b, d: 0.30 },
        { f: N.G5,  t: 2.00 * b, d: 0.25 },
        { f: N.F5,  t: 2.50 * b, d: 0.22 },
        { f: N.Eb5, t: 3.00 * b, d: 0.22 },
        { f: N.D5,  t: 3.50 * b, d: 0.25 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    } else if (bar === 2) {
      // Fanfare Phrase 3
      this.playPianoNote(N.Eb2, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.Eb2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.C5,  t: 0.00 * b, d: 0.22 },
        { f: N.C5,  t: 0.50 * b, d: 0.20 },
        { f: N.Eb5, t: 1.00 * b, d: 0.25 },
        { f: N.G5,  t: 1.50 * b, d: 0.28 },
        { f: N.F5,  t: 2.00 * b, d: 0.25 },
        { f: N.Eb5, t: 2.50 * b, d: 0.22 },
        { f: N.D5,  t: 3.00 * b, d: 0.22 },
        { f: N.C5,  t: 3.50 * b, d: 0.28 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.26));
    } else if (bar === 3) {
      // Fanfare Flourish
      this.playPianoNote(N.Bb1, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.Bb1, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.G4,  t: 0.00 * b, d: 0.22 },
        { f: N.C5,  t: 0.50 * b, d: 0.22 },
        { f: N.Eb5, t: 1.00 * b, d: 0.25 },
        { f: N.G5,  t: 1.50 * b, d: 0.28 },
        { f: N.C6,  t: 2.00 * b, d: 0.35 },
        { f: N.Bb5, t: 2.50 * b, d: 0.25 },
        { f: N.G5,  t: 3.00 * b, d: 0.22 },
        { f: N.F5,  t: 3.50 * b, d: 0.28 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    } else if (bar === 4) {
      // Chorus: "Let's kill this love!"
      this.playPianoNote(N.C2, barStart + 0 * b, b * 0.9, 0.28, true);
      this.playPianoNote(N.G2, barStart + 0 * b, b * 0.7, 0.20);
      this.playPianoNote(N.C2, barStart + 2.0 * b, b * 0.6, 0.24, true);

      const notes = [
        { f: N.G5,  t: 0.00 * b, d: 0.25 },
        { f: N.G5,  t: 0.50 * b, d: 0.22 },
        { f: N.F5,  t: 1.00 * b, d: 0.25 },
        { f: N.Eb5, t: 1.50 * b, d: 0.25 },
        { f: N.C5,  t: 2.00 * b, d: 0.22 },
        { f: N.C5,  t: 2.50 * b, d: 0.22 },
        { f: N.Eb5, t: 3.00 * b, d: 0.25 },
        { f: N.G5,  t: 3.50 * b, d: 0.30 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    } else if (bar === 5) {
      // March: "Rum, pum, pum, pum, pum, pum, pum!"
      this.playPianoNote(N.Ab1, barStart + 0 * b, b * 0.9, 0.28, true);
      this.playPianoNote(N.Ab1, barStart + 2.0 * b, b * 0.7, 0.24, true);

      const march = [
        { f: N.C5,  t: 0.00 * b, d: 0.16 },
        { f: N.C5,  t: 0.35 * b, d: 0.16 },
        { f: N.C5,  t: 0.70 * b, d: 0.16 },
        { f: N.C5,  t: 1.05 * b, d: 0.16 },
        { f: N.C5,  t: 1.40 * b, d: 0.16 },
        { f: N.C5,  t: 1.75 * b, d: 0.16 },
        { f: N.C5,  t: 2.10 * b, d: 0.20 },
        { f: N.Eb5, t: 2.80 * b, d: 0.25 },
        { f: N.F5,  t: 3.40 * b, d: 0.30 }
      ];
      march.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    } else if (bar === 6) {
      // "Feelin' like a sinner"
      this.playPianoNote(N.Eb2, barStart + 0 * b, b * 0.9, 0.26, true);
      this.playPianoNote(N.Eb2, barStart + 2.0 * b, b * 0.6, 0.22, true);

      const notes = [
        { f: N.Eb5, t: 0.00 * b, d: 0.22 },
        { f: N.D5,  t: 0.50 * b, d: 0.22 },
        { f: N.C5,  t: 1.00 * b, d: 0.25 },
        { f: N.Bb4, t: 1.50 * b, d: 0.25 },
        { f: N.C5,  t: 2.00 * b, d: 0.22 },
        { f: N.Eb5, t: 2.50 * b, d: 0.25 },
        { f: N.D5,  t: 3.00 * b, d: 0.22 },
        { f: N.C5,  t: 3.50 * b, d: 0.28 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.25));
    } else if (bar === 7) {
      // Climax Finale: "Let's kill this love!"
      this.playPianoNote(N.G1, barStart + 0 * b, b * 0.9, 0.28, true);
      this.playPianoNote(N.G2, barStart + 2.0 * b, b * 0.8, 0.26, true);

      const notes = [
        { f: N.G5,  t: 0.00 * b, d: 0.25 },
        { f: N.G5,  t: 0.50 * b, d: 0.22 },
        { f: N.F5,  t: 1.00 * b, d: 0.25 },
        { f: N.Eb5, t: 1.50 * b, d: 0.25 },
        { f: N.D5,  t: 2.00 * b, d: 0.25 },
        { f: N.C5,  t: 2.50 * b, d: 0.30 },
        { f: N.C5,  t: 3.20 * b, d: 0.40 }
      ];
      notes.forEach(n => this.playPianoNote(n.f, barStart + n.t, n.d, 0.27));
    }
  }

  // =========================================================================
  // FOOTSTEPS, HAPPY WIN EFFECT, AND VICTORY FANFARE
  // =========================================================================

  playFootstep(isStone = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    if (now - this.lastFootstepTime < 0.26) return;
    this.lastFootstepTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = isStone ? 'triangle' : 'sine';
    const baseFreq = isStone ? 125 + Math.random() * 25 : 80 + Math.random() * 20;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isStone ? 850 : 450, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playEnvelopeCollect(count = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const transpositions = [0, 2, 4, 7, 12];
    const trans = transpositions[Math.min(count - 1, transpositions.length - 1)];

    const noteFreq = (semitones) => 523.25 * Math.pow(2, (semitones + trans) / 12);

    // 1. Ascending sparkle arpeggio
    const arpeggio = [
      { semitones: 0,  time: 0.00, dur: 0.12 },
      { semitones: 4,  time: 0.06, dur: 0.12 },
      { semitones: 7,  time: 0.12, dur: 0.14 },
      { semitones: 12, time: 0.18, dur: 0.18 },
      { semitones: 16, time: 0.24, dur: 0.35 }
    ];

    arpeggio.forEach(n => {
      const f = noteFreq(n.semitones);
      const noteTime = now + n.time;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, noteTime);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(f * 1.5, noteTime);
      filter.Q.setValueAtTime(2.5, noteTime);

      gain.gain.setValueAtTime(0.28, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + n.dur + 0.02);

      // Octave shimmer
      const spark = this.ctx.createOscillator();
      const sparkGain = this.ctx.createGain();
      spark.type = 'sine';
      spark.frequency.setValueAtTime(f * 2, noteTime);
      sparkGain.gain.setValueAtTime(0.14, noteTime);
      sparkGain.gain.exponentialRampToValueAtTime(0.001, noteTime + n.dur * 0.7);

      spark.connect(sparkGain);
      sparkGain.connect(this.sfxGain);
      spark.start(noteTime);
      spark.stop(noteTime + n.dur * 0.7 + 0.02);
    });

    // 2. Celebratory Major Triad Chord Punch
    const chordTime = now + 0.28;
    const chordDuration = 0.55;
    const chordNotes = [0, 4, 7, 12];

    chordNotes.forEach((semi, idx) => {
      const f = noteFreq(semi);
      const chordOsc = this.ctx.createOscillator();
      const chordGain = this.ctx.createGain();

      chordOsc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      chordOsc.frequency.setValueAtTime(f, chordTime);

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(6.0, chordTime);
      lfoGain.gain.setValueAtTime(4.0, chordTime);
      lfo.connect(chordOsc.frequency);
      lfo.start(chordTime);
      lfo.stop(chordTime + chordDuration);

      chordGain.gain.setValueAtTime(0.18, chordTime);
      chordGain.gain.exponentialRampToValueAtTime(0.001, chordTime + chordDuration);

      chordOsc.connect(chordGain);
      chordGain.connect(this.sfxGain);
      chordOsc.start(chordTime);
      chordOsc.stop(chordTime + chordDuration + 0.05);
    });

    // 3. Cute bubble pop impact
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(450, now);
    popOsc.frequency.exponentialRampToValueAtTime(950, now + 0.09);

    popGain.gain.setValueAtTime(0.25, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    popOsc.connect(popGain);
    popGain.connect(this.sfxGain);
    popOsc.start(now);
    popOsc.stop(now + 0.1);
  }

  playWinFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    if (this.musicGain) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
      setTimeout(() => {
        if (this.musicGain && this.ctx && !this.muted) {
          this.musicGain.gain.linearRampToValueAtTime(0.24, this.ctx.currentTime + 0.5);
        }
      }, 3500);
    }

    const notes = [
      { f: 523.25, t: 0.00, d: 0.15 }, // C5
      { f: 659.25, t: 0.15, d: 0.15 }, // E5
      { f: 783.99, t: 0.30, d: 0.15 }, // G5
      { f: 1046.50, t: 0.45, d: 0.35 }, // C6
      { f: 880.00, t: 0.70, d: 0.15 }, // A5
      { f: 1046.50, t: 0.85, d: 0.15 }, // C6
      { f: 1174.66, t: 1.00, d: 0.15 }, // D6
      { f: 1318.51, t: 1.15, d: 0.65 }, // E6
      { f: 1567.98, t: 1.80, d: 0.90 }  // G6
    ];

    const now = this.ctx.currentTime + 0.05;

    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.3, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.05);
    });
  }

  playTimeoutSound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const tones = [
      { freq: 440, time: 0.0, dur: 0.18 },
      { freq: 370, time: 0.18, dur: 0.18 },
      { freq: 311, time: 0.36, dur: 0.18 },
      { freq: 233, time: 0.54, dur: 0.45 }
    ];

    tones.forEach(t => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(t.freq, now + t.time);
      gain.gain.setValueAtTime(0.2, now + t.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t.time + t.dur);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + t.time);
      osc.stop(now + t.time + t.dur + 0.05);
    });
  }
}

export const sound = new SoundController();

