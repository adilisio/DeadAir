import { describe, it, expect } from 'vitest';
import { gateOpen, letterText, openNight } from '../src/sim/nights';
import { STARTING_STATE, cloneState, resolveNight } from '../src/sim/resolver';
import { NIGHT_2 } from '../src/data/night2';
import { hasNextNight, nextNight, resetRun, run, startNight, townBefore } from '../src/run';

const ids = (flags: string[]) => openNight(NIGHT_2, flags).cards.map((c) => c.id);
const lines = (flags: string[]) => openNight(NIGHT_2, flags).switchboard.lines.map((l) => l.id);

describe('gates', () => {
  it('opens on required flags and closes on excluded ones', () => {
    expect(gateOpen(undefined, [])).toBe(true);
    expect(gateOpen({ requires: ['a'] }, [])).toBe(false);
    expect(gateOpen({ requires: ['a'] }, ['a'])).toBe(true);
    expect(gateOpen({ requires: ['a', 'b'] }, ['a'])).toBe(false);
    expect(gateOpen({ unless: ['a'] }, ['a'])).toBe(false);
    expect(gateOpen({ requires: ['a'], unless: ['b'] }, ['a', 'b'])).toBe(false);
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
    expect(openNight(night, []).otherStation.prefer).toEqual(['news_cure']);
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
      morse: 'decoded',
    });
    const after = cloneState(run.result.after);
    nextNight();
    expect(run.index).toBe(1);
    expect(run.night.number).toBe(2);
    expect(run.town).toEqual(after);
    expect(run.result).toBeNull();
    // Night 1's choices opened Night 2's content.
    expect(run.night.cards.map((c) => c.id)).toContain('news_wozniak');
    expect(run.night.switchboard.lines.map((l) => l.id)).toContain('call_grace_thanks');
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
