// Rules the campaign (Nights 3-6) relies on: automatic card flags, silent outcomes, gated
// events, storm wind, dawn lines, card groups, cards that end the show, the Other
// Station's variants, letters and headlines.
import { describe, it, expect } from 'vitest';
import { STARTING_STATE, cloneState, pickOtherStationCard, resolveNight, validateRundown } from '../src/sim/resolver';
import { letterText, openNight } from '../src/sim/nights';
import { CALM_WIND, STORM_WIND, windForSlot } from '../src/sim/storm';
import { overrideCard } from '../src/sim/intrusion';
import { deskCards } from '../src/sim/desk';
import { NIGHT_5 } from '../src/data/night5';
import { NIGHT_6 } from '../src/data/night6';
import type { Card, NewsCard, NightDef, RecordCard, ShowPerformance, SwitchboardEvent, TownState, WarningCard } from '../src/sim/types';

const rec = (id: string): RecordCard => ({ id, kind: 'record', recordId: 'moonlight_bay', title: id, blurb: 'A record.', mood: 'blue', loves: ['netters'] });
const news = (id: string, over: Partial<NewsCard> = {}): NewsCard => ({
  id, kind: 'news', truth: 'true', source: 'somebody', title: id, blurb: 'A story.', script: `This is ${id}.`, effects: {}, ...over,
});
const warn = (id: string, over: Partial<WarningCard> = {}): WarningCard => ({
  id, kind: 'warning', title: id, blurb: 'A warning.', script: `Warning ${id}.`, effects: {}, ...over,
});

const RECS = ['r1', 'r2', 'r3', 'r4'].map(rec);
const SHOW = ['a', 'r1', 'b', 'r2', 'c', 'r3'];

function night(over: Partial<NightDef> = {}, cards: Card[] = []): NightDef {
  return {
    id: 'nx', number: 9,
    cards: [...RECS, news('a'), news('b'), news('c'), news('d'), news('e'), ...cards],
    events: [],
    signOn: 'On.', signOff: 'Off.',
    otherStation: { prefer: ['d', 'e'], intro: 'Intro.', stamp: 'Stamp.', outro: 'Outro.' },
    letter: { body: 'Dear Lamp, "{quote}"', from: 'a listener' },
    rundowns: { auto: SHOW, demo: SHOW },
    ...over,
  };
}

const perf = (rundown: string[], over: Partial<ShowPerformance> = {}): ShowPerformance => ({
  rundown, signal: rundown.map(() => 1), deadAirSeconds: 0, calls: [], ...over,
});
const town = (flags: string[] = []): TownState => ({ ...cloneState(STARTING_STATE), flags });

describe('automatic card flags', () => {
  it('marks every card that aired, and the ones read hedged', () => {
    const n = night({}, [news('h', { hedge: 'I cannot swear to h, but here it is anyway.' })]);
    const r = resolveNight(n, STARTING_STATE, perf(['h', 'r1', 'b', 'r2', 'c', 'r3'], { hedged: ['h'] }));
    for (const id of ['h', 'r1', 'b', 'r2', 'c', 'r3']) expect(r.after.flags).toContain(`aired_${id}`);
    expect(r.after.flags).toContain('hedged_h');
    expect(r.after.flags).not.toContain('hedged_b');
    expect(r.after.flags).not.toContain('aired_a');
  });
});

describe('silent outcomes', () => {
  it('an empty line adds nothing to the dawn, but the flag and effects still land', () => {
    const w = warn('w', {
      reach: {
        faction: 'netters', threshold: 0.5,
        success: { flag: 'w_ok', tone: 'good', effects: {}, line: 'It landed.' },
        fail: { flag: 'w_fail', tone: 'bad', effects: {}, line: 'It missed.' },
        unaired: { flag: 'w_quiet', tone: 'neutral', effects: { morale: 5 }, line: '' },
      },
    });
    const r = resolveNight(night({}, [w]), STARTING_STATE, perf(SHOW));
    expect(r.after.flags).toContain('w_quiet');
    expect(r.after.morale).toBeGreaterThanOrEqual(STARTING_STATE.morale + 5);
    expect(r.lines.some((l) => l.text === '')).toBe(false);
  });

  it('a storm with an empty report line says nothing', () => {
    const n = night({ events: [{ kind: 'storm', id: 's', slots: [0], held: { line: '', effects: { credibility: 3 } }, lost: { line: 'Lost.', effects: {} } }] });
    const r = resolveNight(n, STARTING_STATE, perf(SHOW));
    expect(r.lines.some((l) => l.text === '')).toBe(false);
    expect(r.after.credibility).toBeGreaterThan(STARTING_STATE.credibility);
  });
});

describe('gated events', () => {
  const n = night({
    events: [
      {
        kind: 'morse', id: 'm_yes', gate: { requires: ['f'] }, at: { slot: 3 }, word: 'NORTH', seconds: 30,
        decoded: { flag: 'y', tone: 'good', effects: {}, line: 'Yes.' }, missed: { flag: 'yn', tone: 'bad', effects: {}, line: 'No.' },
      },
      {
        kind: 'morse', id: 'm_no', gate: { unless: ['f'] }, at: { slot: 3 }, word: 'FIRE', seconds: 30,
        decoded: { flag: 'z', tone: 'good', effects: {}, line: 'Yes.' }, missed: { flag: 'zn', tone: 'bad', effects: {}, line: 'No.' },
      },
      { kind: 'tube', id: 't', at: { slot: 1 }, socket: 0 },
    ],
    otherStation: {
      prefer: ['d'], intro: 'I.', stamp: 'S.', outro: 'O.',
      intrusions: [
        { kind: 'override', id: 'o', gate: { when: [{ stat: 'credibility', max: 30 }] }, at: { slot: 2 }, seconds: 10 },
        { kind: 'carrier', id: 'c', slots: [4] },
      ],
    },
  });

  it('drops events whose gate is closed when the night opens', () => {
    expect(openNight(n, town()).events.map((e) => e.id)).toEqual(['m_no', 't']);
    expect(openNight(n, town(['f'])).events.map((e) => e.id)).toEqual(['m_yes', 't']);
  });

  it('drops intrusions the same way, stats included', () => {
    expect((openNight(n, town()).otherStation.intrusions ?? []).map((i) => i.id)).toEqual(['c']);
    const low = { ...town(), credibility: 20 };
    expect((openNight(n, low).otherStation.intrusions ?? []).map((i) => i.id)).toEqual(['o', 'c']);
  });
});

describe('storm wind', () => {
  it("blows STORM_WIND times the storm's own wind, 1 by default, the hardest storm winning", () => {
    const s = (id: string, slots: number[], wind?: number) => ({ kind: 'storm' as const, id, slots, wind, held: { line: 'h', effects: {} }, lost: { line: 'l', effects: {} } });
    const n = night({ events: [s('a', [1, 2]), s('b', [2, 3], 1.9)] });
    expect(windForSlot(n, 0)).toBe(CALM_WIND);
    expect(windForSlot(n, 1)).toBe(STORM_WIND);
    expect(windForSlot(n, 2)).toBeCloseTo(STORM_WIND * 1.9);
    expect(windForSlot(n, 3)).toBeCloseTo(STORM_WIND * 1.9);
  });
});

describe('dawn lines', () => {
  const n = night({
    dawnLines: [
      { gate: { requires: ['aired_a'] }, line: 'A went out.', tone: 'rumor', flag: 'saw_a', effects: { morale: 60 } },
      { gate: { requires: ['saw_a'] }, line: 'And people talked about it.', tone: 'good' },
      { gate: { requires: ['aired_d'] }, line: 'D went out.', tone: 'bad' },
      { gate: { when: [{ stat: 'morale', min: 90 }] }, line: 'Everyone is cheerful.', tone: 'good' },
    ],
  });

  it("come last, in order, against the town after the night (tonight's flags included)", () => {
    const r = resolveNight(n, STARTING_STATE, perf(SHOW));
    const texts = r.lines.map((l) => l.text);
    expect(texts.slice(-3)).toEqual(['A went out.', 'And people talked about it.', 'Everyone is cheerful.']);
    expect(texts).not.toContain('D went out.');
    expect(r.lines.find((l) => l.text === 'A went out.')?.tone).toBe('rumor');
    expect(r.after.flags).toContain('saw_a');
    expect(r.after.morale).toBe(100); // clamped after
  });
});

describe('card groups', () => {
  const n = night({ otherStation: { prefer: ['g1', 'd'], intro: 'I.', stamp: 'S.', outro: 'O.', readsGroup: 'answer' } }, [
    news('g1', { group: 'answer' }), news('g2', { group: 'answer' }), news('g3', { group: 'answer' }),
  ]);

  it('only one card of a group can air', () => {
    expect(validateRundown(n, ['g1', 'r1', 'g2', 'r2', 'c', 'r3'])).toBe('Only one of those can air.');
    expect(validateRundown(n, ['g1', 'r1', 'b', 'r2', 'c', 'r3'])).toBeNull();
  });

  it('the Other Station reads the answers you did not give, in card order, before the preferred card', () => {
    const r = resolveNight(n, STARTING_STATE, perf(['g2', 'r1', 'b', 'r2', 'c', 'r3']));
    expect(r.otherStation.cards).toEqual(['g1', 'g3', 'd']);
    expect(r.otherStation.script).toBe('I. S. This is g1. This is g3. This is d. O.');
    expect(r.otherStation.cardId).toBe('g1');
  });

  it('the desk offers no second card of a group already in the show, unless it would replace it', () => {
    const show = ['g2', 'r1', 'b', 'r2', 'c', 'r3'];
    const desk = (slot?: number) => deskCards(n, show, town(), [], { slot }).map((c) => c.id);
    expect(desk(2)).not.toContain('g1');
    expect(desk(0)).toEqual(expect.arrayContaining(['g1', 'g3']));
  });
});

describe('a card that ends the show', () => {
  const dark = warn('dark', {
    endsShow: true,
    reach: {
      faction: 'linemen', threshold: 0,
      success: { flag: 'went_dark', tone: 'neutral', effects: {}, line: 'Dark.' },
      fail: { flag: 'went_dark', tone: 'neutral', effects: {}, line: '' },
      unaired: { flag: 'stayed_on', tone: 'neutral', effects: {}, line: '' },
    },
  });
  const later = warn('later', {
    reach: {
      faction: 'netters', threshold: 0.1,
      success: { flag: 'later_ok', tone: 'good', effects: {}, line: 'Heard.' },
      fail: { flag: 'later_fail', tone: 'bad', effects: {}, line: 'Missed.' },
      unaired: { flag: 'later_unaired', tone: 'bad', effects: {}, line: 'Never said.' },
    },
  });
  const line = (id: string) => ({
    id, person: 'bill' as const, name: 'Bill', prompt: 'Bill', preview: 'Bill here.', script: 'Bill on air.',
    aired: { flag: `${id}_on`, tone: 'good' as const, effects: {}, line: 'On.' },
    notTaken: { flag: `${id}_ignored`, tone: 'bad' as const, effects: {}, line: `${id} ignored.` },
  });
  const late: SwitchboardEvent = { kind: 'switchboard', id: 'late_board', at: { slot: 4 }, lines: [line('x')] };
  const early: SwitchboardEvent = { kind: 'switchboard', id: 'early_board', at: { slot: 1 }, lines: [line('y')] };
  // Due during the talk item that ends the show: it would have waited for the item to end.
  const during: SwitchboardEvent = { kind: 'switchboard', id: 'during_board', at: { slot: 2, frac: 0.5 }, lines: [line('w')] };
  const n = night({
    events: [late, early, during, { kind: 'storm', id: 'st', slots: [4, 5], held: { line: 'Held.', effects: {} }, lost: { line: 'Lost.', effects: {} } }],
    otherStation: { prefer: ['later', 'd', 'e', 'b'], intro: 'I.', stamp: 'S.', outro: 'O.', fillsSilence: true },
  }, [dark, later]);
  const aired = ['a', 'r1', 'dark'];

  it('validates a shorter show only when it ended early, on the card that ends it', () => {
    expect(validateRundown(n, aired)).toMatch(/6 items/);
    expect(validateRundown(n, aired, true)).toBeNull();
    expect(validateRundown(n, ['a', 'r1', 'b'], true)).toMatch(/ends the show/);
    expect(validateRundown(n, [], true)).toMatch(/6 items/);
    // At prep it can go anywhere in a full show.
    expect(validateRundown(n, ['a', 'dark', 'b', 'r1', 'c', 'r2'])).toBeNull();
  });

  it('scores what aired; the rest goes unaired, and nothing after the end happens', () => {
    const r = resolveNight(n, STARTING_STATE, perf(aired, { endedEarly: true }));
    expect(r.after.flags).toEqual(expect.arrayContaining(['went_dark', 'later_unaired', 'y_ignored', 'aired_dark']));
    expect(r.after.flags).not.toContain('x_ignored'); // that board would have rung after the end
    expect(r.after.flags).not.toContain('w_ignored');
    const texts = r.lines.map((l) => l.text);
    expect(texts).not.toContain('Held.');
    expect(texts).not.toContain('Lost.');
    expect(texts.some((t) => /dead air/.test(t))).toBe(false);
  });

  it('an Other Station that fills the silence reads up to three unaired preferred cards', () => {
    const r = resolveNight(n, STARTING_STATE, perf(aired, { endedEarly: true }));
    expect(r.otherStation.cards).toEqual(['later', 'd', 'e']);
    // A full show: just the one, as always.
    const full = resolveNight(n, STARTING_STATE, perf(SHOW));
    expect(full.otherStation.cards).toEqual(['later']);
  });
});

describe('the Other Station after sign-off', () => {
  it('reads every unaired preferred card, at most four, when it reads all', () => {
    const n = night({ otherStation: { prefer: ['a', 'b', 'c', 'd', 'e'], intro: 'I.', stamp: 'S.', outro: 'O.', readsAll: true } });
    const r = resolveNight(n, STARTING_STATE, perf(['a', 'r1', 'r2', 'r3', 'r4', 'e']));
    expect(r.otherStation.cards).toEqual(['b', 'c', 'd']);
    expect(r.otherStation.cardId).toBe('b');
    const loose = night({
      cards: [...RECS, rec('r5'), rec('r6'), news('a'), news('b'), news('c'), news('d'), news('e'), news('f')],
      otherStation: { prefer: ['a', 'b', 'c', 'd', 'e', 'f'], intro: 'I.', stamp: 'S.', outro: 'O.', readsAll: true },
    });
    expect(resolveNight(loose, STARTING_STATE, perf(['r1', 'r2', 'r3', 'r4', 'r5', 'r6'])).otherStation.cards).toEqual(['a', 'b', 'c', 'd']);
  });

  it('with nothing left to read, it says only who and when, and the night remembers', () => {
    const n = night({ cards: [...RECS, news('a'), news('b')], otherStation: { prefer: ['a'], intro: 'I.', stamp: 'S.', outro: 'O.', readsAll: true } });
    const r = resolveNight(n, STARTING_STATE, perf(['a', 'r1', 'b', 'r2', 'r3', 'r4']));
    expect(r.otherStation.cards).toEqual([]);
    expect(r.otherStation.cardId).toBeNull();
    expect(r.otherStation.script).toBe('I. S.');
    expect(r.after.flags).toContain('nx_other_silent');
    expect(pickOtherStationCard(n, ['a', 'r1', 'b', 'r2', 'r3', 'r4'])).toBeNull();
  });

  it('is not silent while it has something to read', () => {
    const r = resolveNight(night(), STARTING_STATE, perf(SHOW));
    expect(r.otherStation.cards).toEqual(['d']);
    expect(r.after.flags).not.toContain('nx_other_silent');
  });
});

describe('letters and headlines', () => {
  const n = night({
    letters: [
      { gate: { requires: ['nx_other_silent'] }, body: 'Nothing on the dial at all.', from: 'the quiet one' },
      { gate: { requires: ['aired_a'] }, body: 'You read a, and then "{quote}"', from: 'the a one' },
    ],
    headlines: [
      { gate: { requires: ['aired_zzz'] }, text: 'NEVER', sub: 'Not this one.' },
      { gate: { requires: ['aired_a'] }, text: 'A WENT OUT', sub: 'And the town heard it.' },
      { gate: {}, text: 'NOTHING HAPPENED', sub: 'As usual.' },
    ],
  });

  it("the first open letter wins, else the night's letter", () => {
    const r = resolveNight(n, STARTING_STATE, perf(SHOW));
    expect(r.letter).toEqual({ body: 'You read a, and then "{quote}"', from: 'the a one' });
    expect(letterText(r.letter, 'hello')).toBe('You read a, and then "hello"');
    const r2 = resolveNight(n, STARTING_STATE, perf(['b', 'r1', 'c', 'r2', 'd', 'r3']));
    expect(r2.letter).toEqual(n.letter);
  });

  it('the first open headline wins; none without headlines', () => {
    expect(resolveNight(n, STARTING_STATE, perf(SHOW)).headline).toEqual({ text: 'A WENT OUT', sub: 'And the town heard it.' });
    expect(resolveNight(n, STARTING_STATE, perf(['b', 'r1', 'c', 'r2', 'd', 'r3'])).headline?.text).toBe('NOTHING HAPPENED');
    expect(resolveNight(night(), STARTING_STATE, perf(SHOW)).headline).toBeUndefined();
  });
});

describe('the climax', () => {
  it('without a card of its own reads the first unaired preferred card', () => {
    const n = night({ otherStation: { prefer: ['d', 'e'], intro: 'I.', stamp: 'S.', outro: 'O.', intrusions: [{ kind: 'climax', id: 'cx', at: { slot: 4 }, seconds: 30, counter: 'e' }] } });
    const [cx] = n.otherStation.intrusions ?? [];
    expect(cx.kind === 'climax' && overrideCard(n, ['d'], cx.card)).toBe('e');
  });
});

describe('the desk and confidences', () => {
  it('holds a card waiting on a confidence until it has been heard (and at prep, before any)', () => {
    const n = night({}, [warn('hut', { gate: { tonight: { flags: ['t_anon_hut'] } } })]);
    expect(deskCards(n, SHOW, town(), [], { confidedTonight: [] }).map((c) => c.id)).not.toContain('hut');
    expect(deskCards(n, SHOW, town(), [], { confidedTonight: ['t_anon_hut'] }).map((c) => c.id)).toContain('hut');
  });
});

describe('the campaign nights', () => {
  it('Night 5: going dark ends the show, and the silence is filled with the answers and the rest', () => {
    const n = openNight(NIGHT_5, town());
    const aired = ['ad_smokehouse3', 'rec_mill2', 'ans_deny', 'warn_dark'];
    const r = resolveNight(n, STARTING_STATE, perf(aired, { endedEarly: true }));
    expect(r.after.flags).toEqual(expect.arrayContaining(['n5_dark', 'n5_answer_deny', 'aired_warn_dark']));
    expect(r.after.flags).not.toContain('n5_stayed_on');
    // The two answers not given, then up to three preferred cards left unaired.
    expect(r.otherStation.cards).toEqual(['ans_claim', 'ans_silent', 'warn_squall5', 'news_rebuild']);
    expect(r.lines.map((l) => l.text)).toContain("While the Lamp was dark, twelve-sixty wasn't. People who left the set on heard a whole show. Yours. With a kettle in it.");
  });

  it('Night 6: the last dawn has a headline, and the Other Station reads what was left', () => {
    const n = openNight(NIGHT_6, town());
    const r = resolveNight(n, STARTING_STATE, perf(NIGHT_6.rundowns.auto));
    expect(r.headline?.text).toBeTruthy();
    expect(r.otherStation.cards.length).toBeGreaterThan(1);
    expect(r.otherStation.cards.length).toBeLessThanOrEqual(4);
    expect(r.letter).toEqual(NIGHT_6.letter);
  });
});