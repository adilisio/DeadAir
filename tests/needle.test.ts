import { describe, it, expect } from 'vitest';
import { NEEDLE, armPosition, lateSkip, needleResult, sweepFor } from '../src/sim/needle';
import { STARTING_STATE, resolveNight } from '../src/sim/resolver';
import { NIGHT_1, NIGHT_1_AUTO_RUNDOWN } from '../src/data/night1';
import { rng } from '../src/audio/pressings';
import type { NeedleResult, ShowPerformance } from '../src/sim/types';

// Auto rundown: records at slots 1, 3 and 5.
function perf(needles: (NeedleResult | null)[]): ShowPerformance {
  return { rundown: NIGHT_1_AUTO_RUNDOWN, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls: [], needles };
}
const run = (p: ShowPerformance) => resolveNight(NIGHT_1, STARTING_STATE, p);

describe('needle drop', () => {
  it('lands clean on the lead-in groove, scratches before it, runs late after it', () => {
    const [g0, g1] = NEEDLE.groove;
    expect(needleResult((g0 + g1) / 2)).toBe('clean');
    expect(needleResult(g0)).toBe('clean');
    expect(needleResult(g1)).toBe('clean');
    expect(needleResult(g0 - 0.01)).toBe('scratch');
    expect(needleResult(0)).toBe('scratch');
    expect(needleResult(g1 + 0.01)).toBe('late');
    expect(needleResult(1)).toBe('scratch'); // never dropped: it hits the label
  });

  it('sweeps from rest to the label in the sweep time', () => {
    expect(armPosition(0, 2)).toBe(0);
    expect(armPosition(1, 2)).toBeCloseTo(0.5);
    expect(armPosition(5, 2)).toBe(1);
  });

  it('picks sweep times in range', () => {
    const r = rng(9);
    for (let i = 0; i < 50; i++) {
      const s = sweepFor(r);
      expect(s).toBeGreaterThanOrEqual(NEEDLE.sweep[0]);
      expect(s).toBeLessThanOrEqual(NEEDLE.sweep[1]);
    }
  });

  it('skips more of the record the later it drops', () => {
    const g1 = NEEDLE.groove[1];
    expect(lateSkip(0.4)).toBe(0);
    expect(lateSkip(g1 + 0.05)).toBeGreaterThan(0);
    expect(lateSkip(0.95)).toBeGreaterThan(lateSkip(g1 + 0.05));
    expect(lateSkip(0.999)).toBeLessThanOrEqual(NEEDLE.maxSkipSeconds);
  });

  it('a scratch on air costs listeners and credibility, and the ledger names the record', () => {
    const clean = run(perf([null, 'clean', null, 'clean', null, 'clean']));
    const scratched = run(perf([null, 'scratch', null, 'clean', null, 'clean']));
    expect(scratched.after.listeners).toBeLessThan(clean.after.listeners);
    expect(scratched.after.credibility).toBeLessThan(clean.after.credibility);
    expect(scratched.lines.some((l) => l.tone === 'bad' && l.text.includes('Nearer My God to Thee'))).toBe(true);
  });

  it('a late drop costs a little, less than a scratch', () => {
    const clean = run(perf([null, 'clean', null, 'clean', null, 'clean']));
    const late = run(perf([null, 'late', null, 'clean', null, 'clean']));
    const scratched = run(perf([null, 'scratch', null, 'clean', null, 'clean']));
    expect(late.after.listeners).toBeLessThan(clean.after.listeners);
    expect(late.after.listeners).toBeGreaterThan(scratched.after.listeners);
  });

  it('notices when every record went down clean', () => {
    const clean = run(perf([null, 'clean', null, 'clean', null, 'clean']));
    expect(clean.lines.some((l) => l.rule === 'needles' && l.tone === 'good')).toBe(true);
    // No needle data (older callers of the resolver): no needle lines at all.
    expect(run({ ...perf([]), needles: undefined }).lines.some((l) => l.rule === 'needles')).toBe(false);
  });
});
