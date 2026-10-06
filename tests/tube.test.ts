import { describe, it, expect } from 'vitest';
import { TUBE, TUBE_TYPES, TubeFault, fullDrawer, type TubeType } from '../src/sim/tube';
import { RULES, STARTING_STATE, resolveNight } from '../src/sim/resolver';
import { NIGHT_1, NIGHT_1_AUTO_RUNDOWN } from '../src/data/night1';
import { rng } from '../src/audio/pressings';
import type { NightDef, ShowPerformance } from '../src/sim/types';

const run = (tubeSeconds?: number, night: NightDef = NIGHT_1, extra: NonNullable<ShowPerformance['tubes']> = []) => {
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
      const f = new TubeFault(socket, fullDrawer(), rng(seed));
      expect(f.need).toBe(TUBE_TYPES[socket]);
      expect(f.spares).toHaveLength(TUBE.spares);
      expect(new Set(f.spares).size).toBe(TUBE.spares);
      expect(f.spares.filter((s) => s === f.need)).toHaveLength(1);
    }
  });

  it('does not always put the right spare in the same place', () => {
    const places = new Set(Array.from({ length: 30 }, (_, s) => new TubeFault(2, fullDrawer(), rng(s + 1)).spares.indexOf('5U4')));
    expect(places.size).toBeGreaterThan(1);
  });

  it('kills the program until the right tube is seated and warm', () => {
    const f = new TubeFault(1, fullDrawer(), rng(5));
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
    const f = new TubeFault(1, fullDrawer(), rng(5));
    const wrong = f.spares.findIndex((s) => s !== f.need);
    expect(f.pick(wrong)).toBe('wrong');
    expect(f.pick(f.spares.indexOf(f.need))).toBe('ignored');
    stepFor(f, TUBE.fumbleSeconds + 0.1);
    expect(f.state).toBe('blown');
    expect(f.pick(f.spares.indexOf(f.need))).toBe('right');
    expect(f.wrongPicks).toBe(1);
  });

  it('counts the seconds the program was down, and stops when fixed', () => {
    const f = new TubeFault(0, fullDrawer(), rng(2));
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

const drawer = (counts: Partial<Record<TubeType, number>>): Record<TubeType, number> =>
  Object.fromEntries(TUBE_TYPES.map((t) => [t, counts[t] ?? 0])) as Record<TubeType, number>;

describe('the spares drawer', () => {
  it('only offers types in the drawer, the right one included when there is one', () => {
    for (let seed = 1; seed < 30; seed++) {
      const f = new TubeFault(2, drawer({ '5U4': 1, '807': 2 }), rng(seed));
      expect([...f.spares].sort()).toEqual(['5U4', '807']);
      expect(f.inStock).toBe(true);
      const g = new TubeFault(2, drawer({ '6L6': 1, '807': 1, '6SN7': 1, '866': 3 }), rng(seed));
      expect(g.spares).toHaveLength(TUBE.spares);
      expect(g.spares).not.toContain('5U4');
      expect(g.inStock).toBe(false);
    }
  });

  it('right type in stock: it warms up and is used', () => {
    const f = new TubeFault(2, drawer({ '5U4': 1, '6L6': 1 }), rng(3));
    expect(f.pick(f.spares.indexOf('5U4'))).toBe('right');
    expect(f.used).toBe('5U4');
    stepFor(f, TUBE.warmSeconds + 0.1);
    expect(f.fixed).toBe(true);
  });

  it('wrong type with the right one in stock: a fumble, nothing used', () => {
    const f = new TubeFault(2, drawer({ '5U4': 1, '6L6': 1 }), rng(3));
    expect(f.pick(f.spares.indexOf('6L6'))).toBe('wrong');
    expect(f.state).toBe('fumble');
    expect(f.used).toBeNull();
  });

  it('wrong type with none of the right one: bodged at 60% for the night', () => {
    const f = new TubeFault(2, drawer({ '6L6': 1, '807': 1 }), rng(3));
    expect(f.pick(f.spares.indexOf('807'))).toBe('bodged');
    expect(f.bodged).toBe(true);
    expect(f.settled).toBe(true);
    expect(f.used).toBe('807');
    const down = f.down;
    stepFor(f, 30);
    expect(f.strength).toBe(TUBE.bodgedStrength);
    expect(f.down).toBe(down);
    expect(f.pick(0)).toBe('ignored');
  });

  it('an empty drawer: two seconds of rummaging, then a bodge with nothing used', () => {
    const f = new TubeFault(4, drawer({}), rng(3));
    expect(f.spares).toEqual([]);
    expect(f.state).toBe('fumble');
    expect(f.pick(0)).toBe('ignored');
    stepFor(f, TUBE.emptySeconds - 0.2);
    expect(f.bodged).toBe(false);
    stepFor(f, 0.4);
    expect(f.bodged).toBe(true);
    expect(f.used).toBeNull();
    expect(f.strength).toBe(TUBE.bodgedStrength);
  });

  it('starts every run with one of each', () => {
    expect(STARTING_STATE.spares).toEqual(drawer({ '6L6': 1, '807': 1, '5U4': 1, '6SN7': 1, '866': 1 }));
  });

  it('the resolver takes the used spare out of the drawer', () => {
    const r = run(undefined, NIGHT_1, [{ id: 'n1_tube', seconds: 3, used: '5U4' }]);
    expect(r.after.spares['5U4']).toBe(0);
    expect(r.after.spares['866']).toBe(1);
    expect(r.before.spares['5U4']).toBe(1);
    expect(STARTING_STATE.spares['5U4']).toBe(1);
    expect(run(3).after.spares).toEqual(STARTING_STATE.spares);
  });

  it('a bodge costs listeners and gets its own line, naming the real types', () => {
    const fixed = run(undefined, NIGHT_1, [{ id: 'n1_tube', seconds: 3, used: '5U4' }]);
    const bodged = run(undefined, NIGHT_1, [{ id: 'n1_tube', seconds: 3, used: '807', bodged: true }]);
    const line = bodged.lines.filter((l) => l.rule === 'tube');
    expect(line).toEqual([{
      text: "The 5U4 went and there wasn't another in the drawer. You ran the rest of the night on an 807 and a prayer. Past the breakwater they heard about half of it.",
      tone: 'bad',
      rule: 'tube',
    }]);
    expect(bodged.after.spares['807']).toBe(0);
    // Listeners: -8 for the bodge, and no +credibility for a quick swap.
    expect(bodged.after.listeners - fixed.after.listeners).toBe(RULES.tubeBodged.listeners);
    expect(RULES.tubeBodged.listeners).toBe(-8);
    const empty = run(undefined, NIGHT_1, [{ id: 'n1_tube', seconds: 2, bodged: true }]);
    expect(empty.lines.filter((l) => l.rule === 'tube')[0].text).toContain('drawer was empty');
    expect(empty.after.spares).toEqual(STARTING_STATE.spares);
  });
});
