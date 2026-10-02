// Morse under the static. In the small hours a faint signal keys a word over
// and over. The player reads the dots and dashes off the tape against a chart
// and types the letters before the signal fades.

export const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
  J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
};

export const MORSE_TIMING = {
  /** Seconds per unit: a dot is one unit, a dash three. Slow enough to read. */
  unit: 0.16,
  /** Seconds knocked off the clock for each wrong letter (no guessing the alphabet). */
  wrongPenalty: 3,
  chartSize: 8,
};

export interface KeyElement {
  on: boolean;
  units: number;
  /** For key-down elements: what it is. */
  mark?: '.' | '-';
}

export function encode(word: string): string[] {
  return [...word.toUpperCase()].map((ch) => {
    const code = MORSE[ch];
    if (!code) throw new Error(`No Morse for "${ch}"`);
    return code;
  });
}

/** One pass of the word: marks with one-unit gaps, three between letters, seven before it repeats. */
export function timeline(word: string): KeyElement[] {
  const out: KeyElement[] = [];
  encode(word).forEach((code, li) => {
    if (li > 0) out.push({ on: false, units: 3 });
    [...code].forEach((m, mi) => {
      if (mi > 0) out.push({ on: false, units: 1 });
      out.push({ on: true, units: m === '-' ? 3 : 1, mark: m as '.' | '-' });
    });
  });
  out.push({ on: false, units: 7 });
  return out;
}

export function passUnits(word: string): number {
  return timeline(word).reduce((s, e) => s + e.units, 0);
}

/**
 * Is the key down `t` seconds in (looping), and what has the tape printed so far this pass?
 * Marks print when they finish; letters are separated by spaces.
 */
export function keyState(word: string, t: number, unit = MORSE_TIMING.unit): { on: boolean; tape: string } {
  const els = timeline(word);
  const total = els.reduce((s, e) => s + e.units, 0);
  const u = ((t / unit) % total + total) % total;
  let at = 0;
  let tape = '';
  let on = false;
  for (const e of els) {
    const end = at + e.units;
    // A letter gap prints its space as soon as it starts.
    if (!e.on && e.units === 3) tape += ' ';
    if (u < end) {
      on = e.on;
      break;
    }
    if (e.mark) tape += e.mark;
    at = end;
  }
  return { on, tape };
}

/** The player's copy of the word, letter by letter. */
export class MorseCopy {
  typed = '';
  wrong = 0;
  readonly word: string;

  constructor(word: string) {
    this.word = word.toUpperCase();
  }

  get done(): boolean {
    return this.typed === this.word;
  }

  type(ch: string): 'right' | 'wrong' | 'done' | 'ignored' {
    if (this.done || !/^[a-z]$/i.test(ch)) return 'ignored';
    if (ch.toUpperCase() !== this.word[this.typed.length]) {
      this.wrong++;
      return 'wrong';
    }
    this.typed += ch.toUpperCase();
    return this.done ? 'done' : 'right';
  }
}

/**
 * The code chart beside the tape: the word's letters plus decoys, alphabetical.
 * Only chart letters count as guesses, so decoys skip the tuning keys (A, D):
 * riding the dial mid-copy shouldn't cost the player time.
 */
export function chartFor(word: string, rand: () => number, size = MORSE_TIMING.chartSize): string[] {
  const letters = new Set(word.toUpperCase());
  const pool = Object.keys(MORSE).filter((l) => !letters.has(l) && l !== 'A' && l !== 'D');
  while (letters.size < size && pool.length) letters.add(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return [...letters].sort();
}
