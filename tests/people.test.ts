import { describe, it, expect } from 'vitest';
import { STARTING_STATE, cloneState, resolveNight } from '../src/sim/resolver';
import { openNight } from '../src/sim/nights';
import { turnIndex, DUMP_DELAY_CHARS } from '../src/sim/calls';
import { eventsOf } from '../src/sim/events';
import { NIGHT_1 } from '../src/data/night1';
import { NIGHT_2 } from '../src/data/night2';
import type { CallRecord, NightDef, TownState } from '../src/sim/types';

const all = (n: NightDef) => n.rundowns.auto.map(() => 1);
const play = (night: NightDef, town: TownState, calls: CallRecord[]) =>
  resolveNight(night, town, { rundown: night.rundowns.auto, signal: all(night), deadAirSeconds: 0, calls });
const chalk = eventsOf(NIGHT_1, 'switchboard')[0].lines.find((l) => l.id === 'call_chalk')!;

describe('people remember the station', () => {
  it('starts with nobody on record, and clones deeply', () => {
    expect(STARTING_STATE.people).toEqual({});
    const a = cloneState({ ...STARTING_STATE, people: { grace: { aired: 1, cut: 0, dumped: 0, ignored: 0 } } });
    const b = cloneState(a);
    b.people.grace!.cut = 5;
    expect(a.people.grace!.cut).toBe(0);
  });

  it('counts each call by result and sets a flag per person', () => {
    const r = play(NIGHT_1, STARTING_STATE, [
      { line: 'call_lottie' },
      { line: 'call_chalk', dumpedAt: turnIndex(chalk) + DUMP_DELAY_CHARS + 5 },
    ]);
    expect(r.after.people.lottie).toEqual({ aired: 1, cut: 0, dumped: 0, ignored: 0 });
    // Dumped too late: it went out, and he was dumped.
    expect(r.after.people.anon).toEqual({ aired: 1, cut: 0, dumped: 1, ignored: 0 });
    expect(r.after.people.grace).toEqual({ aired: 0, cut: 0, dumped: 0, ignored: 1 });
    expect(r.after.flags).toEqual(expect.arrayContaining(['lottie_aired', 'anon_aired', 'anon_dumped', 'grace_ignored']));
    expect(r.after.flags).not.toContain('grace_cut');
    expect(STARTING_STATE.people).toEqual({});
  });

  it('a caller dumped in time is dumped, not aired; one dumped for nothing is cut', () => {
    const r = play(NIGHT_1, STARTING_STATE, [{ line: 'call_chalk', dumpedAt: turnIndex(chalk) + 5 }, { line: 'call_lottie', dumpedAt: 10 }]);
    expect(r.after.people.anon).toEqual({ aired: 0, cut: 0, dumped: 1, ignored: 0 });
    expect(r.after.people.lottie).toEqual({ aired: 0, cut: 1, dumped: 0, ignored: 0 });
    expect(r.after.flags).toEqual(expect.arrayContaining(['anon_dumped', 'lottie_cut']));
    expect(r.after.flags).not.toContain('anon_aired');
  });

  it('Grace cut off on Night 1 and again on Night 2 is cut twice', () => {
    const n1 = play(NIGHT_1, STARTING_STATE, [{ line: 'call_okafor', dumpedAt: 40 }]);
    expect(n1.after.flags).toContain('grace_cut');
    expect(n1.after.flags).not.toContain('grace_cut_2');
    const night2 = openNight(NIGHT_2, n1.after);
    const graceLine = eventsOf(night2, 'switchboard')[0].lines.find((l) => l.person === 'grace')!;
    expect(graceLine.id).toBe('call_grace_angry');
    const n2 = play(night2, n1.after, [{ line: graceLine.id, dumpedAt: 30 }]);
    expect(n2.after.people.grace?.cut).toBe(2);
    expect(n2.after.flags).toEqual(expect.arrayContaining(['grace_cut', 'grace_cut_2', 'n2_grace_cut']));
    expect(n2.after.flags.filter((f) => f === 'grace_cut')).toHaveLength(1);
  });
});
