// Stand-in pressings: seeded, procedurally composed tunes in old-record styles.
// Pure functions (no Web Audio) so they can be tested; render.ts turns a Score into sound.
//
// Songs are built AABA from 4-bar phrases so they repeat like real tunes.

import type { PressingStyle } from '../data/records';

export type Voice = 'lead' | 'bass' | 'chord' | 'drum';

export interface Note {
  /** Start time in seconds. */
  t: number;
  dur: number;
  /** MIDI note number. For drums: 0 = kick, 1 = snare/brush. */
  midi: number;
  voice: Voice;
  vel: number;
}

export interface Score {
  style: PressingStyle;
  bpm: number;
  beatsPerBar: number;
  seconds: number;
  notes: Note[];
}

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A chord as semitone offsets from the key root, plus its root offset for the bass. */
interface Chord {
  root: number;
  tones: number[];
}

const MAJ = (r: number): Chord => ({ root: r, tones: [r, r + 4, r + 7] });
const MIN = (r: number): Chord => ({ root: r, tones: [r, r + 3, r + 7] });
const DOM7 = (r: number): Chord => ({ root: r, tones: [r, r + 4, r + 7, r + 10] });

const I = MAJ(0), IV = MAJ(5), V7 = DOM7(7), vi = MIN(9), ii = MIN(2), II7 = DOM7(2), VI7 = DOM7(9);
const I7 = DOM7(0), IV7 = DOM7(5);

interface StyleDef {
  bpm: [number, number];
  beatsPerBar: number;
  swing: number;
  /** Phrase A and B progressions, one chord per bar (4 bars each). */
  a: Chord[];
  b: Chord[];
  /** Melody rhythm options per beat, as subdivisions of the beat. */
  rhythms: number[][];
  leadOctave: number;
  blueNotes: boolean;
  drums: boolean;
  /** 12-bar blues instead of AABA. */
  twelveBar?: boolean;
}

const STYLES: Record<PressingStyle, StyleDef> = {
  ragtime: {
    bpm: [96, 110], beatsPerBar: 2, swing: 0, a: [I, I, V7, V7], b: [II7, II7, V7, I],
    rhythms: [[0.5, 0.5], [0.25, 0.25, 0.5], [0.5, 0.25, 0.25], [0.25, 0.5, 0.25]],
    leadOctave: 72, blueNotes: false, drums: false,
  },
  waltz: {
    bpm: [132, 150], beatsPerBar: 3, swing: 0, a: [I, IV, V7, I], b: [vi, ii, V7, I],
    rhythms: [[1], [1], [0.5, 0.5], [2]],
    leadOctave: 72, blueNotes: false, drums: false,
  },
  blues: {
    bpm: [68, 80], beatsPerBar: 4, swing: 0.62, a: [], b: [],
    rhythms: [[1], [0.5, 0.5], [1.5, 0.5], [2], [0.5, 0.5]],
    leadOctave: 64, blueNotes: true, drums: true, twelveBar: true,
  },
  march: {
    bpm: [112, 120], beatsPerBar: 2, swing: 0, a: [I, I, V7, I], b: [IV, I, V7, I],
    rhythms: [[0.5, 0.5], [0.75, 0.25], [1], [0.5, 0.25, 0.25]],
    leadOctave: 70, blueNotes: false, drums: true,
  },
  ballad: {
    bpm: [64, 72], beatsPerBar: 4, swing: 0, a: [I, vi, IV, V7], b: [IV, I, VI7, ii],
    rhythms: [[2], [1], [1.5, 0.5], [1, 1], [3]],
    leadOctave: 69, blueNotes: false, drums: false,
  },
};

const BLUES_12: Chord[] = [I7, I7, I7, I7, IV7, IV7, I7, I7, V7, IV7, I7, V7];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const BLUES_SCALE = [0, 3, 5, 6, 7, 10];
const KEY_ROOTS = [0, 2, 3, 5, 7, 8, 10]; // C D Eb F G Ab Bb, offsets from C

/** Nearest scale or chord tone to `midi` from `pool` (absolute midi numbers). */
function nearest(pool: number[], midi: number): number {
  return pool.reduce((best, n) => (Math.abs(n - midi) < Math.abs(best - midi) ? n : best), pool[0]);
}

function poolFor(offsets: number[], keyRoot: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (offsets.includes((((m - keyRoot) % 12) + 12) % 12)) out.push(m);
  return out;
}

/** One bar of melody as [beatOffset, beats, midi] triples. */
type Phrase = [number, number, number][][];

function writePhrase(def: StyleDef, chords: Chord[], keyRoot: number, r: () => number): Phrase {
  const lo = def.leadOctave - 7;
  const hi = def.leadOctave + 12;
  const scale = poolFor(def.blueNotes ? BLUES_SCALE : MAJOR_SCALE, keyRoot, lo, hi);
  let pitch = def.leadOctave + keyRoot;
  return chords.map((chord, barIdx) => {
    const chordPool = poolFor(chord.tones.map((t) => ((t % 12) + 12) % 12), keyRoot, lo, hi);
    const bar: [number, number, number][] = [];
    let beat = 0;
    while (beat < def.beatsPerBar - 1e-6) {
      const rhythm = def.rhythms[Math.floor(r() * def.rhythms.length)];
      for (const len of rhythm) {
        if (beat >= def.beatsPerBar - 1e-6) break;
        const strong = Math.abs(beat - Math.round(beat)) < 1e-6;
        const step = Math.round((r() - 0.5) * 6);
        const target = pitch + step;
        pitch = strong ? nearest(chordPool, target) : nearest(scale, target);
        // Last note of the phrase resolves home.
        const isLast = barIdx === chords.length - 1 && beat + len >= def.beatsPerBar - 1e-6;
        if (isLast) pitch = nearest(chordPool, def.leadOctave + keyRoot);
        const dur = Math.min(len, def.beatsPerBar - beat);
        if (r() > 0.08 || strong) bar.push([beat, dur, pitch]);
        beat += len;
      }
    }
    return bar;
  });
}

export function generateScore(style: PressingStyle, seed: number, targetSeconds: number): Score {
  const def = STYLES[style];
  const r = rng(seed);
  const bpm = Math.round(def.bpm[0] + r() * (def.bpm[1] - def.bpm[0]));
  const keyRoot = KEY_ROOTS[Math.floor(r() * KEY_ROOTS.length)];
  const beat = 60 / bpm;

  // Build the form: a list of [chords, phrase] sections.
  const sections: { chords: Chord[]; phrase: Phrase }[] = [];
  if (def.twelveBar) {
    const phrase = writePhrase(def, BLUES_12, keyRoot, r);
    const answer = writePhrase(def, BLUES_12, keyRoot, r);
    sections.push({ chords: BLUES_12, phrase }, { chords: BLUES_12, phrase: answer }, { chords: BLUES_12, phrase });
  } else {
    const A = writePhrase(def, def.a, keyRoot, r);
    const B = writePhrase(def, def.b, keyRoot, r);
    for (const [chords, phrase] of [[def.a, A], [def.a, A], [def.b, B], [def.a, A]] as const) sections.push({ chords, phrase });
  }

  const notes: Note[] = [];
  const barSec = def.beatsPerBar * beat;
  let bars = sections.flatMap((s) => s.chords.map((c, i) => ({ chord: c, melody: s.phrase[i] })));
  // A form longer than the target is cut to whole 4-bar phrases.
  if (bars.length * barSec > targetSeconds) {
    bars = bars.slice(0, Math.max(4, Math.ceil(targetSeconds / barSec / 4) * 4));
  }
  const swingAt = (b: number) => {
    // Swing: push off-beat eighths later.
    const frac = b - Math.floor(b);
    return def.swing > 0 && Math.abs(frac - 0.5) < 1e-6 ? Math.floor(b) + def.swing : b;
  };

  let t0 = 0;
  // Repeat the form until we reach the target length (always at least once).
  while (t0 === 0 || t0 + bars.length * barSec <= targetSeconds + barSec) {
    bars.forEach((bar, i) => {
      const barStart = t0 + i * barSec;
      const root = 36 + keyRoot + bar.chord.root;
      const bass = root < 40 ? root + 12 : root;
      // Accompaniment pattern by style.
      if (def.beatsPerBar === 3) {
        notes.push({ t: barStart, dur: beat * 0.9, midi: bass, voice: 'bass', vel: 0.9 });
        for (const b of [1, 2]) for (const tone of bar.chord.tones) notes.push({ t: barStart + b * beat, dur: beat * 0.5, midi: 60 + keyRoot + tone, voice: 'chord', vel: 0.35 });
      } else if (style === 'ballad') {
        notes.push({ t: barStart, dur: barSec * 0.95, midi: bass, voice: 'bass', vel: 0.7 });
        bar.chord.tones.forEach((tone, k) => notes.push({ t: barStart + k * beat * 0.5 + (k > 2 ? beat : 0), dur: beat * 2, midi: 60 + keyRoot + tone, voice: 'chord', vel: 0.3 }));
        bar.chord.tones.forEach((tone, k) => notes.push({ t: barStart + 2 * beat + k * beat * 0.5, dur: beat * 1.5, midi: 60 + keyRoot + tone, voice: 'chord', vel: 0.25 }));
      } else if (style === 'blues') {
        // Walking bass: root, third, fifth, sixth.
        [0, 4, 7, 9].forEach((off, b) => notes.push({ t: barStart + b * beat, dur: beat * 0.85, midi: bass + off, voice: 'bass', vel: 0.8 }));
        for (const b of [1, 3]) for (const tone of bar.chord.tones) notes.push({ t: barStart + b * beat, dur: beat * 0.4, midi: 60 + keyRoot + tone, voice: 'chord', vel: 0.25 });
      } else {
        // Oom-pah: bass on the beat, chord on the off-beat (ragtime, march).
        for (let b = 0; b < def.beatsPerBar; b++) {
          const alt = b % 2 === 1 ? 7 : 0;
          notes.push({ t: barStart + b * beat, dur: beat * 0.45, midi: bass + alt - (alt ? 12 : 0), voice: 'bass', vel: 0.85 });
          for (const tone of bar.chord.tones) notes.push({ t: barStart + (b + 0.5) * beat, dur: beat * 0.35, midi: 60 + keyRoot + tone, voice: 'chord', vel: 0.32 });
        }
      }
      if (def.drums) {
        for (let b = 0; b < def.beatsPerBar; b++) {
          notes.push({ t: barStart + b * beat, dur: 0.12, midi: b % 2 === 0 ? 0 : 1, voice: 'drum', vel: b % 2 === 0 ? 0.6 : 0.45 });
          if (style === 'march' && r() < 0.35) notes.push({ t: barStart + (b + 0.75) * beat, dur: 0.08, midi: 1, voice: 'drum', vel: 0.3 });
        }
      }
      for (const [off, len, midi] of bar.melody) {
        notes.push({ t: barStart + swingAt(off) * beat, dur: len * beat * 0.92, midi, voice: 'lead', vel: 0.75 + r() * 0.2 });
      }
    });
    t0 += bars.length * barSec;
    if (t0 >= targetSeconds) break;
  }

  // End on a held tonic chord.
  const end = t0;
  for (const tone of [0, 4, 7]) notes.push({ t: end, dur: beat * def.beatsPerBar, midi: 60 + keyRoot + tone, voice: 'chord', vel: 0.35 });
  notes.push({ t: end, dur: beat * def.beatsPerBar, midi: 36 + keyRoot + 12, voice: 'bass', vel: 0.8 });
  notes.push({ t: end, dur: beat * def.beatsPerBar, midi: def.leadOctave + keyRoot, voice: 'lead', vel: 0.8 });

  notes.sort((a, b) => a.t - b.t);
  return { style, bpm, beatsPerBar: def.beatsPerBar, seconds: end + beat * def.beatsPerBar + 1.5, notes };
}

export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
