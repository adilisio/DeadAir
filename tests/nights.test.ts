import { describe, it, expect } from 'vitest';
import { gateOpen, letterText, linesOpenNow, openNight } from '../src/sim/nights';
import { eventsOf } from '../src/sim/events';
import { STARTING_STATE, cloneState, resolveNight } from '../src/sim/resolver';
import { NIGHT_1 } from '../src/data/night1';
import { NIGHT_2 } from '../src/data/night2';
import { hasNextNight, nextNight, resetRun, run, startNight, townBefore } from '../src/run';
import type { CallLine, NightDef, SwitchboardEvent, TownState } from '../src/sim/types';

const town = (flags: string[] = [], over: Partial<TownState> = {}): TownState => ({ ...cloneState(STARTING_STATE), flags, ...over });
const ids = (flags: string[]) => openNight(NIGHT_2, town(flags)).cards.map((c) => c.id);
const lines = (flags: string[]) => eventsOf(openNight(NIGHT_2, town(flags)), 'switchboard').flatMap((e) => e.lines.map((l) => l.id));

describe('gates', () => {
  it('opens on required flags and closes on excluded ones', () => {
    expect(gateOpen(undefined, [])).toBe(true);
    expect(gateOpen({ requires: ['a'] }, [])).toBe(false);
    expect(gateOpen({ requires: ['a'] }, ['a'])).toBe(true);
    expect(gateOpen({ requires: ['a', 'b'] }, ['a'])).toBe(false);
    expect(gateOpen({ unless: ['a'] }, ['a'])).toBe(false);
    expect(gateOpen({ requires: ['a'], unless: ['b'] }, ['a', 'b'])).toBe(false);
  });

  it('reads stat thresholds, inclusive, when it has the town', () => {
    const t = town([], { morale: 35, trust: { netters: 50, chapel: 70, linemen: 20 } });
    const ctx = { town: t };
    expect(gateOpen({ when: [{ stat: 'morale', min: 35 }] }, [], ctx)).toBe(true);
    expect(gateOpen({ when: [{ stat: 'morale', min: 36 }] }, [], ctx)).toBe(false);
    expect(gateOpen({ when: [{ stat: 'morale', max: 35 }] }, [], ctx)).toBe(true);
    expect(gateOpen({ when: [{ stat: 'morale', max: 34 }] }, [], ctx)).toBe(false);
    expect(gateOpen({ when: [{ stat: 'trust.chapel', min: 65 }] }, [], ctx)).toBe(true);
    expect(gateOpen({ when: [{ stat: 'trust.linemen', min: 65 }] }, [], ctx)).toBe(false);
    expect(gateOpen({ when: [{ stat: 'chits', min: 5, max: 10 }, { stat: 'listeners', min: 100 }] }, [], ctx)).toBe(true);
    expect(gateOpen({ when: [{ stat: 'chits', min: 5, max: 9 }] }, [], ctx)).toBe(false);
    // Flags still count alongside.
    expect(gateOpen({ requires: ['a'], when: [{ stat: 'morale', min: 0 }] }, [], ctx)).toBe(false);
  });

  it('leaves stat thresholds open without a town', () => {
    expect(gateOpen({ when: [{ stat: 'morale', min: 999 }] }, [])).toBe(true);
    expect(gateOpen({ when: [{ stat: 'morale', min: 999 }], requires: ['a'] }, [])).toBe(false);
  });

  it('reads what aired tonight, when it has it', () => {
    const gate = { tonight: { aired: ['news_x'], notAired: ['warn_y'] } };
    expect(gateOpen(gate, [], { airedTonight: ['news_x'] })).toBe(true);
    expect(gateOpen(gate, [], { airedTonight: [] })).toBe(false);
    expect(gateOpen(gate, [], { airedTonight: ['news_x', 'warn_y'] })).toBe(false);
    expect(gateOpen(gate, [])).toBe(true); // at prep nothing has aired yet: left open
  });
});

describe('lines open when the board rings', () => {
  const line = (id: string, gate?: CallLine['gate']): CallLine => ({ ...eventsOf(NIGHT_1, 'switchboard')[0].lines[2], id, gate });
  const board: SwitchboardEvent = {
    kind: 'switchboard', id: 'b', at: { slot: 3 },
    lines: [
      line('always'),
      line('after_wells', { tonight: { aired: ['news_wells'] } }),
      line('no_wells', { tonight: { notAired: ['news_wells'] } }),
      line('low_morale', { when: [{ stat: 'morale', max: 30 }] }),
      line('flagged', { requires: ['f'] }),
    ],
  };
  const open = (t: TownState, aired: string[]) => linesOpenNow(board, t, aired).map((l) => l.id);

  it('re-filters by tonight, stats and flags', () => {
    expect(open(town(), ['news_wells'])).toEqual(['always', 'after_wells']);
    expect(open(town(), [])).toEqual(['always', 'no_wells']);
    expect(open(town(['f'], { morale: 30 }), [])).toEqual(['always', 'no_wells', 'low_morale', 'flagged']);
  });

  it('openNight keeps tonight-gated lines for the board to decide, and drops what stats close', () => {
    const n: NightDef = { ...NIGHT_1, events: [board] };
    expect(eventsOf(openNight(n, town()), 'switchboard')[0].lines.map((l) => l.id)).toEqual(['always', 'after_wells', 'no_wells']);
  });

  it('openNight drops cards whose stat thresholds fail', () => {
    const n: NightDef = { ...NIGHT_1, cards: NIGHT_1.cards.map((c) => (c.id === 'ad_fish' ? { ...c, gate: { when: [{ stat: 'chits', min: 20 }] } } : c)) };
    expect(openNight(n, town()).cards.map((c) => c.id)).not.toContain('ad_fish');
    expect(openNight(n, town([], { chits: 20 })).cards.map((c) => c.id)).toContain('ad_fish');
  });
});

describe('night 2 remembers night 1', () => {
  it('leaves out follow-up cards when nothing set them up', () => {
    const base = ids([]);
    for (const id of ['news_wozniak', 'news_memorial', 'news_agnes']) expect(base).not.toContain(id);
  });

  it('copying the Morse brings the Wozniak brothers back with a tip', () => {
    expect(ids(['n1_shanty_found'])).toContain('news_wozniak');
  });

  it('a lost boat gets a memorial, and a slander that aired gets a reply', () => {
    expect(ids(['n1_boat_lost'])).toContain('news_memorial');
    expect(ids(['n1_slander_aired'])).toContain('news_agnes');
  });

  it('Mrs. Okafor calls to thank the Linemen, or to tell them off', () => {
    expect(lines(['n1_teddy_found'])).toContain('call_grace_thanks');
    expect(lines(['n1_teddy_found'])).not.toContain('call_grace_angry');
    expect(lines([])).toContain('call_grace_angry');
    expect(lines([])).not.toContain('call_grace_thanks');
  });

  it('drops gated cards from the Other Station list too', () => {
    const night = { ...NIGHT_2, otherStation: { ...NIGHT_2.otherStation, prefer: ['news_memorial', 'news_cure'] } };
    expect(openNight(night, town()).otherStation.prefer).toEqual(['news_cure']);
  });

  it('puts the Other Station into the letter', () => {
    expect(letterText(NIGHT_2, 'Hello there.')).toContain('"Hello there."');
  });
});

describe('the run', () => {
  it('carries the town, trust and flags from one night into the next', () => {
    resetRun();
    expect(run.index).toBe(0);
    expect(hasNextNight()).toBe(true);
    const n1 = run.night;
    run.result = resolveNight(n1, run.town, {
      rundown: n1.rundowns.auto,
      signal: [1, 1, 1, 1, 1, 1],
      deadAirSeconds: 0,
      calls: [{ line: 'call_okafor' }],
      morse: [{ id: 'n1_morse', result: 'decoded' }],
    });
    const after = cloneState(run.result.after);
    nextNight();
    expect(run.index).toBe(1);
    expect(run.night.number).toBe(2);
    expect(run.town).toEqual(after);
    expect(run.result).toBeNull();
    // Night 1's choices opened Night 2's content.
    expect(run.night.cards.map((c) => c.id)).toContain('news_wozniak');
    expect(lines(run.town.flags)).toContain('call_grace_thanks');
    expect(hasNextNight()).toBe(false);
    resetRun();
    expect(run.index).toBe(0);
    expect(run.town).toEqual(STARTING_STATE);
  });

  it('builds a plausible town for ?night=2', () => {
    const t = townBefore(1);
    expect(t.flags).toEqual(expect.arrayContaining(['n1_teddy_found', 'n1_shanty_found']));
    expect(townBefore(0)).toEqual(STARTING_STATE);
    startNight(1, t);
    expect(run.night.number).toBe(2);
    resetRun();
  });
});
