/**
 * AngelLearn - Procedural Web Audio Engine
 * Lightweight, zero-asset, high-fidelity synthesized soundscapes and meditative audio
 */

const MAIN_GAME_BGM_URL =
  '/assets/aistudio/7897dbc4-29bd-4b96-85d1-b9c0fe777b6d_a935f478.mp3';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private isPausedForBreathing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = async () => {
        await this.ensureAudio();
        if (!this.isMuted && !this.isPausedForBreathing) {
          await this.startNatureAmbience();
        }
        if (this.bgmAudio && !this.bgmAudio.paused) {
          ['pointerdown', 'click', 'touchstart', 'keydown'].forEach((ev) =>
            window.removeEventListener(ev, unlock)
          );
        }
      };

      ['pointerdown', 'click', 'touchstart', 'keydown'].forEach((ev) =>
        window.addEventListener(ev, unlock, { passive: true })
      );

      // Pause/resume main soundtrack when tab goes to background/foreground
      document.addEventListener('visibilitychange', () => {
        if (!this.bgmAudio) return;
        if (document.hidden) {
          this.bgmAudio.pause();
        } else if (!this.isMuted && !this.isPausedForBreathing) {
          this.bgmAudio.play().catch(() => {});
        }
      });
    }
  }

  private initMainBgm() {
    if (typeof window === 'undefined' || this.bgmAudio) return;
    try {
      const audio = new Audio(MAIN_GAME_BGM_URL);
      audio.loop = true;
      audio.preload = 'none';
      audio.volume = 0.55;
      this.bgmAudio = audio;
    } catch (err) {
      console.warn('Could not initialize main BGM audio', err);
    }
  }

  public getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async ensureAudio(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('Could not resume audio context', err);
      }
    }
    return this.ctx?.state === 'running';
  }

  private breathingNodes: {
    masterGain: GainNode;
    oscillators: OscillatorNode[];
    lfoOscs: OscillatorNode[];
    filter: BiquadFilterNode;
    noiseSource: AudioBufferSourceNode | null;
    noiseGain: GainNode | null;
    noiseFilter: BiquadFilterNode | null;
    intervalId: ReturnType<typeof setInterval> | null;
    chordTimerId: ReturnType<typeof setInterval> | null;
  } | null = null;

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.breathingNodes && this.ctx) {
      const now = this.ctx.currentTime;
      this.breathingNodes.masterGain.gain.cancelScheduledValues(now);
      this.breathingNodes.masterGain.gain.setValueAtTime(
        this.breathingNodes.masterGain.gain.value || 0.0001,
        now
      );
      this.breathingNodes.masterGain.gain.linearRampToValueAtTime(
        muted ? 0.0001 : 0.38,
        now + 0.4
      );
    }
    this.initMainBgm();
    if (this.bgmAudio) {
      this.bgmAudio.muted = muted;
      if (muted) {
        this.bgmAudio.pause();
      } else if (!this.isPausedForBreathing && !document.hidden) {
        this.bgmAudio.play().catch(() => {});
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    const nextMuted = !this.isMuted;
    this.setMuted(nextMuted);
    return this.isMuted;
  }

  public isBreathingMusicActive(): boolean {
    return this.breathingNodes !== null && !this.isMuted;
  }

  public isNatureAmbienceActive(): boolean {
    return (
      this.bgmAudio !== null &&
      !this.bgmAudio.paused &&
      !this.isPausedForBreathing &&
      !this.isMuted
    );
  }

  /**
   * Generates a 3-second looped pink/soft noise buffer for breath synthesis
   */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      data[i] = (b0 + b1 + b2) * 0.12; // gentle pink noise
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Starts the main game soundtrack (/assets/aistudio/7897dbc4-29bd-4b96-85d1-b9c0fe777b6d_a935f478.mp3)
   */
  public async startNatureAmbience() {
    this.initMainBgm();
    if (!this.bgmAudio || this.isMuted || this.isPausedForBreathing) return;
    this.bgmAudio.muted = false;
    this.bgmAudio.volume = 0.55;
    if (this.bgmAudio.paused) {
      try {
        await this.bgmAudio.play();
      } catch {
        // Will play on next user interaction if blocked by browser autoplay policy
      }
    }
  }

  public stopNatureAmbience() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  /**
   * Continuous generative meditation music for Deep Breathing:
   * 1. Slowly evolving 432Hz warm velvet chord progression (smooth 3.5s crossfades every 10s)
   * 2. Soft, dreamy felt-piano / warm harp harmonic notes with slow 0.3s attack (no sharp clicks)
   * 3. Ultra-soft distant ocean breeze contour synced with Inhale/Exhale
   */
  public async startBreathingMusic() {
    this.stopBreathingMusic();
    await this.ensureAudio();
    const ctx = this.getContext();
    if (!ctx) return;

    // Pause main game soundtrack while breathing meditation is active
    this.isPausedForBreathing = true;
    if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.pause();
    }

    try {
      const now = ctx.currentTime;

      // Master gain with gentle fade-in
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0.0001 : 0.38, now + 1.8);
      masterGain.connect(ctx.destination);

      // Silky warm lowpass filter for the velvet synth pad
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(0.55, now);
      filter.connect(masterGain);

      // Dreamy 432Hz meditative chord progression (warm sub-bass + lush maj9/add9 voicings)
      const chords = [
        // Chord 1: Warm A add9 sanctuary (A2, E3, A3, B3, C#4)
        [108.0, 162.0, 216.0, 243.0, 270.0],
        // Chord 2: Floating F#m9 cloud (F#2, C#3, A3, E4, G#3)
        [144.0, 216.0, 270.0, 324.0, 364.5],
        // Chord 3: Deep Dmaj9 serenity (D3, A3,C#4, E4, F#4)
        [144.0, 216.0, 270.0, 324.0, 388.8],
        // Chord 4: Gentle E6/9 horizon (E2, B2, E3, G#3, C#4)
        [121.5, 182.25, 243.0, 303.75, 364.5],
      ];
      let chordIdx = 0;

      const oscillators: OscillatorNode[] = [];
      const lfoOscs: OscillatorNode[] = [];

      chords[0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        // Pure sine waves for warm, non-buzzy meditation pad
        osc.type = 'sine';
        const detune = (idx - 2) * 2.5;
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detune, now);

        const baseLevel = idx === 0 ? 0.16 : 0.13 / (idx * 0.35 + 1);
        oscGain.gain.setValueAtTime(baseLevel, now);

        // Slow LFO breathing shimmer on each voice
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.08 + idx * 0.015, now);
        lfoGain.gain.setValueAtTime(baseLevel * 0.25, now);
        lfo.connect(lfoGain);
        lfoGain.connect(oscGain.gain);
        lfo.start(now);
        lfoOscs.push(lfo);

        osc.connect(oscGain);
        oscGain.connect(filter);

        osc.start(now);
        oscillators.push(osc);
      });

      // Smoothly glide chord voicings every 10 seconds (one full breath cycle)
      const chordTimerId = setInterval(() => {
        if (!this.breathingNodes || this.isMuted || !this.ctx) return;
        chordIdx = (chordIdx + 1) % chords.length;
        const nextChord = chords[chordIdx];
        const t = this.ctx.currentTime;
        this.breathingNodes.oscillators.forEach((osc, i) => {
          const targetFreq = nextChord[i];
          if (targetFreq) {
            osc.frequency.cancelScheduledValues(t);
            osc.frequency.setValueAtTime(osc.frequency.value || targetFreq, t);
            osc.frequency.exponentialRampToValueAtTime(targetFreq, t + 3.8);
          }
        });
      }, 10000);

      // Ultra-soft velvet breeze for organic breath guidance (never harsh or hissy)
      let noiseSource: AudioBufferSourceNode | null = null;
      let noiseGain: GainNode | null = null;
      let noiseFilter: BiquadFilterNode | null = null;

      try {
        noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.getNoiseBuffer(ctx);
        noiseSource.loop = true;

        noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(280, now);
        noiseFilter.Q.setValueAtTime(0.6, now);

        noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.022, now);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noiseSource.start(now);
      } catch (err) {
        console.warn('Noise breath buffer note', err);
      }

      // Subtle, warm harmonic foundation (melodic cues are triggered in exact sync with each breath phase)
      const intervalId = null;

      this.breathingNodes = {
        masterGain,
        oscillators,
        lfoOscs,
        filter,
        noiseSource,
        noiseGain,
        noiseFilter,
        intervalId,
        chordTimerId,
      };
    } catch (e) {
      console.warn('Audio synthesis fallback', e);
    }
  }

  /**
   * Modulate soundscape warmth smoothly during Inhale vs Exhale
   */
  public updateBreathingPhase(phase: 'inhale' | 'exhale') {
    if (!this.breathingNodes || !this.ctx) return;
    const now = this.ctx.currentTime;
    const { filter, noiseFilter, noiseGain } = this.breathingNodes;

    if (phase === 'inhale') {
      // Gentle luminous opening on Inhale
      if (filter) {
        filter.frequency.cancelScheduledValues(now);
        filter.frequency.setValueAtTime(filter.frequency.value || 360, now);
        filter.frequency.exponentialRampToValueAtTime(560, now + 4.8);
      }
      if (noiseFilter && noiseGain) {
        noiseFilter.frequency.cancelScheduledValues(now);
        noiseFilter.frequency.setValueAtTime(noiseFilter.frequency.value || 240, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(410, now + 4.8);

        noiseGain.gain.cancelScheduledValues(now);
        noiseGain.gain.setValueAtTime(noiseGain.gain.value || 0.012, now);
        noiseGain.gain.linearRampToValueAtTime(0.032, now + 4.8);
      }
    } else {
      // Deep, grounding calm on Exhale
      if (filter) {
        filter.frequency.cancelScheduledValues(now);
        filter.frequency.setValueAtTime(filter.frequency.value || 560, now);
        filter.frequency.exponentialRampToValueAtTime(340, now + 4.8);
      }
      if (noiseFilter && noiseGain) {
        noiseFilter.frequency.cancelScheduledValues(now);
        noiseFilter.frequency.setValueAtTime(noiseFilter.frequency.value || 410, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(220, now + 4.8);

        noiseGain.gain.cancelScheduledValues(now);
        noiseGain.gain.setValueAtTime(noiseGain.gain.value || 0.032, now);
        noiseGain.gain.linearRampToValueAtTime(0.01, now + 4.8);
      }
    }
  }

  /**
   * Stop breathing music smoothly
   */
  public stopBreathingMusic() {
    this.isPausedForBreathing = false;
    if (this.breathingNodes && this.ctx) {
      try {
        if (this.breathingNodes.intervalId) {
          clearInterval(this.breathingNodes.intervalId);
        }
        if (this.breathingNodes.chordTimerId) {
          clearInterval(this.breathingNodes.chordTimerId);
        }
        const now = this.ctx.currentTime;
        const { masterGain, oscillators, lfoOscs, noiseSource } = this.breathingNodes;

        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value || 0.0001, now);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

        setTimeout(() => {
          oscillators.forEach((o) => {
            try {
              o.stop();
              o.disconnect();
            } catch {}
          });
          lfoOscs.forEach((l) => {
            try {
              l.stop();
              l.disconnect();
            } catch {}
          });
          if (noiseSource) {
            try {
              noiseSource.stop();
              noiseSource.disconnect();
            } catch {}
          }
        }, 700);
      } catch {}
      this.breathingNodes = null;
    }

    // Resume main game soundtrack if unmuted
    if (!this.isMuted && !document.hidden) {
      this.startNatureAmbience();
    }
  }

  /**
   * Soft, soothing test chord (confirms sound is working gently)
   */
  public playTestChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [270, 324, 432].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.14;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.075, start + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 1.9);
    });
  }

  /**
   * Sound for coin collection & reward
   */
  public playCoin() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Watering splash / growth sound
   */
  public playWater() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.2);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Gentle breathing inhale cue (soft, warm ascending harmonic bloom)
   */
  public playInhaleCue() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [216, 324].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.18;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.125, start + 2.2);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 2.5);
    });
  }

  /**
   * Gentle breathing exhale cue (soft, warm descending harmonic release)
   */
  public playExhaleCue() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [324, 243].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.18;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.888, start + 2.2);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 2.5);
    });
  }

  /**
   * VIDEO 1 MECHANISM ("Climb in, slide out"):
   * Plays one of the 3 ascending nasal "sip" inhalations (step 1 -> step 2 -> step 3).
   * Combines a soft airy inhale whoosh with a stepping crystal-bowl harmonic note.
   */
  public playClimbSip(step: 1 | 2 | 3, durationSec: number = 2.2) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Stepping harmonic note (D4 -> F#4 -> A4 in 432Hz tuning)
    const stepFreqs: Record<1 | 2 | 3, number> = {
      1: 288.0,
      2: 360.0,
      3: 432.0,
    };
    const baseFreq = stepFreqs[step];

    const osc = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    const toneGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.97, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + Math.min(0.65, durationSec * 0.45));

    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(baseFreq * 0.5, now);

    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.linearRampToValueAtTime(0.08, now + 0.24);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96);

    osc.connect(toneGain);
    oscSub.connect(toneGain);
    toneGain.connect(ctx.destination);

    osc.start(now);
    oscSub.start(now);
    osc.stop(now + durationSec);
    oscSub.stop(now + durationSec);

    // 2. Soft airy nasal "sip" breath contour
    try {
      const airSource = ctx.createBufferSource();
      airSource.buffer = this.getNoiseBuffer(ctx);
      airSource.loop = true;

      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'bandpass';
      const startFilterFreq = 340 + (step - 1) * 105;
      airFilter.frequency.setValueAtTime(startFilterFreq, now);
      airFilter.frequency.exponentialRampToValueAtTime(
        startFilterFreq + 240,
        now + durationSec * 0.72
      );
      airFilter.Q.setValueAtTime(2.0, now);

      const airGain = ctx.createGain();
      airGain.gain.setValueAtTime(0.0001, now);
      airGain.gain.linearRampToValueAtTime(0.052, now + 0.25);
      airGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.85);

      airSource.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(ctx.destination);

      airSource.start(now);
      airSource.stop(now + durationSec * 0.88);
    } catch {}
  }

  /**
   * VIDEO 1 MECHANISM ("Climb in, slide out"):
   * Plays the long, soothing "slide out" exhalation wave + warm descending chord.
   */
  public playClimbSlideOut(durationSec: number = 5.0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Warm descending harmonic chord gliding down with the slide
    const startChord = [432.0, 324.0, 216.0];
    const endChord = [288.0, 216.0, 144.0];

    startChord.forEach((sFreq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(sFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endChord[idx], now + durationSec * 0.92);

      const peak = idx === 0 ? 0.055 : 0.04;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec);
    });

    // 2. Continuous soft descending breath exhalation wave
    try {
      const airSource = ctx.createBufferSource();
      airSource.buffer = this.getNoiseBuffer(ctx);
      airSource.loop = true;

      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'bandpass';
      airFilter.frequency.setValueAtTime(620, now);
      airFilter.frequency.exponentialRampToValueAtTime(210, now + durationSec * 0.92);
      airFilter.Q.setValueAtTime(1.6, now);

      const airGain = ctx.createGain();
      airGain.gain.setValueAtTime(0.0001, now);
      airGain.gain.linearRampToValueAtTime(0.06, now + 0.35);
      airGain.gain.linearRampToValueAtTime(0.042, now + durationSec * 0.65);
      airGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96);

      airSource.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(ctx.destination);

      airSource.start(now);
      airSource.stop(now + durationSec);
    } catch {}
  }

  /**
   * VIDEO 2 MECHANISM ("Box Breathing 4-4-4-4"):
   * Synchronizes breath wave during Inhale/Exhale and pure singing-bowl sustain during Hold In/Hold Out.
   */
  public playBoxPhaseAudio(
    boxPhase: 'inhale' | 'hold_in' | 'exhale' | 'hold_out',
    durationSec: number = 4.0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (boxPhase === 'inhale') {
      this.updateBreathingPhase('inhale');
      // 4s Ascending airy breath swell + warm rising fifth
      [216.0, 324.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + durationSec * 0.92);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(idx === 0 ? 0.05 : 0.038, now + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + durationSec);
      });

      try {
        const air = ctx.createBufferSource();
        air.buffer = this.getNoiseBuffer(ctx);
        air.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(260, now);
        filter.frequency.exponentialRampToValueAtTime(640, now + durationSec * 0.9);
        filter.Q.setValueAtTime(1.8, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.052, now + durationSec * 0.55);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96);

        air.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        air.start(now);
        air.stop(now + durationSec);
      } catch {}
    } else if (boxPhase === 'hold_in') {
      // Quiet the breath noise during Hold In and strike a luminous 432Hz singing bowl sustain
      if (this.breathingNodes?.noiseGain) {
        this.breathingNodes.noiseGain.gain.cancelScheduledValues(now);
        this.breathingNodes.noiseGain.gain.setValueAtTime(
          this.breathingNodes.noiseGain.gain.value || 0.02,
          now
        );
        this.breathingNodes.noiseGain.gain.linearRampToValueAtTime(0.003, now + 0.3);
      }

      [432.0, 648.0, 216.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const level = idx === 0 ? 0.075 : idx === 1 ? 0.032 : 0.045;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(level, now + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + durationSec);
      });
    } else if (boxPhase === 'exhale') {
      this.updateBreathingPhase('exhale');
      // 4s Descending airy breath release + settling chord
      [360.0, 270.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.78, now + durationSec * 0.92);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(idx === 0 ? 0.05 : 0.038, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + durationSec);
      });

      try {
        const air = ctx.createBufferSource();
        air.buffer = this.getNoiseBuffer(ctx);
        air.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(210, now + durationSec * 0.92);
        filter.Q.setValueAtTime(1.7, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.055, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96);

        air.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        air.start(now);
        air.stop(now + durationSec);
      } catch {}
    } else {
      // Hold Out: Quiet breath noise and strike a deep, grounding 288Hz/144Hz sanctuary bowl sustain
      if (this.breathingNodes?.noiseGain) {
        this.breathingNodes.noiseGain.gain.cancelScheduledValues(now);
        this.breathingNodes.noiseGain.gain.setValueAtTime(
          this.breathingNodes.noiseGain.gain.value || 0.015,
          now
        );
        this.breathingNodes.noiseGain.gain.linearRampToValueAtTime(0.003, now + 0.3);
      }

      [288.0, 432.0, 144.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const level = idx === 0 ? 0.07 : idx === 1 ? 0.035 : 0.05;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(level, now + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + durationSec);
      });
    }
  }

  /**
   * Sparrow chirp & flight
   */
  public playSparrow() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [0, 0.12, 0.22].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const baseFreq = 2200 + idx * 400;
      osc.frequency.setValueAtTime(baseFreq, now + offset);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + offset + 0.05);

      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  /**
   * Card flip click
   */
  public playCardFlip() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Card pair match triumph
   */
  public playCardMatch() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /**
   * Ball tap sound
   */
  public playBallTap() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * General soft button click
   */
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const sound = new SoundEngine();
