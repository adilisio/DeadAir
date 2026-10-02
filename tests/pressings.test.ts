import { describe, it, expect } from 'vitest';
import { generateScore, rng } from '../src/audio/pressings';
import type { PressingStyle } from '../src/data/records';

const STYLES: PressingStyle[] = ['ragtime', 'waltz', 'blues', 'march', 'ballad'];

describe('stand-in pressings', () => {
  it('rng is deterministic per seed', () => {
    const a = rng(5), b = rng(5), c = rng(6);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
  });

  for (const style of STYLES) {
    it(`${style}: deterministic, in range, roughly the target length`, () => {
      const s1 = generateScore(style, 42, 45);
      expect(generateScore(style, 42, 45)).toEqual(s1);
      expect(s1.seconds).toBeGreaterThan(20);
      expect(s1.seconds).toBeLessThan(75);
      for (const voice of ['lead', 'bass', 'chord'] as const) {
        expect(s1.notes.some((n) => n.voice === voice), voice).toBe(true);
      }
      for (const n of s1.notes) {
        expect(n.t).toBeGreaterThanOrEqual(0);
        expect(n.t + n.dur).toBeLessThanOrEqual(s1.seconds + 1e-6);
        expect(n.dur).toBeGreaterThan(0);
        if (n.voice !== 'drum') expect(n.midi).toBeGreaterThan(30), expect(n.midi).toBeLessThan(100);
      }
    });
  }

  it('different seeds make different tunes', () => {
    const a = generateScore('ragtime', 1, 30).notes.filter((n) => n.voice === 'lead').map((n) => n.midi);
    const b = generateScore('ragtime', 2, 30).notes.filter((n) => n.voice === 'lead').map((n) => n.midi);
    expect(a).not.toEqual(b);
  });
});
