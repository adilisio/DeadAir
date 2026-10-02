import { describe, it, expect } from 'vitest';
import { CALM_WIND, STORM_WIND, stormSignal, windForSlot } from '../src/sim/storm';
import { STARTING_STATE, resolveNight } from '../src/sim/resolver';
import { Tuning } from '../src/sim/tuning';
import { rng } from '../src/audio/pressings';
import { NIGHT_1, NIGHT_1_AUTO_RUNDOWN } from '../src/data/night1';
import type { ShowPerformance } from '../src/sim/types';

const storm = NIGHT_1.storm!;

function perf(signal: number[]): ShowPerformance {
  return { rundown: NIGHT_1_AUTO_RUNDOWN, signal, deadAirSeconds: 0, caller: 'declined' };
}

describe('storms', () => {
  it('only blows during the storm slots', () => {
    for (let s = 0; s < 6; s++) {
      expect(windForSlot(NIGHT_1, s)).toBe(storm.slots.includes(s) ? STORM_WIND : CALM_WIND);
    }
  });

  it('averages the signal over the storm slots only', () => {
    const signal = [0, 0, 0, 0, 0, 0];
    for (const s of storm.slots) signal[s] = 0.8;
    expect(stormSignal(storm, signal)).toBeCloseTo(0.8);
  });

  it('reports holding the signal through the storm', () => {
    const r = resolveNight(NIGHT_1, STARTING_STATE, perf([1, 1, 1, 1, 1, 1]));
    expect(r.lines.some((l) => l.text === storm.held.line)).toBe(true);
    expect(r.lines.some((l) => l.text === storm.lost.line)).toBe(false);
  });

  it('reports losing the signal in the storm', () => {
    const lost = [1, 1, 1, 1, 1, 1];
    for (const s of storm.slots) lost[s] = 0.3;
    const r = resolveNight(NIGHT_1, STARTING_STATE, perf(lost));
    expect(r.lines.some((l) => l.text === storm.lost.line)).toBe(true);
  });

  it('a calm transmitter settles back toward 1260 on its own', () => {
    const t = new Tuning(rng(1));
    t.error = 0.5;
    for (let i = 0; i < 600; i++) t.step(1 / 60, 0, CALM_WIND);
    expect(Math.abs(t.error)).toBeLessThan(0.08);
  });
});
