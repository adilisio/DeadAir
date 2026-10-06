import { describe, it, expect } from 'vitest';
import { parseRun, serializeRun } from '../src/sim/save';
import { STARTING_STATE, cloneState } from '../src/sim/resolver';

describe('save', () => {
  it('round-trips a run', () => {
    const town = cloneState(STARTING_STATE);
    town.morale = 61;
    town.trust.chapel = 72;
    town.flags = ['n1_teddy_found', 'grace_aired'];
    town.people = { grace: { aired: 1, cut: 0, dumped: 0, ignored: 0 } };
    const s = serializeRun({ index: 1, town });
    expect(JSON.parse(s).version).toBe(1);
    expect(parseRun(s)).toEqual({ index: 1, town });
  });

  it('refuses junk', () => {
    for (const s of ['', 'nope', '{', 'null', '[]', '42', '{"version":2,"index":1,"town":{}}', '{"version":1,"town":{}}', '{"version":1,"index":-1,"town":{}}', '{"version":1,"index":1.5,"town":{}}', '{"version":1,"index":1}']) {
      expect(parseRun(s), s).toBeNull();
    }
    expect(parseRun(null)).toBeNull();
  });

  it('fills missing or broken fields from the starting town', () => {
    const r = parseRun(JSON.stringify({ version: 1, index: 1, town: { morale: 70, safety: 'lots', trust: { chapel: 80, netters: null }, flags: ['a', 3, 'b'] } }));
    expect(r).not.toBeNull();
    expect(r!.index).toBe(1);
    expect(r!.town.morale).toBe(70);
    expect(r!.town.safety).toBe(STARTING_STATE.safety);
    expect(r!.town.trust).toEqual({ ...STARTING_STATE.trust, chapel: 80 });
    expect(r!.town.flags).toEqual(['a', 'b']);
    expect(r!.town.people).toEqual({});
  });

  it('keeps only known people with sane counts', () => {
    const r = parseRun(JSON.stringify({ version: 1, index: 0, town: { people: { grace: { cut: 2, aired: 'x' }, nobody: { cut: 1 }, lottie: 7 } } }));
    expect(r!.town.people).toEqual({ grace: { aired: 0, cut: 2, dumped: 0, ignored: 0 } });
  });
});
