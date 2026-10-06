import { describe, it, expect } from 'vitest';
import { TUBE, TUBE_TYPES, TubeFault } from '../src/sim/tube';
import { STARTING_STATE, resolveNight } from '../src/sim/resolver';
import { NIGHT_1, NIGHT_1_AUTO_RUNDOWN } from '../src/data/night1';
import { rng } from '../src/audio/pressings';
import type { NightDef, ShowPerformance } from '../src/sim/types';

const run = (tubeSeconds?: number, night: NightDef = NIGHT_1, extra: { id: string; seconds: number }[] = []) => {
  const tubes = [...(tubeSeconds === undefined ? [] : [{ id: 'n1_tube', seconds: tubeSeconds }]), ...extra];
  const p: ShowPerformance = { rundown: NIGHT_1_AUTO_RUNDOWN, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls: [], tubes };
  return resolveNight(night, STARTING_STATE, p);
};

function stepFor(f: TubeFault, seconds: number) {
  for (let t = 0; t < seconds; t += 0.05) f.step(0.05);
}

describe('tube swap', () => {
  it('offers the right spare exactly once among distinct decoys', () => {
    for (let seed = 1; seed < 40; seed++) {
      const socket = seed % TUBE_TYPES.length;
      const f = new TubeFault(socket, rng(seed));
      expect(f.need).toBe(TUBE_TYPES[socket]);
      expect(f.spares).toHaveLength(TUBE.spares);
      expect(new Set(f.spares).size).toBe(TUBE.spares);
      expect(f.spares.filter((s) => s === f.need)).toHaveLength(1);
    }
  });

  it('does not always put the right spare in the same place', () => {
    const places = new Set(Array.from({ length: 30 }, (_, s) => new TubeFault(2, rng(s + 1)).spares.indexOf('5U4')));
    expect(places.size).toBeGreaterThan(1);
  });

  it('kills the program until the right tube is seated and warm', () => {
    const f = new TubeFault(1, rng(5));
    expect(f.strength).toBe(TUBE.downStrength);
    expect(f.pick(f.spares.indexOf(f.need))).toBe('right');
    expect(f.state).toBe('warming');
    stepFor(f, TUBE.warmSeconds / 2);
    expect(f.strength).toBeGreaterThan(TUBE.downStrength);
    expect(f.strength).toBeLessThan(1);
    stepFor(f, TUBE.warmSeconds);
    expect(f.fixed).toBe(true);
    expect(f.strength).toBe(1);
  });

  it('a dud costs a fumble, during which picks are ignored', () => {
    const f = new TubeFault(1, rng(5));
    const wrong = f.spares.findIndex((s) => s !== f.need);
    expect(f.pick(wrong)).toBe('wrong');
    expect(f.pick(f.spares.indexOf(f.need))).toBe('ignored');
    stepFor(f, TUBE.fumbleSeconds + 0.1);
    expect(f.state).toBe('blown');
    expect(f.pick(f.spares.indexOf(f.need))).toBe('right');
    expect(f.wrongPicks).toBe(1);
  });

  it('counts the seconds the program was down, and stops when fixed', () => {
    const f = new TubeFault(0, rng(2));
    stepFor(f, 3);
    f.pick(f.spares.indexOf(f.need));
    stepFor(f, 10);
    expect(f.down).toBeGreaterThan(3 + TUBE.warmSeconds - 0.1);
    expect(f.down).toBeLessThan(3 + TUBE.warmSeconds + 0.2);
  });

  it('the ledger praises a quick swap and reports a slow one', () => {
    const quick = run(2);
    const slow = run(20);
    expect(quick.lines.some((l) => l.rule === 'tube' && l.tone === 'good')).toBe(true);
    expect(slow.lines.some((l) => l.rule === 'tube' && l.tone === 'bad' && l.text.includes('20 seconds'))).toBe(true);
    expect(slow.after.listeners).toBeLessThan(quick.after.listeners);
    expect(run(undefined).lines.some((l) => l.rule === 'tube')).toBe(false);
  });

  it('reports each tube that blew, during its own item', () => {
    const night: NightDef = { ...NIGHT_1, events: [...NIGHT_1.events, { kind: 'tube', id: 'late_tube', at: { slot: 4, frac: 0.5 }, socket: 0 }] };
    const r = run(2, night, [{ id: 'late_tube', seconds: 20 }]);
    const tubeLines = r.lines.filter((l) => l.rule === 'tube');
    expect(tubeLines).toHaveLength(2);
    expect(tubeLines[0].text).toContain('Nearer My God to Thee');
    expect(tubeLines[1].text).toContain('Rotten ice');
    expect(run(2, night).lines.filter((l) => l.rule === 'tube')).toHaveLength(1);
  });
});
