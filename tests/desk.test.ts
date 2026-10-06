import { describe, it, expect } from 'vitest';
import { RULES, STARTING_STATE, hedgeEffects, resolveNight, slotClock } from '../src/sim/resolver';
import { deskCards, swapNext } from '../src/sim/desk';
import { openNight } from '../src/sim/nights';
import { NIGHT_1 } from '../src/data/night1';
import { NIGHT_2 } from '../src/data/night2';
import type { Card, NewsCard, NightDef, ShowPerformance } from '../src/sim/types';

const perf = (rundown: string[], opts: Partial<ShowPerformance> = {}): ShowPerformance => ({
  rundown, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls: [], ...opts,
});

/** Night 1 with one card replaced. */
function withCard(card: Card): NightDef {
  return { ...NIGHT_1, cards: NIGHT_1.cards.map((c) => (c.id === card.id ? card : c)) };
}

const wells = NIGHT_1.cards.find((c) => c.id === 'news_wells') as NewsCard;
const SHOW = ['news_wells', 'rec_harris', 'rec_hymn', 'rec_deep', 'warn_ice', 'rec_moonlight'];

describe('hedged reads', () => {
  it('halves every effect, rounding toward zero, trust included', () => {
    expect(hedgeEffects({ morale: -5, safety: 4, listeners: 25, credibility: -3, chits: 9, trust: { chapel: 3, linemen: -7 } }))
      .toEqual({ morale: -2, safety: 2, listeners: 12, credibility: -1, chits: 4, trust: { chapel: 1, linemen: -3 } });
    expect(hedgeEffects({})).toEqual({});
  });

  it('a hedged lie takes half the effect and never comes apart at dawn', () => {
    // Only unscaled fields, so the halving shows exactly.
    const night = withCard({ ...wells, effects: { chits: 9, credibility: -5 } });
    const straight = resolveNight(night, STARTING_STATE, perf(SHOW));
    const hedged = resolveNight(night, STARTING_STATE, perf(SHOW, { hedged: ['news_wells'] }));
    expect(straight.lines.some((l) => l.text === wells.unravel!.line)).toBe(true);
    expect(hedged.lines.some((l) => l.text === wells.unravel!.line)).toBe(false);
    expect(hedged.after.chits - straight.after.chits).toBe(4 - 9);
    expect(hedged.after.credibility - straight.after.credibility).toBe(-2 - (-5) - wells.unravel!.credibility);
  });

  it('asks 1.25 times the audience of a hedged read', () => {
    const reach = {
      faction: 'netters' as const,
      threshold: 0.8,
      success: { flag: 'heard', effects: {}, line: 'heard', tone: 'good' as const },
      fail: { flag: 'missed', effects: {}, line: 'missed', tone: 'bad' as const },
    };
    const night = withCard({ ...wells, reach });
    // Small hours: the Netters' share is 0.9. Straight needs 0.8, hedged needs 1.0.
    const show = ['rec_harris', 'rec_hymn', 'rec_deep', 'warn_ice', 'news_wells', 'rec_moonlight'];
    expect(RULES.hedgeThreshold).toBe(1.25);
    expect(resolveNight(night, STARTING_STATE, perf(show)).after.flags).toContain('heard');
    expect(resolveNight(night, STARTING_STATE, perf(show, { hedged: ['news_wells'] })).after.flags).toContain('missed');
  });

  it('ignores a hedge on a card with no hedged script', () => {
    const noHedge = withCard({ ...wells, hedge: undefined });
    const a = resolveNight(noHedge, STARTING_STATE, perf(SHOW));
    const b = resolveNight(noHedge, STARTING_STATE, perf(SHOW, { hedged: ['news_wells'] }));
    expect(b).toEqual(a);
  });

  it('gives the hedge-able Night 1 and 2 stories a hedged script', () => {
    const hedges = [...NIGHT_1.cards, ...NIGHT_2.cards].filter((c): c is NewsCard => c.kind === 'news' && !!c.hedge).map((c) => c.id);
    expect(hedges.sort()).toEqual(['news_cure', 'news_herring', 'news_wells', 'news_wiring']);
  });
});

describe('the desk', () => {
  const town = { ...STARTING_STATE, flags: [] as string[] };
  const night = openNight(NIGHT_1, town);
  const show = NIGHT_1.rundowns.auto;

  it('holds every card not in the running order', () => {
    const desk = deskCards(night, show, town, []).map((c) => c.id);
    expect(desk).toHaveLength(night.cards.length - show.length);
    for (const id of show) expect(desk).not.toContain(id);
  });

  it('opens tonight-gated cards once what they wait for has aired', () => {
    const gated: NightDef = {
      ...night,
      cards: [
        ...night.cards,
        { ...wells, id: 'news_follow_up', source: 'the Linemen', gate: { tonight: { aired: ['warn_dogs'] } } },
        { ...wells, id: 'news_unless', source: 'the Linemen', gate: { tonight: { notAired: ['warn_dogs'] } } },
      ],
    };
    const before = deskCards(gated, show, town, ['news_infirmary']).map((c) => c.id);
    expect(before).not.toContain('news_follow_up');
    expect(before).toContain('news_unless');
    const after = deskCards(gated, show, town, ['news_infirmary', 'rec_hymn', 'warn_dogs']).map((c) => c.id);
    expect(after).toContain('news_follow_up');
    expect(after).not.toContain('news_unless');
    // Flags still count.
    const flagged: NightDef = { ...gated, cards: [...gated.cards, { ...wells, id: 'news_flag', source: 'x', gate: { requires: ['nope'] } }] };
    expect(deskCards(flagged, show, town, []).map((c) => c.id)).not.toContain('news_flag');
  });

  it('swaps the next item and gives back the one it replaced', () => {
    const r = swapNext(show, 2, 'news_wells');
    expect(r).not.toBeNull();
    expect(r!.rundown[2]).toBe('news_wells');
    expect(r!.swap).toEqual({ slot: 2, out: show[2], in: 'news_wells' });
    expect(show[2]).toBe('warn_dogs'); // not mutated
    expect(swapNext(show, 2, 'rec_hymn')).toBeNull(); // already on
    expect(swapNext(show, 6, 'news_wells')).toBeNull(); // past the show
    expect(swapNext(show, -1, 'news_wells')).toBeNull();
  });
});

describe('swaps at dawn', () => {
  it('reports the first swap once, by the clock', () => {
    const rundown = ['news_infirmary', 'rec_hymn', 'warn_dogs', 'news_wells', 'warn_ice', 'rec_deep'];
    const r = resolveNight(NIGHT_1, STARTING_STATE, perf(rundown, {
      swaps: [{ slot: 3, out: 'rec_harris', in: 'news_wells' }, { slot: 4, out: 'rec_moonlight', in: 'warn_ice' }],
    }));
    const swaps = r.lines.filter((l) => l.rule === 'swap');
    expect(swaps).toHaveLength(1);
    expect(swaps[0]).toEqual({
      text: `You tore up the running order at ${slotClock(3)} and put "Poison in the east wells" on instead of "It Had to Be You". The paper noticed.`,
      tone: 'neutral',
      rule: 'swap',
    });
    expect(resolveNight(NIGHT_1, STARTING_STATE, perf(rundown)).lines.some((l) => l.rule === 'swap')).toBe(false);
  });

  it('tells the time of each slot', () => {
    expect([0, 1, 2, 3, 4, 5].map(slotClock)).toEqual(['8:00 PM', '9:10 PM', '10:20 PM', '11:30 PM', '12:40 AM', '1:50 AM']);
  });

  it('the Other Station reads what the swaps left unaired', () => {
    // The auto show leaves news_wells unaired; swapping it on moves the Other Station to the next preferred.
    const auto = NIGHT_1.rundowns.auto;
    expect(resolveNight(NIGHT_1, STARTING_STATE, perf(auto)).otherStation.cardId).toBe('news_wells');
    const swapped = swapNext(auto, 3, 'news_wells')!;
    const r = resolveNight(NIGHT_1, STARTING_STATE, perf(swapped.rundown, { swaps: [swapped.swap] }));
    expect(r.otherStation.cardId).toBe('news_wiring');
  });
});
