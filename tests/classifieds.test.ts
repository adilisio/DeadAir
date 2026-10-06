import { describe, it, expect, afterEach, vi } from 'vitest';
import { buy, classifiedsFor, canBuy } from '../src/sim/classifieds';
import { STARTING_STATE, cloneState, resolveNight } from '../src/sim/resolver';
import { NIGHTS } from '../src/data/nights';
import { NIGHT_1 } from '../src/data/night1';
import { NIGHT_2 } from '../src/data/night2';
import { resolveRecord } from '../src/data/records';
import { TUBE_TYPES } from '../src/sim/tube';
import { SAVE_KEY, buyClassified, finishNight, resetRun, run, savedRun } from '../src/run';
import { parseRun } from '../src/sim/save';
import type { Classified } from '../src/sim/types';

const spare: Classified = { id: 'c_spare', text: 'a 5U4', cost: 7, gives: { spare: '5U4' } };
const record: Classified = { id: 'c_rec', text: 'a record', cost: 5, gives: { record: 'aint_we_got_fun' } };

describe('classifieds', () => {
  it('buys a spare: chits down, drawer up, and the town passed in untouched', () => {
    const town = cloneState(STARTING_STATE);
    const after = buy(town, spare);
    expect(after).not.toBeNull();
    expect(after!.chits).toBe(town.chits - 7);
    expect(after!.spares['5U4']).toBe(town.spares['5U4'] + 1);
    expect(town.chits).toBe(STARTING_STATE.chits);
    expect(town.spares['5U4']).toBe(1);
  });

  it('buys a record by setting owns_<id>', () => {
    const after = buy(cloneState(STARTING_STATE), record)!;
    expect(after.flags).toContain('owns_aint_we_got_fun');
    expect(after.chits).toBe(STARTING_STATE.chits - 5);
  });

  it('refuses when chits are short or it was already bought', () => {
    expect(buy({ ...cloneState(STARTING_STATE), chits: 6 }, spare)).toBeNull();
    expect(buy({ ...cloneState(STARTING_STATE), chits: 7 }, spare)).not.toBeNull();
    const once = buy(cloneState(STARTING_STATE), spare)!;
    expect(once.chits).toBe(3);
    const rich = { ...once, chits: 50 };
    expect(canBuy(rich, spare)).toBe(false);
    expect(buy(rich, spare)).toBeNull();
    expect(buy({ ...cloneState(STARTING_STATE), flags: ['owns_aint_we_got_fun'] }, record)).toBeNull();
  });

  it('shows only classifieds whose gate is open for the town', () => {
    const night = { ...NIGHT_1, classifieds: [spare, { ...record, gate: { requires: ['n1_lottie_aired'] } }] };
    expect(classifiedsFor(night, cloneState(STARTING_STATE)).map((c) => c.id)).toEqual(['c_spare']);
    expect(classifiedsFor(night, { ...cloneState(STARTING_STATE), flags: ['n1_lottie_aired'] }).map((c) => c.id)).toEqual(['c_spare', 'c_rec']);
    expect(classifiedsFor({ ...NIGHT_1, classifieds: undefined }, STARTING_STATE)).toEqual([]);
  });

  it('Nights 1 and 2 sell the tubes their faults use up, and a record each', () => {
    const gives = (n: typeof NIGHT_1) => (n.classifieds ?? []).map((c) => [c.cost, c.gives]);
    expect(gives(NIGHT_1)).toEqual([[7, { spare: '5U4' }], [5, { record: 'aint_we_got_fun' }]]);
    expect(gives(NIGHT_2)).toEqual([[8, { spare: '866' }], [5, { record: 'tiger_rag' }]]);
  });

  it('every classified gives a real tube or record, costs something, and has a unique id', () => {
    const all = NIGHTS.flatMap((n) => n.classifieds ?? []);
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    for (const c of all) {
      expect(c.cost, c.id).toBeGreaterThan(0);
      expect(Number.isInteger(c.cost), c.id).toBe(true);
      expect(c.text.length, c.id).toBeGreaterThan(10);
      expect(!!c.gives.spare !== !!c.gives.record, `${c.id}: one thing each`).toBe(true);
      if (c.gives.spare) expect(TUBE_TYPES, c.id).toContain(c.gives.spare);
      if (c.gives.record) expect(resolveRecord(c.gives.record), c.id).toBeDefined();
    }
  });
});

describe('buying at dawn', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetRun();
  });

  it('spends from the night\'s result and re-saves it', () => {
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) });
    resetRun();
    expect(buyClassified(spare)).toBe(false); // no night finished yet
    finishNight(resolveNight(run.night, run.town, { rundown: run.night.rundowns.auto, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls: [], tubes: [{ id: 'n1_tube', seconds: 2, used: '5U4' }] }));
    const chits = run.result!.after.chits;
    expect(run.result!.after.spares['5U4']).toBe(0);
    expect(buyClassified(spare)).toBe(true);
    expect(run.result!.after.chits).toBe(chits - 7);
    expect(run.result!.after.spares['5U4']).toBe(1);
    expect(savedRun()?.town).toEqual(run.result!.after);
    expect(parseRun(m.get(SAVE_KEY))?.town.spares['5U4']).toBe(1);
    expect(buyClassified(spare)).toBe(false);
  });
});
