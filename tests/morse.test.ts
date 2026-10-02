import { describe, it, expect } from 'vitest';
import { MORSE, MorseCopy, chartFor, encode, keyState, passUnits, timeline } from '../src/sim/morse';
import { STARTING_STATE, resolveNight } from '../src/sim/resolver';
import { NIGHT_1, NIGHT_1_AUTO_RUNDOWN } from '../src/data/night1';
import { rng } from '../src/audio/pressings';
import { SHOW_SLOTS, type ShowPerformance } from '../src/sim/types';

const U = 1; // one second per unit keeps the arithmetic readable

describe('Morse', () => {
  it('encodes letters', () => {
    expect(encode('help')).toEqual(['....', '.', '.-..', '.--.']);
    expect(() => encode('h3lp')).toThrow();
    expect(Object.keys(MORSE)).toHaveLength(26);
  });

  it('times a pass: dots 1, dashes 3, gaps 1 / 3 / 7', () => {
    // H 7, gap 3, E 1, gap 3, L 9, gap 3, P 11, word gap 7.
    expect(passUnits('HELP')).toBe(44);
    expect(timeline('E')).toEqual([{ on: true, units: 1, mark: '.' }, { on: false, units: 7 }]);
  });

  it('keys the signal and prints the tape as marks finish', () => {
    expect(keyState('HELP', 0.5, U)).toEqual({ on: true, tape: '' });
    expect(keyState('HELP', 1.5, U)).toEqual({ on: false, tape: '.' });
    // After H and the letter gap begins.
    expect(keyState('HELP', 7.5, U).tape).toBe('.... ');
    // Just before the word gap ends: the whole word is on the tape.
    expect(keyState('HELP', 43.5, U)).toEqual({ on: false, tape: '.... . .-.. .--.' });
  });

  it('loops, clearing the tape each pass', () => {
    expect(keyState('HELP', 44.5, U)).toEqual(keyState('HELP', 0.5, U));
    expect(keyState('HELP', 88 + 7.5, U).tape).toBe('.... ');
  });

  it('copies letter by letter, any case, rejecting wrong ones', () => {
    const c = new MorseCopy('help');
    expect(c.type('h')).toBe('right');
    expect(c.type('X')).toBe('wrong');
    expect(c.typed).toBe('H');
    expect(c.type('1')).toBe('ignored');
    expect(c.type('E')).toBe('right');
    expect(c.type('L')).toBe('right');
    expect(c.type('p')).toBe('done');
    expect(c.done).toBe(true);
    expect(c.type('p')).toBe('ignored');
    expect(c.wrong).toBe(1);
  });

  it('charts the word letters among decoys, alphabetically', () => {
    const chart = chartFor('HELP', rng(4));
    expect(chart).toHaveLength(8);
    expect(new Set(chart).size).toBe(8);
    for (const l of 'HELP') expect(chart).toContain(l);
    expect([...chart].sort()).toEqual(chart);
  });

  it('keeps the tuning keys off the chart as decoys', () => {
    for (let seed = 1; seed < 30; seed++) {
      const chart = chartFor('HELP', rng(seed));
      expect(chart).not.toContain('A');
      expect(chart).not.toContain('D');
    }
    // Unless the word needs them.
    expect(chartFor('DAWN', rng(1))).toEqual(expect.arrayContaining(['A', 'D']));
  });

  it('copying the signal helps the Netters; missing it costs them', () => {
    const p = (morse?: 'decoded' | 'missed'): ShowPerformance => ({ rundown: NIGHT_1_AUTO_RUNDOWN, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls: [], morse });
    const got = resolveNight(NIGHT_1, STARTING_STATE, p('decoded'));
    const lost = resolveNight(NIGHT_1, STARTING_STATE, p('missed'));
    expect(got.after.flags).toContain('n1_shanty_found');
    expect(lost.after.flags).toContain('n1_shanty_adrift');
    expect(got.after.trust.netters).toBeGreaterThan(lost.after.trust.netters);
    expect(resolveNight(NIGHT_1, STARTING_STATE, p()).after.flags.some((f) => f.startsWith('n1_shanty'))).toBe(false);
  });

  it('night 1 keys a real word inside the show', () => {
    const m = NIGHT_1.morse!;
    expect(() => encode(m.word)).not.toThrow();
    expect(m.slot).toBeGreaterThanOrEqual(0);
    expect(m.slot).toBeLessThan(SHOW_SLOTS);
    // At least a few passes before it fades.
    expect(m.seconds).toBeGreaterThan(passUnits(m.word) * 0.16 * 3);
  });
});
