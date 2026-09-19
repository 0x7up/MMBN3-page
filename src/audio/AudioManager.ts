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
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private isMuted: boolean = false;
  private bgmData: BGMData | null = null;
  private isBgmPlaying: boolean = false;
  private bgmStartTime: number = 0;
  private bgmTimerId: number | null = null;

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

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Load BGM notes
    try {
      const resp = await fetch('/assets/bgm_notes.json');
      if (resp.ok) {
        this.bgmData = await resp.json();
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
    this.scheduleNotes();
  }

  private scheduleNotes(): void {
    if (!this.ctx || !this.bgmData || !this.isBgmPlaying || !this.bgmGain) return;

    const scheduleWindow = 4.0; // schedule ahead 4 seconds
    const currentLoopTime = (this.ctx.currentTime - this.bgmStartTime) % this.bgmData.duration;
    const windowEnd = currentLoopTime + scheduleWindow;

    // Filter notes that fall within current window
    for (const note of this.bgmData.notes) {
      if (note.t >= currentLoopTime && note.t < windowEnd) {
        this.playMidiNote(note, this.bgmStartTime + Math.floor((this.ctx.currentTime - this.bgmStartTime) / this.bgmData.duration) * this.bgmData.duration);
      }
    }

    this.bgmTimerId = window.setTimeout(() => this.scheduleNotes(), 2000);
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private playMidiNote(note: NoteEvent, loopBaseTime: number): void {
    if (!this.ctx || !this.bgmGain) return;

    const startTime = loopBaseTime + note.t;
    if (startTime < this.ctx.currentTime - 0.05) return;

    const freq = this.midiToFreq(note.n);
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    // Select waveform based on channel to replicate GBA sound channels:
    // Channel 0/1: Lead Pulse/Square
    // Channel 2: Bass Triangle
    // Channel 9: Percussion Noise/Square
    if (note.c === 2 || note.n < 45) {
      osc.type = 'triangle';
    } else if (note.c === 9) {
      osc.type = 'square';
    } else {
      osc.type = 'square';
    }

    osc.frequency.setValueAtTime(freq, startTime);

    // GBA envelope: quick attack, sustained release
    const peakGain = Math.min(0.25, note.v * 0.2);
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.max(0.04, note.d));

    osc.connect(noteGain);
    noteGain.connect(this.bgmGain);

    try {
      osc.start(startTime);
      osc.stop(startTime + note.d + 0.05);
    } catch {
      // Ignored if scheduled in past
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
