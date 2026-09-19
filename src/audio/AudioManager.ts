// Web Audio API chiptune synthesizer and sound effect manager for MMBN3

interface NoteEvent {
  t: number; // start time in seconds
  d: number; // duration in seconds
  n: number; // MIDI note number (0-127)
  v: number; // velocity (0.0 - 1.0)
  c: number; // channel
}

interface BGMData {
  duration: number;
  notes: NoteEvent[];
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private isMuted: boolean = false;
  private bgmData: BGMData | null = null;
  private isBgmPlaying: boolean = false;
  private bgmStartTime: number = 0;
  private bgmTimerId: number | null = null;

  // Monotonic note scheduler cursor to guarantee zero note duplication
  private nextNoteIndex: number = 0;
  private currentLoopCount: number = 0;

  private lastStepTime: number = 0;

  constructor() {
    // Lazy initialize on first interaction
  }

  public async init(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Dynamics compressor to prevent digital clipping and audio distortion
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);
    this.compressor.connect(this.masterGain);

    // BGM bus routed through compressor
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.bgmGain.connect(this.compressor);

    // SFX bus routed directly to master
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Pre-generate white noise buffer for authentic GBA percussion (snare, hi-hats)
    const noiseLength = Math.floor(this.ctx.sampleRate * 1.5);
    this.noiseBuffer = this.ctx.createBuffer(1, noiseLength, this.ctx.sampleRate);
    const noiseData = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    // Load BGM notes and filter duplicate channels
    try {
      const resp = await fetch('/assets/bgm_notes.json');
      if (resp.ok) {
        const raw = await resp.json();
        // Channels in original MIDI:
        // 0: Bass, 1: Lead, 2: Arp, 3: Accent, 9: Drums, 10: Chords
        // Channels 4, 5, 6, 11-15 are identical DAW stereo/chorus clone tracks
        const allowedChannels = new Set([0, 1, 2, 3, 9, 10]);
        const sorted = (raw.notes as NoteEvent[])
          .filter((n) => allowedChannels.has(n.c))
          .sort((a, b) => a.t - b.t);

        // Deduplicate simultaneous identical pitches
        const cleanNotes: NoteEvent[] = [];
        const seen = new Set<string>();
        for (const n of sorted) {
          const timeSlot = Math.round(n.t * 100);
          const key = `${n.c}_${n.n}_${timeSlot}`;
          if (!seen.has(key)) {
            seen.add(key);
            cleanNotes.push(n);
          }
        }

        this.bgmData = {
          duration: raw.duration,
          notes: cleanNotes
        };
        this.startBgmLoop();
      }
    } catch (e) {
      console.warn('Could not load bgm_notes.json, continuing with SFX only:', e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 0.45;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- BGM Playback ---

  private startBgmLoop(): void {
    if (!this.ctx || !this.bgmData || this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.bgmStartTime = this.ctx.currentTime + 0.1;
    this.nextNoteIndex = 0;
    this.currentLoopCount = 0;
    this.scheduleNotes();
  }

  private scheduleNotes(): void {
    if (!this.ctx || !this.bgmData || !this.isBgmPlaying || !this.bgmGain) return;

    // Lookahead of 1.5s with frequent 250ms ticks
    const lookahead = 1.5;
    const scheduleUntil = this.ctx.currentTime + lookahead;

    while (this.isBgmPlaying) {
      if (this.nextNoteIndex < this.bgmData.notes.length) {
        const note = this.bgmData.notes[this.nextNoteIndex];
        const noteStartTime = this.bgmStartTime + this.currentLoopCount * this.bgmData.duration + note.t;

        if (noteStartTime <= scheduleUntil) {
          this.playMidiNote(note, noteStartTime);
          this.nextNoteIndex++;
        } else {
          break;
        }
      } else {
        // Current loop finished, advance to next loop if within window
        const nextLoopStartTime = this.bgmStartTime + (this.currentLoopCount + 1) * this.bgmData.duration;
        if (nextLoopStartTime <= scheduleUntil) {
          this.currentLoopCount++;
          this.nextNoteIndex = 0;
        } else {
          break;
        }
      }
    }

    this.bgmTimerId = window.setTimeout(() => this.scheduleNotes(), 250);
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private playMidiNote(note: NoteEvent, startTime: number): void {
    if (!this.ctx || !this.bgmGain) return;
    if (startTime < this.ctx.currentTime - 0.05) return;

    // 1. Drum / Percussion Channel (GBA Channel 4 / Noise & DirectSound)
    if (note.c === 9) {
      this.playPercussionNote(note, startTime);
      return;
    }

    const freq = this.midiToFreq(note.n);
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    // 2. Chiptune Channel Timbre assignment
    let peakGain = 0.08;
    if (note.c === 0) {
      // Bass: GBA Channel 3 programmable wave (warm triangle)
      osc.type = 'triangle';
      peakGain = Math.min(0.12, note.v * 0.12);
    } else if (note.c === 1) {
      // Lead melody: GBA Channel 1 pulse/square
      osc.type = 'square';
      peakGain = Math.min(0.08, note.v * 0.08);
    } else if (note.c === 2 || note.c === 3) {
      // Arpeggio & Accents: GBA Channel 2 pulse/square
      osc.type = 'square';
      peakGain = Math.min(0.06, note.v * 0.06);
    } else if (note.c === 10) {
      // Pad chords: Soft triangle with lowpass filter
      osc.type = 'triangle';
      peakGain = Math.min(0.035, note.v * 0.035);
    } else {
      osc.type = 'square';
      peakGain = Math.min(0.05, note.v * 0.05);
    }

    osc.frequency.setValueAtTime(freq, startTime);

    // GBA envelope
    const attackTime = note.c === 10 ? 0.04 : 0.01;
    const dur = Math.max(0.04, note.d);

    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(peakGain, startTime + attackTime);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(noteGain);
    noteGain.connect(this.bgmGain);

    try {
      osc.start(startTime);
      osc.stop(startTime + dur + 0.02);
    } catch {
      // Past time safe
    }
  }

  private playPercussionNote(note: NoteEvent, startTime: number): void {
    if (!this.ctx || !this.bgmGain) return;

    if (note.n === 35 || note.n === 36) {
      // Kick: frequency drop sine/triangle
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, startTime);
      osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.08);

      const peak = Math.min(0.16, note.v * 0.16);
      g.gain.setValueAtTime(peak, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

      osc.connect(g);
      g.connect(this.bgmGain);

      try {
        osc.start(startTime);
        osc.stop(startTime + 0.1);
      } catch {}
    } else if (this.noiseBuffer) {
      // Snare / Hi-Hat / Cymbal via filtered white noise
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();

      const isHiHat = note.n === 42 || note.n === 44 || note.n === 46;
      const isSnare = note.n === 38 || note.n === 40;

      if (isHiHat) {
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, startTime);
        const peak = Math.min(0.06, note.v * 0.06);
        g.gain.setValueAtTime(peak, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);
      } else if (isSnare) {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, startTime);
        const peak = Math.min(0.12, note.v * 0.12);
        g.gain.setValueAtTime(peak, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
      } else {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, startTime);
        const peak = Math.min(0.08, note.v * 0.08);
        g.gain.setValueAtTime(peak, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
      }

      noiseSource.connect(filter);
      filter.connect(g);
      g.connect(this.bgmGain);

      try {
        noiseSource.start(startTime);
        noiseSource.stop(startTime + 0.15);
      } catch {}
    }
  }

  // --- Sound Effects ---

  // Classic MMBN Menu Cursor Blip (two-tone quick beep)
  public playCursor(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1760, t + 0.025);

    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.065);
  }

  public playSelect(): void {
    this.playCursor();
  }

  public playBip(): void {
    this.playTextBlip();
  }

  public playDecision(): void {
    this.playConfirm();
  }

  // Classic MMBN Menu Confirm / Jack-In Chime
  public playConfirm(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // Play two rapid harmonious tones
    [
      { freq: 659.25, offset: 0, dur: 0.08 }, // E5
      { freq: 987.77, offset: 0.05, dur: 0.14 } // B5
    ].forEach(({ freq, offset, dur }) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + offset);

      g.gain.setValueAtTime(0.2, t + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(t + offset);
      osc.stop(t + offset + dur + 0.01);
    });
  }

  // Menu Cancel / Window Close sound
  public playCancel(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.095);
  }

  // Typewriter Text Blip for dialog text box
  public playTextBlip(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'triangle';
    // Slight pitch variation for natural typewriter feel
    const freq = 600 + Math.random() * 80;
    osc.frequency.setValueAtTime(freq, t);

    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  // BBS Open Fanfare Chime
  public playBBSOpen(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const offset = idx * 0.045;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + offset);

      g.gain.setValueAtTime(0.22, t + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(t + offset);
      osc.stop(t + offset + 0.2);
    });
  }

  // Footstep cyber step sound
  public playStep(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = performance.now();
    if (now - this.lastStepTime < 180) return;
    this.lastStepTime = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.04);

    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public dispose(): void {
    if (this.bgmTimerId) {
      window.clearTimeout(this.bgmTimerId);
    }
    this.isBgmPlaying = false;
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
