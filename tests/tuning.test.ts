import { describe, it, expect } from 'vitest';
import { Tuning } from '../src/sim/tuning';
import { rng } from '../src/audio/pressings';

function simulate(seconds: number, wind: number, policy: (t: Tuning) => number, dt = 1 / 60, seed = 3) {
  const t = new Tuning(rng(seed));
  let qSum = 0, maxErr = 0;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    qSum += t.step(dt, policy(t), wind);
    maxErr = Math.max(maxErr, Math.abs(t.error));
  }
  return { avgQ: qSum / steps, maxErr };
}

describe('tuning drift', () => {
  it('quality is 1 inside the dead zone and 0 at the edge', () => {
    expect(Tuning.quality(0)).toBe(1);
    expect(Tuning.quality(0.05)).toBe(1);
    expect(Tuning.quality(1)).toBe(0);
    expect(Tuning.quality(-0.5)).toBeGreaterThan(0.4);
  });

  it('drifts away when nobody touches the dial', () => {
    const r = simulate(30, 1, () => 0);
    expect(r.maxErr).toBeGreaterThan(0.4);
  });

  it('a steady hand keeps the signal clean, even in a storm', () => {
    const r = simulate(30, 1.4, (t) => Math.max(-1, Math.min(1, -t.error * 12)));
    expect(r.avgQ).toBeGreaterThan(0.97);
  });

  it('is roughly frame-rate independent', () => {
    const a = simulate(20, 1, () => 0, 1 / 30);
    const b = simulate(20, 1, () => 0, 1 / 120);
    expect(Math.abs(a.maxErr - b.maxErr)).toBeLessThan(0.25);
  });

  it('stays within -1..1', () => {
    const r = simulate(30, 1, () => 1);
    expect(r.maxErr).toBeLessThanOrEqual(1);
  });
});
