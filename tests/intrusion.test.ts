import { describe, it, expect } from 'vitest';
import {
  HARD_HOLD,
  OTHER_HEARD,
  OTHER_OFFSET,
  bleed,
  carrierForSlot,
  clockText,
  formatClock,
  intrusionsDue,
  overrideCard,
  overrideSeconds,
  showMinutes,
} from '../src/sim/intrusion';
import { STARTING_STATE, otherStationLive, resolveNight } from '../src/sim/resolver';
import { NIGHT_1 } from '../src/data/night1';
import { NIGHT_2 } from '../src/data/night2';
import type { Intrusion, NightDef, ShowPerformance } from '../src/sim/types';

const withIntrusions = (base: NightDef, intrusions: Intrusion[]): NightDef => ({
  ...base,
  otherStation: { ...base.otherStation, intrusions },
});
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const none = new Set<string>();

const MIXED: Intrusion[] = [
  { kind: 'carrier', id: 'car', slots: [2, 3] },
  { kind: 'override', id: 'ov_between', at: { slot: 1 }, seconds: 20 },
  { kind: 'override', id: 'ov_mid', at: { slot: 3, frac: 0.5 }, seconds: 20, card: 'warn_ice' },
  { kind: 'climax', id: 'climax', at: { slot: 5, frac: 0.2 }, seconds: 30, card: 'warn_ice', counter: 'news_infirmary' },
];
const N = withIntrusions(NIGHT_1, MIXED);

describe('bleed', () => {
  it('is nothing on 1260 and full on the other carrier', () => {
    expect(bleed(0, 1)).toBe(0);
    expect(bleed(OTHER_OFFSET, 1)).toBeCloseTo(0.7);
    expect(bleed(OTHER_OFFSET, 0)).toBeCloseTo(1);
  });

  it('rises as the dial drifts toward 1250', () => {
    const halfway = bleed(OTHER_OFFSET / 2, 1);
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(bleed(OTHER_OFFSET, 1));
    expect(halfway).toBeCloseTo((1 - Math.abs(OTHER_OFFSET / 2) / 0.5) * 0.7);
    expect(bleed(0.3, 1)).toBe(0);
    expect(bleed(-1, 1)).toBeGreaterThan(0);
  });

  it('a weak tube lets more through', () => {
    expect(bleed(-0.4, 0.5)).toBeGreaterThan(bleed(-0.4, 1));
    expect(bleed(-0.4, 0.5)).toBeCloseTo(0.7 * 0.85);
  });

  it('holding the ?drift point (-0.4) is heard', () => {
    expect(bleed(-0.4, 1)).toBeGreaterThanOrEqual(OTHER_HEARD);
  });
});

describe('carrierForSlot', () => {
  it('finds the carrier covering a slot', () => {
    expect(carrierForSlot(N, 2)?.id).toBe('car');
    expect(carrierForSlot(N, 3)?.id).toBe('car');
    expect(carrierForSlot(N, 4)).toBeNull();
    expect(carrierForSlot(NIGHT_1, 3)).toBeNull();
    expect(carrierForSlot(NIGHT_2, 4)?.id).toBe('n2_carrier');
  });
});

describe('intrusionsDue', () => {
  it('fires between items at their slot, and anything whose moment passed', () => {
    expect(ids(intrusionsDue(N, none, 0, 0, 'between'))).toEqual([]);
    expect(ids(intrusionsDue(N, none, 1, 0, 'between'))).toEqual(['ov_between']);
    expect(ids(intrusionsDue(N, new Set(['ov_between']), 4, 0, 'between'))).toEqual(['ov_mid']);
  });

  it('fires mid-item ones once their fraction has played, during talk too', () => {
    expect(ids(intrusionsDue(N, none, 3, 0.4, 'record'))).toEqual([]);
    expect(ids(intrusionsDue(N, none, 3, 0.5, 'talk'))).toEqual(['ov_mid']);
    expect(ids(intrusionsDue(N, new Set(['ov_mid']), 3, 0.9, 'record'))).toEqual([]);
    expect(ids(intrusionsDue(N, none, 5, 0.3, 'record'))).toEqual(['climax']);
  });

  it('never fires carriers', () => {
    for (let s = 0; s <= 6; s++) expect(ids(intrusionsDue(N, none, s, 0, 'between'))).not.toContain('car');
  });
});

describe('overrideSeconds', () => {
  it('runs its full length if nobody holds the dial', () => {
    expect(overrideSeconds(20, 0, 1)).toBe(20);
  });

  it('holding hard on a healthy tube cuts it by 40%', () => {
    expect(overrideSeconds(20, 1, 1)).toBeCloseTo(12);
    expect(overrideSeconds(20, 0.5, 1)).toBeCloseTo(16);
  });

  it('a weak tube makes holding count for less', () => {
    expect(overrideSeconds(20, 1, 0.5)).toBeCloseTo(16);
    expect(overrideSeconds(20, 1, 0)).toBe(20);
  });
});

describe('overrideCard', () => {
  it('reads its own card if it has not aired yet', () => {
    expect(overrideCard(NIGHT_1, [], 'warn_dogs')).toBe('warn_dogs');
  });

  it('else the first preferred card not aired yet', () => {
    expect(overrideCard(NIGHT_1, [], undefined)).toBe('news_wells');
    expect(overrideCard(NIGHT_1, ['warn_dogs'], 'warn_dogs')).toBe('news_wells');
    expect(overrideCard(NIGHT_1, ['news_wells'])).toBe('warn_ice');
  });

  it('else nothing', () => {
    expect(overrideCard(NIGHT_1, NIGHT_1.otherStation.prefer)).toBeNull();
    expect(overrideCard(NIGHT_1, NIGHT_1.otherStation.prefer, 'no_such_card')).toBeNull();
  });
});

describe('the show clock', () => {
  it('runs 8 PM plus 70 minutes a slot', () => {
    expect(showMinutes(0)).toBe(20 * 60);
    expect(clockText(0)).toBe('8:00 PM');
    expect(clockText(2, 0.5)).toBe('10:55 PM');
    expect(clockText(5)).toBe('1:50 AM');
    expect(formatClock(24 * 60 + 5)).toBe('12:05 AM');
  });
});

// Resolver.

const N2_AUTO = NIGHT_2.rundowns.auto; // leaves news_cure out
const N2_DEMO = NIGHT_2.rundowns.demo; // leaves warn_squall out
const perf = (rundown: string[], opts: Partial<ShowPerformance> = {}): ShowPerformance => ({
  rundown, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls: [], ...opts,
});
const bleedOn = (v: number) => [0, 0, 0, 0, v, v];

describe('resolver: a second carrier', () => {
  it('heard: the card goes out as yours, with a flag and an eerie line', () => {
    const r = resolveNight(NIGHT_2, STARTING_STATE, perf(N2_AUTO, { bleed: bleedOn(0.5) }));
    expect(r.otherAired).toEqual(['news_cure']);
    expect(r.after.flags).toContain('other_heard');
    expect(r.after.flags).toContain('other_aired_news_cure');
    const line = r.lines[0]; // it leads the ledger
    expect(line?.text).toBe('Half of Dock Street heard you read "Doc Hessler\'s tonic cures pneumonia" in the storm. You didn\'t read it.');
  });

  it('heard: effects land scaled, but nobody pays the station for it', () => {
    const quiet = resolveNight(NIGHT_2, STARTING_STATE, perf(N2_AUTO));
    const heard = resolveNight(NIGHT_2, STARTING_STATE, perf(N2_AUTO, { bleed: bleedOn(1) }));
    expect(heard.after.safety).toBeLessThan(quiet.after.safety);
    expect(heard.after.listeners).toBeGreaterThan(quiet.after.listeners);
    expect(heard.after.chits).toBe(quiet.after.chits);
  });

  it('unheard: nothing at all', () => {
    const quiet = resolveNight(NIGHT_2, STARTING_STATE, perf(N2_AUTO));
    const low = resolveNight(NIGHT_2, STARTING_STATE, perf(N2_AUTO, { bleed: bleedOn(OTHER_HEARD - 0.01) }));
    expect(low.otherAired).toEqual([]);
    expect(low.after).toEqual(quiet.after);
    expect(low.lines).toEqual(quiet.lines);
  });

  it('a warning it reads takes its reach outcome instead of the unaired one', () => {
    const missed = resolveNight(NIGHT_2, STARTING_STATE, perf(N2_DEMO));
    expect(missed.after.flags).toContain('n2_squall_caught');
    const loud = resolveNight(NIGHT_2, STARTING_STATE, perf(N2_DEMO, { bleed: bleedOn(0.7) }));
    expect(loud.otherAired).toEqual(['warn_squall']);
    expect(loud.after.flags).toContain('n2_squall_heeded');
    expect(loud.after.flags).not.toContain('n2_squall_caught');
    const faint = resolveNight(NIGHT_2, STARTING_STATE, perf(N2_DEMO, { bleed: bleedOn(0.4) }));
    expect(faint.after.flags).toContain('n2_squall_caught');
    expect(faint.after.flags).toContain('other_aired_warn_squall');
  });

  it('still reads after sign-off as before', () => {
    const r = resolveNight(NIGHT_2, STARTING_STATE, perf(N2_AUTO, { bleed: bleedOn(0.9) }));
    expect(r.otherStation.cardId).toBe('news_cure');
    expect(r.otherStation.script).toContain('Lake Tonic');
    expect(r.otherStation.script).toContain(NIGHT_2.otherStation.stamp);
  });
});

describe('resolver: overrides', () => {
  const night = withIntrusions(NIGHT_1, [{ kind: 'override', id: 'ov', at: { slot: 4, frac: 0.5 }, seconds: 20 }]);
  // news_wells at 0; warn_ice left out.
  const rundown = ['news_wells', 'rec_harris', 'rec_moonlight', 'rec_hymn', 'rec_deep', 'ad_fish'];

  it('the card it read counts as heard: reach, flags, the clock and what you had on', () => {
    const r = resolveNight(night, STARTING_STATE, perf(rundown, { overrides: [{ id: 'ov', card: 'warn_ice', seconds: 20, held: 0 }] }));
    expect(r.otherAired).toEqual(['warn_ice']);
    expect(r.after.flags).toContain('other_aired_warn_ice');
    expect(r.after.flags).toContain('n1_boats_stayed_in');
    expect(r.after.flags).not.toContain('n1_boat_lost');
    expect(r.after.flags).not.toContain('other_heard');
    expect(r.lines).toContainEqual({ text: 'At 1:15 AM the Lamp read "Rotten ice at the north breakwater". You were playing "Asleep in the Deep" at the time.', tone: 'eerie' });
    expect(r.lines.some((l) => /leaned on the dial/.test(l.text))).toBe(false);
  });

  it('a hard hold gets its own line', () => {
    const r = resolveNight(night, STARTING_STATE, perf(rundown, { overrides: [{ id: 'ov', card: null, seconds: 12, held: HARD_HOLD }] }));
    expect(r.otherAired).toEqual([]);
    expect(r.lines).toContainEqual({ text: 'You leaned on the dial through it and it let go 8 seconds early.', tone: 'neutral' });
    expect(r.after.flags).toContain('n1_boat_lost');
  });

  it('an override that never ran, or names a card the night lacks, reads nothing', () => {
    expect(otherStationLive(night, perf(rundown))).toEqual([]);
    const r = resolveNight(night, STARTING_STATE, perf(rundown, { overrides: [{ id: 'ov', card: 'nope', seconds: 20, held: 0 }] }));
    expect(r.otherAired).toEqual([]);
  });

  it('a card read twice applies once', () => {
    const twice = withIntrusions(NIGHT_1, [
      { kind: 'override', id: 'a', at: { slot: 1 }, seconds: 20 },
      { kind: 'override', id: 'b', at: { slot: 3 }, seconds: 20 },
    ]);
    const one = resolveNight(twice, STARTING_STATE, perf(rundown, { overrides: [{ id: 'a', card: 'warn_ice', seconds: 20, held: 0 }] }));
    const two = resolveNight(twice, STARTING_STATE, perf(rundown, {
      overrides: [{ id: 'a', card: 'warn_ice', seconds: 20, held: 0 }, { id: 'b', card: 'warn_ice', seconds: 20, held: 0 }],
    }));
    expect(two.otherAired).toEqual(['warn_ice']);
    expect(two.after.safety).toBe(one.after.safety);
    expect(two.lines.filter((l) => l.tone === 'eerie')).toHaveLength(2);
  });

  it('a climax resolves like an override', () => {
    const c = withIntrusions(NIGHT_1, [{ kind: 'climax', id: 'cl', at: { slot: 5 }, seconds: 30, card: 'warn_ice', counter: 'news_infirmary' }]);
    const r = resolveNight(c, STARTING_STATE, perf(rundown, { overrides: [{ id: 'cl', card: 'warn_ice', seconds: 30, held: 0 }] }));
    expect(r.otherAired).toEqual(['warn_ice']);
  });
});
