// The live sound of the station: one Web Audio graph.
//
//   program sources ─▶ program gain ─▶ radio chain (band-limit, tube drive, comp) ─▶ master
//   static noise + heterodyne whistle + mains hum (driven by tuning error) ──────────▶ master
//   room sfx (switches, phone, needle drop): dry ──────────────────────────────────────▶ master
//
// Browser TTS can't be routed into this graph; see voice.ts.

import { DEBUG } from '../config';
import { resolveRecord, standInFor } from '../data/records';
import { generateScore, rng } from './pressings';
import { renderScore } from './render';

export interface RecordHandle {
  duration: number;
  /** False when a synthesized stand-in played instead of the real record. */
  real: boolean;
  elapsed(): number;
  stop(fadeSeconds?: number): void;
  ended: Promise<void>;
}

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private program!: GainNode;
  private programTone!: BiquadFilterNode;
  private staticGain!: GainNode;
  private whistle!: OscillatorNode;
  private whistleGain!: GainNode;
  private crackleGain!: GainNode;
  private rainGain!: GainNode;
  private noise!: AudioBuffer;
  private cache = new Map<string, Promise<{ buffer: AudioBuffer; real: boolean }>>();
  private duckGain!: GainNode;
  private analyser!: AnalyserNode;
  private levelBuf = new Float32Array(new ArrayBuffer(1024 * 4));

  /** Must be called from a user gesture (click / key) the first time. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = DEBUG.mute ? 0 : 0.8;
    this.master.connect(ctx.destination);

    // Radio chain.
    this.program = ctx.createGain();
    this.duckGain = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 220;
    this.programTone = ctx.createBiquadFilter();
    this.programTone.type = 'lowpass';
    this.programTone.frequency.value = 4000;
    const drive = ctx.createWaveShaper();
    drive.curve = tubeCurve(2.2);
    drive.oversample = '2x';
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4;
    this.program.connect(this.duckGain).connect(hp).connect(this.programTone).connect(drive).connect(comp).connect(this.master);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    comp.connect(this.analyser);

    // Static bed.
    this.noise = makeNoise(ctx, 3);
    const staticSrc = ctx.createBufferSource();
    staticSrc.buffer = this.noise;
    staticSrc.loop = true;
    const staticBand = ctx.createBiquadFilter();
    staticBand.type = 'bandpass';
    staticBand.frequency.value = 2200;
    staticBand.Q.value = 0.4;
    this.staticGain = ctx.createGain();
    this.staticGain.gain.value = 0.025;
    staticSrc.connect(staticBand).connect(this.staticGain).connect(this.master);
    staticSrc.start();

    // Heterodyne whistle when off frequency.
    this.whistle = ctx.createOscillator();
    this.whistle.type = 'sine';
    this.whistleGain = ctx.createGain();
    this.whistleGain.gain.value = 0;
    this.whistle.connect(this.whistleGain).connect(this.master);
    this.whistle.start();

    // Mains hum, very quiet, always there.
    const hum = ctx.createOscillator();
    hum.frequency.value = 60;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.012;
    hum.connect(humGain).connect(this.master);
    hum.start();

    // Record surface crackle: sparse clicks through the program chain.
    const crackle = ctx.createBufferSource();
    crackle.buffer = makeCrackle(ctx, 4);
    crackle.loop = true;
    this.crackleGain = ctx.createGain();
    this.crackleGain.gain.value = 0;
    crackle.connect(this.crackleGain).connect(this.program);
    crackle.start();

    // Rain on the booth window, for storms. Room sound, so it skips the radio chain.
    const rain = ctx.createBufferSource();
    rain.buffer = this.noise;
    rain.loop = true;
    rain.playbackRate.value = 0.7;
    const rainTone = ctx.createBiquadFilter();
    rainTone.type = 'lowpass';
    rainTone.frequency.value = 1600;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(rainTone).connect(this.rainGain).connect(this.master);
    rain.start();
  }

  /** Rain against the window (0 = dry). */
  setRain(level: number): void {
    if (!this.ctx) return;
    this.rainGain.gain.setTargetAtTime(level * 0.09, this.ctx.currentTime, 0.8);
  }

  /** Program loudness 0..1, for the VU meters. */
  level(): number {
    if (!this.ctx) return 0;
    this.analyser.getFloatTimeDomainData(this.levelBuf);
    let sum = 0;
    for (let i = 0; i < this.levelBuf.length; i++) sum += this.levelBuf[i] * this.levelBuf[i];
    return Math.min(1, Math.sqrt(sum / this.levelBuf.length) * 4);
  }

  get ready(): boolean {
    return this.ctx !== null;
  }

  /** error: -1..1 distance from the station's frequency. */
  setTuning(error: number): void {
    if (!this.ctx) return;
    const e = Math.min(1, Math.abs(error));
    const t = this.ctx.currentTime;
    this.staticGain.gain.setTargetAtTime(0.02 + 0.26 * Math.pow(e, 1.3), t, 0.05);
    this.program.gain.setTargetAtTime(1 - 0.75 * Math.pow(e, 1.1), t, 0.05);
    this.programTone.frequency.setTargetAtTime(4000 - 2800 * e, t, 0.05);
    this.whistle.frequency.setTargetAtTime(200 + 2400 * e, t, 0.05);
    this.whistleGain.gain.setTargetAtTime(e > 0.15 ? 0.022 * e : 0, t, 0.05);
  }

  /** Raw static level, for sign-off and the Other Station (0..1). */
  setStatic(level: number): void {
    if (!this.ctx) return;
    this.staticGain.gain.setTargetAtTime(level * 0.3, this.ctx.currentTime, 0.2);
  }

  /** Lower the program while the DJ talks. */
  duck(on: boolean): void {
    if (!this.ctx) return;
    this.duckGain.gain.setTargetAtTime(on ? 0.18 : 1, this.ctx.currentTime, 0.25);
  }

  /** Loads (or synthesizes) a record. `real` is false when a stand-in was used. */
  private bufferFor(recordId: string, seconds: number): Promise<{ buffer: AudioBuffer; real: boolean }> {
    const key = `${recordId}:${seconds}`;
    let p = this.cache.get(key);
    if (!p) {
      const entry = resolveRecord(recordId);
      if (!entry) return Promise.reject(new Error(`No record ${recordId}`));
      const synth = () => {
        const s = standInFor(entry);
        return renderScore(generateScore(s.style, s.seed, seconds)).then((buffer) => ({ buffer, real: false }));
      };
      p = entry.standIn
        ? synth()
        : fetch(`records/${entry.file}`)
            .then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.arrayBuffer();
            })
            .then((b) => this.ctx!.decodeAudioData(b))
            .then((buffer) => ({ buffer, real: true }))
            .catch((e) => {
              console.warn(`Record file records/${entry.file} unavailable (${e}); playing a stand-in. Run: npm run records`);
              return synth();
            });
      this.cache.set(key, p);
    }
    return p;
  }

  /** Pre-render a record so it starts instantly. */
  prepare(recordId: string, seconds: number): void {
    if (this.ctx) void this.bufferFor(recordId, seconds).catch(() => {});
  }

  async playRecord(recordId: string, maxSeconds: number): Promise<RecordHandle> {
    const ctx = this.ctx!;
    const { buffer, real } = await this.bufferFor(recordId, maxSeconds);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    // Wow: a slow wobble in speed, like a warped 78. Real transfers have their own character.
    const wow = ctx.createOscillator();
    wow.frequency.value = 0.55;
    const wowDepth = ctx.createGain();
    wowDepth.gain.value = real ? 0 : 0.004;
    wow.connect(wowDepth).connect(src.playbackRate);
    const gain = ctx.createGain();
    src.connect(gain).connect(this.program);
    const start = ctx.currentTime + 0.05;
    const duration = Math.min(buffer.duration, maxSeconds);
    src.start(start, 0, duration);
    wow.start(start);
    if (duration < buffer.duration) {
      gain.gain.setValueAtTime(1, start + duration - 1.5);
      gain.gain.linearRampToValueAtTime(0, start + duration);
    }
    // Synthetic surface noise only on stand-ins; real 78s bring their own.
    this.crackleGain.gain.setTargetAtTime(real ? 0.06 : 0.35, ctx.currentTime, 0.1);
    this.sfx('needle');

    let resolveEnded!: () => void;
    const ended = new Promise<void>((r) => (resolveEnded = r));
    src.onended = () => {
      wow.stop();
      this.crackleGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      resolveEnded();
    };
    return {
      duration,
      real,
      elapsed: () => Math.max(0, ctx.currentTime - start),
      stop: (fade = 0.6) => {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + fade);
        src.stop(t + fade + 0.02);
      },
      ended,
    };
  }

  /** Short room sounds. */
  sfx(name: 'click' | 'thunk' | 'needle' | 'tune' | 'pickup' | 'hangup' | 'thunder'): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(this.master);
    const noiseBurst = (dur: number, freq: number, level: number) => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      s.connect(f).connect(g);
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.start(t, Math.random() * 2, dur + 0.05);
    };
    switch (name) {
      case 'click': noiseBurst(0.03, 3000, 0.5); break;
      case 'thunk': {
        noiseBurst(0.08, 400, 0.8);
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        o.connect(g);
        o.start(t);
        o.stop(t + 0.12);
        break;
      }
      case 'needle': noiseBurst(0.25, 1200, 0.25); break;
      case 'tune': noiseBurst(0.06, 1800, 0.15); break;
      case 'pickup': noiseBurst(0.12, 700, 0.6); break;
      case 'hangup': noiseBurst(0.1, 500, 0.7); break;
      case 'thunder': {
        // A low rumble that swells and rolls off.
        const s = ctx.createBufferSource();
        s.buffer = this.noise;
        s.playbackRate.value = 0.35;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(260, t);
        f.frequency.exponentialRampToValueAtTime(70, t + 3);
        s.connect(f).connect(g);
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.9, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
        s.start(t, Math.random() * 1.5, 3.3);
        break;
      }
    }
  }

  /** US-style phone ring (440 + 480 Hz, 2 s on, 4 s off), until stopped. */
  ring(): () => void {
    const ctx = this.ctx;
    if (!ctx) return () => {};
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.master);
    const oscs = [440, 480].map((f) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(g);
      o.start();
      return o;
    });
    // Bell-like tremolo.
    const trem = ctx.createOscillator();
    trem.type = 'square';
    trem.frequency.value = 20;
    const tremDepth = ctx.createGain();
    tremDepth.gain.value = 0.04;
    trem.connect(tremDepth).connect(g.gain);
    trem.start();
    const t0 = ctx.currentTime;
    for (let k = 0; k < 20; k++) {
      g.gain.setValueAtTime(0.06, t0 + k * 4);
      g.gain.setValueAtTime(0, t0 + k * 4 + 1.6);
    }
    return () => {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(0, ctx.currentTime);
      for (const o of [...oscs, trem]) o.stop(ctx.currentTime + 0.05);
    };
  }

  /** A low, wrong drone under the Other Station. Returns a stop function. */
  otherStationDrone(): () => void {
    const ctx = this.ctx;
    if (!ctx) return () => {};
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 3);
    g.connect(this.master);
    const oscs = [55, 55 * 1.059, 82.4].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.connect(g);
      o.start();
      return o;
    });
    return () => {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      for (const o of oscs) o.stop(ctx.currentTime + 3);
    };
  }
}

function tubeCurve(drive: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
}

function makeNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  const r = rng(3);
  // Mildly pink: average white noise with a running value.
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = 0.6 * last + 0.4 * (r() * 2 - 1);
    d[i] = last * 1.6;
  }
  return buf;
}

function makeCrackle(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  const r = rng(17);
  for (let i = 0; i < d.length; i++) {
    const p = r();
    if (p < 0.0009) d[i] = (r() * 2 - 1) * 0.9;
    else if (p < 0.004) d[i] = (r() * 2 - 1) * 0.15;
  }
  return buf;
}

export const audio = new AudioEngine();
