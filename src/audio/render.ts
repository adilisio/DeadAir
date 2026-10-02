// Renders a stand-in pressing Score to an AudioBuffer with an OfflineAudioContext.
// Simple synthesized instruments, a small room, and a dull top end like an old record.

import type { PressingStyle } from '../data/records';
import { midiToHz, rng, type Note, type Score } from './pressings';

type Instrument = 'piano' | 'clarinet' | 'cornet' | 'strings' | 'tuba' | 'upright' | 'croon';

const LEAD: Record<PressingStyle, Instrument> = {
  ragtime: 'piano',
  waltz: 'strings',
  blues: 'clarinet',
  march: 'cornet',
  ballad: 'croon',
};

const BASS: Record<PressingStyle, Instrument> = {
  ragtime: 'piano',
  waltz: 'piano',
  blues: 'upright',
  march: 'tuba',
  ballad: 'piano',
};

function noiseBuffer(ctx: BaseAudioContext, seconds: number, seed: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  const d = buf.getChannelData(0);
  const r = rng(seed);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  return buf;
}

function roomImpulse(ctx: BaseAudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 0.9);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const r = rng(99);
  for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 3);
  return buf;
}

function playTone(ctx: BaseAudioContext, out: AudioNode, n: Note, inst: Instrument): void {
  const f = midiToHz(n.midi);
  const t = n.t;
  const env = ctx.createGain();
  env.gain.value = 0;
  env.connect(out);
  const oscs: OscillatorNode[] = [];
  const osc = (type: OscillatorType, freq: number, gain: number) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g);
    oscs.push(o);
    return g;
  };
  const vibrato = (depthHz: number, rate: number) => {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depthHz;
    lfo.connect(g);
    for (const o of oscs) g.connect(o.frequency);
    oscs.push(lfo);
  };

  const v = n.vel;
  let end = t + n.dur;
  switch (inst) {
    case 'piano': {
      osc('triangle', f, 0.6).connect(env);
      osc('sine', f * 2, 0.25).connect(env);
      osc('sine', f * 3, 0.08).connect(env);
      const decay = Math.min(2.5, 0.4 + n.dur * 1.5);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.5 * v, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.15);
      env.gain.exponentialRampToValueAtTime(0.0008, t + decay);
      end = t + decay;
      break;
    }
    case 'upright': {
      osc('sine', f, 0.8).connect(env);
      osc('triangle', f * 2, 0.2).connect(env);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.6 * v, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(0.3, n.dur * 1.1));
      end = t + Math.max(0.3, n.dur * 1.1);
      break;
    }
    case 'clarinet':
    case 'cornet':
    case 'tuba':
    case 'strings':
    case 'croon': {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.connect(env);
      const type: OscillatorType = inst === 'clarinet' ? 'square' : inst === 'croon' ? 'triangle' : 'sawtooth';
      osc(type, f, 0.5).connect(lp);
      if (inst === 'strings' || inst === 'croon') osc(type, f * 1.004, 0.4).connect(lp);
      lp.frequency.value = { clarinet: 1800, cornet: 2600, tuba: 600, strings: 2200, croon: 1400 }[inst];
      lp.Q.value = inst === 'cornet' ? 2 : 0.7;
      if (inst !== 'tuba') vibrato(f * 0.006, inst === 'croon' ? 5 : 5.5);
      const attack = { clarinet: 0.03, cornet: 0.02, tuba: 0.02, strings: 0.09, croon: 0.12 }[inst];
      const level = { clarinet: 0.32, cornet: 0.3, tuba: 0.55, strings: 0.28, croon: 0.4 }[inst] * v;
      const release = inst === 'strings' || inst === 'croon' ? 0.25 : 0.08;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(level, t + attack);
      env.gain.setValueAtTime(level * 0.85, Math.max(t + attack, t + n.dur - 0.02));
      env.gain.linearRampToValueAtTime(0, t + n.dur + release);
      end = t + n.dur + release;
      break;
    }
  }
  for (const o of oscs) {
    o.start(t);
    o.stop(end + 0.05);
  }
}

function playDrum(ctx: BaseAudioContext, out: AudioNode, n: Note, noise: AudioBuffer): void {
  const t = n.t;
  const env = ctx.createGain();
  env.connect(out);
  if (n.midi === 0) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    o.connect(env);
    env.gain.setValueAtTime(0.7 * n.vel, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.start(t);
    o.stop(t + 0.25);
  } else {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 2500;
    src.connect(hp).connect(env);
    env.gain.setValueAtTime(0.35 * n.vel, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.16);
  }
}

export async function renderScore(score: Score, sampleRate = 22050): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(score.seconds * sampleRate), sampleRate);
  const dry = ctx.createGain();
  dry.gain.value = 0.55;
  const room = ctx.createConvolver();
  room.buffer = roomImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.18;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 4800;
  const bus = ctx.createGain();
  bus.connect(dry).connect(tone);
  bus.connect(room).connect(wet).connect(tone);
  tone.connect(ctx.destination);

  const noise = noiseBuffer(ctx, 1, 7);
  for (const n of score.notes) {
    if (n.voice === 'drum') playDrum(ctx, bus, n, noise);
    else playTone(ctx, bus, n, n.voice === 'lead' ? LEAD[score.style] : n.voice === 'bass' ? BASS[score.style] : 'piano');
  }
  return ctx.startRendering();
}
