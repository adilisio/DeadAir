import { describe, it, expect } from 'vitest';
import {
  AUDIENCE,
  STARTING_STATE,
  pickOtherStationCard,
  reachPasses,
  resolveNight,
  segmentOfSlot,
  validateRundown,
} from '../src/sim/resolver';
import { NIGHT_1 } from '../src/data/night1';
import type { CallerDecision, ShowPerformance } from '../src/sim/types';

const FILLER = ['rec_rag', 'rec_waltz', 'rec_march', 'rec_blues', 'rec_ballad', 'ad_fish'];

/** Build a 6-slot rundown with the given cards at the given slots, filling the rest with harmless items. */
function rundownWith(placed: Record<number, string>): string[] {
  const used = new Set(Object.values(placed));
  const filler = FILLER.filter((id) => !used.has(id));
  return Array.from({ length: 6 }, (_, i) => placed[i] ?? filler.shift()!);
}

function perf(rundown: string[], opts: Partial<ShowPerformance> = {}): ShowPerformance {
  return { rundown, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, caller: 'declined' as CallerDecision, ...opts };
}

const run = (p: ShowPerformance) => resolveNight(NIGHT_1, STARTING_STATE, p);

describe('schedule', () => {
  it('maps slots to segments two at a time', () => {
    expect([0, 1, 2, 3, 4, 5].map(segmentOfSlot)).toEqual(['dusk', 'dusk', 'late', 'late', 'small', 'small']);
  });

  it('keeps audience shares between 0 and 1', () => {
    for (const seg of Object.values(AUDIENCE)) {
      expect(seg.total).toBeGreaterThan(0);
      for (const v of Object.values(seg.share)) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('validateRundown', () => {
  it('rejects short, unknown and duplicate rundowns', () => {
    expect(validateRundown(NIGHT_1, ['rec_rag'])).toMatch(/6 items/);
    expect(validateRundown(NIGHT_1, rundownWith({ 0: 'nope' }))).toMatch(/Unknown/);
    expect(validateRundown(NIGHT_1, ['rec_rag', 'rec_rag', 'rec_waltz', 'rec_march', 'rec_blues', 'ad_fish'])).toMatch(/once/);
    expect(validateRundown(NIGHT_1, rundownWith({}))).toBeNull();
  });
});

describe('reach checks', () => {
  it('saves the boats when the ice warning airs in the small hours', () => {
    const r = run(perf(rundownWith({ 4: 'warn_ice' })));
    expect(r.after.flags).toContain('n1_boats_stayed_in');
    expect(r.after.trust.netters).toBeGreaterThan(STARTING_STATE.trust.netters);
  });

  it('loses a boat when the ice warning airs late, when Netters are asleep', () => {
    const r = run(perf(rundownWith({ 2: 'warn_ice' })));
    expect(r.after.flags).toContain('n1_boat_lost');
  });

  it('loses a boat when the ice warning never airs, with its own line', () => {
    const r = run(perf(rundownWith({})));
    expect(r.after.flags).toContain('n1_boat_lost');
    expect(r.lines.map((l) => l.text).join(' ')).toMatch(/Nobody warned the Netters/);
  });

  it('fails in the right segment if the signal is poor', () => {
    const check = NIGHT_1.cards.find((c) => c.id === 'warn_ice')!;
    if (check.kind !== 'warning' || !check.reach) throw new Error('fixture');
    expect(reachPasses(check.reach, 'small', 1)).toBe(true);
    expect(reachPasses(check.reach, 'small', 0.6)).toBe(false);
  });
});

describe('sequence rules', () => {
  it('breather: a record after grim news cancels its morale hit', () => {
    const withBreather = run(perf(rundownWith({ 0: 'warn_dogs', 1: 'rec_rag' })));
    const withoutBreather = run(perf(rundownWith({ 0: 'warn_dogs', 1: 'ad_tonic' })));
    expect(withBreather.lines.some((l) => /breathed/.test(l.text))).toBe(true);
    expect(withoutBreather.lines.some((l) => /breathed/.test(l.text))).toBe(false);
  });

  it('panic: two grim items back to back cost extra morale', () => {
    const panic = run(perf(rundownWith({ 0: 'warn_dogs', 1: 'news_wells' })));
    const spaced = run(perf(rundownWith({ 0: 'warn_dogs', 1: 'ad_tonic', 2: 'news_wells' })));
    expect(panic.lines.some((l) => /back to back/.test(l.text))).toBe(true);
    expect(spaced.lines.some((l) => /back to back/.test(l.text))).toBe(false);
  });

  it('ad fatigue: two ads in a row lose listeners', () => {
    const tired = run(perf(rundownWith({ 0: 'ad_tonic', 1: 'ad_fish' })));
    const spaced = run(perf(rundownWith({ 0: 'ad_tonic', 2: 'ad_fish' })));
    expect(tired.after.listeners).toBeLessThan(spaced.after.listeners);
    expect(tired.lines.some((l) => /radio clicked off/.test(l.text))).toBe(true);
  });

  it('dedication: a loved record after helpful news earns extra trust', () => {
    const dedicated = run(perf(rundownWith({ 0: 'news_bread', 1: 'rec_march' })));
    const plain = run(perf(rundownWith({ 0: 'news_bread', 1: 'rec_rag', 3: 'rec_march' })));
    expect(dedicated.lines.some((l) => /dedication/.test(l.text))).toBe(true);
    expect(dedicated.after.trust.grange).toBeGreaterThan(plain.after.trust.grange);
  });
});

describe('credibility and dead air', () => {
  it('false news costs credibility at dawn', () => {
    const lie = run(perf(rundownWith({ 0: 'news_wells' })));
    const truth = run(perf(rundownWith({ 0: 'news_bread' })));
    expect(lie.after.credibility).toBeLessThan(truth.after.credibility - 10);
    expect(lie.lines.some((l) => /Clean as rain/.test(l.text))).toBe(true);
  });

  it('dead air costs listeners and credibility', () => {
    const clean = run(perf(rundownWith({})));
    const dead = run(perf(rundownWith({}), { deadAirSeconds: 10 }));
    expect(dead.after.listeners).toBe(clean.after.listeners - 20);
    expect(dead.after.credibility).toBeLessThan(clean.after.credibility);
  });

  it('a better signal brings more listeners', () => {
    const good = run(perf(rundownWith({})));
    const bad = run(perf(rundownWith({}), { signal: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5] }));
    expect(good.after.listeners).toBeGreaterThan(bad.after.listeners);
  });
});

describe('the caller', () => {
  it('finds Teddy when put on air with a clear late signal', () => {
    expect(run(perf(rundownWith({}), { caller: 'onair' })).after.flags).toContain('n1_teddy_found');
  });

  it('loses Teddy to static when the signal is poor at that slot', () => {
    const r = run(perf(rundownWith({}), { caller: 'onair', signal: [1, 1, 0.5, 1, 1, 1] }));
    expect(r.after.flags).toContain('n1_teddy_cold');
  });

  it('records declined and missed calls differently', () => {
    expect(run(perf(rundownWith({}), { caller: 'declined' })).after.flags).toContain('n1_okafor_declined');
    expect(run(perf(rundownWith({}), { caller: 'missed' })).after.flags).toContain('n1_okafor_missed');
  });
});

describe('the Other Station', () => {
  it('reads back the first preferred card you left out', () => {
    expect(pickOtherStationCard(NIGHT_1, rundownWith({}))).toBe('news_wells');
    expect(pickOtherStationCard(NIGHT_1, rundownWith({ 0: 'news_wells' }))).toBe('warn_ice');
  });

  it('includes that card\'s script in its broadcast', () => {
    const r = run(perf(rundownWith({ 0: 'news_wells' })));
    expect(r.otherStation.script).toContain('ice shelf');
    expect(r.otherStation.script).toContain('Twelve-sixty');
  });
});

describe('state handling', () => {
  it('does not mutate the starting state and is deterministic', () => {
    const before = JSON.stringify(STARTING_STATE);
    const p = perf(rundownWith({ 0: 'news_wells', 4: 'warn_ice' }), { caller: 'onair', deadAirSeconds: 4 });
    expect(run(p)).toEqual(run(p));
    expect(JSON.stringify(STARTING_STATE)).toBe(before);
  });

  it('clamps stats to 0..100', () => {
    const start = { ...STARTING_STATE, morale: 1, credibility: 99, trust: { netters: 99, grange: 1, linemen: 50 } };
    const r = resolveNight(NIGHT_1, start, perf(rundownWith({ 0: 'news_wells', 1: 'warn_dogs', 4: 'warn_ice' })));
    for (const v of [r.after.morale, r.after.safety, r.after.credibility, ...Object.values(r.after.trust)]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
