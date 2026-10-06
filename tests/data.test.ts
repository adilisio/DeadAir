import { describe, it, expect } from 'vitest';
import { NIGHTS } from '../src/data/nights';
import { STARTING_STATE, cloneState, validateRundown } from '../src/sim/resolver';
import { linesOpenNow, openNight } from '../src/sim/nights';
import { eventsOf } from '../src/sim/events';
import { PEOPLE } from '../src/data/people';
import { RECORDS, REAL_RECORDS, LATEST_PD_RECORDING_YEAR, licenseNote, resolveRecord, sourceUrl, standInFor } from '../src/data/records';
import { SHOW_SLOTS, STAT_NAMES, type Gate, type NightDef, type StatName, type TownState } from '../src/sim/types';
import { TUBE_TYPES } from '../src/sim/tube';
import { turnIndex } from '../src/sim/calls';
import { encode } from '../src/sim/morse';

const allLines = (night: NightDef) => eventsOf(night, 'switchboard').flatMap((b) => b.lines);

function gates(night: NightDef): Gate[] {
  return [...night.cards.map((c) => c.gate), ...allLines(night).map((l) => l.gate)].filter((g): g is Gate => !!g);
}

/** Every flag any gate in this night mentions. */
function gateFlags(night: NightDef): string[] {
  return [...new Set(gates(night).flatMap((g) => [...(g.requires ?? []), ...(g.unless ?? [])]))];
}

/** For each stat a gate reads, values on both sides of every boundary. */
function statValues(night: NightDef): [StatName, number[]][] {
  const byStat = new Map<StatName, Set<number>>();
  for (const g of gates(night)) {
    for (const { stat, min, max } of g.when ?? []) {
      const vals = byStat.get(stat) ?? new Set<number>();
      if (min !== undefined) vals.add(min - 1).add(min);
      if (max !== undefined) vals.add(max).add(max + 1);
      byStat.set(stat, vals);
    }
  }
  return [...byStat].map(([stat, vals]) => [stat, [...vals]]);
}

/** Card ids any line's tonight-gate mentions. */
function tonightIds(night: NightDef): string[] {
  return [...new Set(allLines(night).flatMap((l) => [...(l.gate?.tonight?.aired ?? []), ...(l.gate?.tonight?.notAired ?? [])]))];
}

/** Confidences (`t_<flag>`) any line's tonight-gate needs. */
function tonightFlags(night: NightDef): string[] {
  return [...new Set(allLines(night).flatMap((l) => l.gate?.tonight?.flags ?? []))];
}

function subsets<T>(xs: T[]): T[][] {
  return Array.from({ length: 2 ** xs.length }, (_, mask) => xs.filter((_x, i) => mask & (1 << i)));
}

function withStat(town: TownState, stat: StatName, v: number): TownState {
  const t = cloneState(town);
  if (stat.startsWith('trust.')) t.trust[stat.slice(6) as keyof TownState['trust']] = v;
  else t[stat as Exclude<StatName, `trust.${string}`>] = v;
  return t;
}

/**
 * Every town the night's gates can tell apart: each combination of gate flags, times each
 * side of every stat boundary. For each, the night opened at prep, and every board's lines
 * for each combination of tonight-gated cards aired or not and confidences heard or not.
 */
function everyOpening(night: NightDef): { where: string; open: NightDef; boards: { id: string; aired: string[]; lines: string[] }[] }[] {
  let towns: { where: string; town: TownState }[] = subsets(gateFlags(night)).map((flags) => ({
    where: flags.join(',') || 'no flags',
    town: { ...cloneState(STARTING_STATE), flags },
  }));
  for (const [stat, vals] of statValues(night)) {
    towns = towns.flatMap(({ where, town }) => vals.map((v) => ({ where: `${where}; ${stat}=${v}`, town: withStat(town, stat, v) })));
  }
  const airedSets = subsets(tonightIds(night));
  const confidedSets = subsets(tonightFlags(night));
  return towns.map(({ where, town }) => {
    const open = openNight(night, town);
    const boards = eventsOf(open, 'switchboard').flatMap((b) =>
      airedSets.flatMap((aired) => confidedSets.map((confided) => ({
        id: b.id,
        aired: [...aired, ...confided],
        lines: linesOpenNow(b, town, aired, confided).map((l) => l.id),
      }))),
    );
    return { where, open, boards };
  });
}

describe.each(NIGHTS.map((n) => [n.number, n] as const))('night %i content', (_n, night) => {
  it('has unique card ids', () => {
    const ids = night.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only references records that exist', () => {
    for (const c of night.cards) if (c.kind === 'record') expect(resolveRecord(c.recordId), c.id).toBeDefined();
  });

  it('gives every talk card a script and every card a blurb', () => {
    for (const c of night.cards) {
      expect(c.blurb.length, c.id).toBeGreaterThan(0);
      if (c.kind !== 'record') expect(c.script.length, c.id).toBeGreaterThan(20);
    }
  });

  it('has valid auto-play and demo rundowns using only ungated cards', () => {
    const open = openNight(night, cloneState(STARTING_STATE));
    expect(validateRundown(open, night.rundowns.auto)).toBeNull();
    expect(validateRundown(open, night.rundowns.demo)).toBeNull();
  });

  it('fills the crate and every board whatever happened before', () => {
    const openings = everyOpening(night);
    expect(openings.length).toBeGreaterThan(0);
    for (const { where, open, boards } of openings) {
      expect(open.cards.length, where).toBeGreaterThan(SHOW_SLOTS); // at least 7
      expect(open.cards.length, where).toBeLessThanOrEqual(15); // what the prep crate can show
      expect(open.otherStation.prefer.length, where).toBeGreaterThan(0);
      expect(boards.length, where).toBeGreaterThan(0);
      for (const b of boards) {
        const at = `${where}; ${b.id} after [${b.aired.join(',')}]`;
        expect(b.lines.length, at).toBeGreaterThanOrEqual(2);
        expect(b.lines.length, at).toBeLessThanOrEqual(3); // keys 1-3
      }
    }
  });

  it('gates only on real stats, and tonight only on cards this night has', () => {
    const ids = new Set(night.cards.map((c) => c.id));
    for (const g of gates(night)) {
      for (const w of g.when ?? []) {
        expect(STAT_NAMES, w.stat).toContain(w.stat);
        expect(w.min !== undefined || w.max !== undefined, w.stat).toBe(true);
      }
    }
    for (const c of night.cards) expect(c.gate?.tonight, `${c.id}: tonight-gates are for switchboard lines`).toBeUndefined();
    for (const l of allLines(night)) {
      for (const id of [...(l.gate?.tonight?.aired ?? []), ...(l.gate?.tonight?.notAired ?? [])]) expect(ids.has(id), `${l.id}: ${id}`).toBe(true);
    }
    // Confidence gates name a confidence a caller on this night can give.
    const confides = new Set(allLines(night).flatMap((l) => (l.confide ? [`t_${l.confide.flag}`] : [])));
    for (const f of tonightFlags(night)) expect(confides.has(f), f).toBe(true);
  });

  it('gives callers sane patience, lamps, confidences, requests and sign-offs', () => {
    const records = new Set(night.cards.flatMap((c) => (c.kind === 'record' ? [c.recordId] : [])));
    for (const l of allLines(night)) {
      if (l.patience !== undefined) {
        expect(l.patience, l.id).toBeGreaterThan(3);
        expect(l.patience, l.id).toBeLessThanOrEqual(120);
      }
      if (l.urgent !== undefined) expect(typeof l.urgent, l.id).toBe('boolean');
      if (l.confide) {
        expect(l.confide.text.length, l.id).toBeGreaterThan(20);
        expect(l.confide.flag, l.id).toMatch(/^[a-z0-9_]+$/);
        expect(l.confide.flag.startsWith('t_'), l.id).toBe(false);
      }
      // A request is for a record that can air tonight.
      if (l.request) expect(records.has(l.request.recordId), l.id).toBe(true);
      if (l.after !== undefined) expect(l.after.trim().length, l.id).toBeGreaterThan(10);
    }
  });

  it('schedules its booth tasks inside the show', () => {
    const inShow = (s: number) => s >= 0 && s < SHOW_SLOTS;
    const eventIds = night.events.map((e) => e.id);
    expect(new Set(eventIds).size).toBe(eventIds.length);
    expect(eventsOf(night, 'switchboard').length).toBeGreaterThan(0);
    for (const e of night.events) {
      if (e.kind === 'storm') {
        expect(e.slots.length, e.id).toBeGreaterThan(0);
        for (const s of e.slots) expect(inShow(s), `${e.id} ${s}`).toBe(true);
        continue;
      }
      expect(inShow(e.at.slot), e.id).toBe(true);
      const frac = e.at.frac ?? 0;
      expect(frac >= 0 && frac < 1, e.id).toBe(true);
      if (e.kind === 'tube') expect(e.socket >= 0 && e.socket < TUBE_TYPES.length, e.id).toBe(true);
      if (e.kind === 'morse') {
        expect(() => encode(e.word)).not.toThrow();
        // A and D tune the dial; keep them out of the word so tuning never counts as a guess.
        expect(e.word, e.id).not.toMatch(/[ADX]/i);
        if (e.sender) expect(PEOPLE[e.sender], e.id).toBeDefined();
      }
    }
  });

  it('has switchboards of distinct lines, unique across the night, whose turns appear in their scripts', () => {
    const lines = allLines(night);
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    for (const l of lines) {
      expect(PEOPLE[l.person], l.id).toBeDefined();
      if (l.turn) expect(turnIndex(l), l.id).toBeGreaterThan(0);
      // The board row is narrow.
      expect(l.prompt.length, l.id).toBeLessThanOrEqual(36);
    }
  });

  it('points the Other Station at real things and has a letter with a place for the quote', () => {
    const ids = new Set(night.cards.map((c) => c.id));
    for (const id of night.otherStation.prefer) expect(ids.has(id), id).toBe(true);
    expect(night.letter.body).toContain('{quote}');
    expect(night.letter.from.length).toBeGreaterThan(0);
  });

  it('keeps the Other Station\'s intrusions inside the show, with their own ids, on real cards', () => {
    const intrusions = night.otherStation.intrusions ?? [];
    const ids = [...night.events.map((e) => e.id), ...intrusions.map((i) => i.id)];
    expect(new Set(ids).size).toBe(ids.length);
    const talk = new Set(night.cards.filter((c) => c.kind !== 'record').map((c) => c.id));
    const inShow = (s: number) => Number.isInteger(s) && s >= 0 && s < SHOW_SLOTS;
    for (const i of intrusions) {
      if (i.kind === 'carrier') {
        expect(i.slots.length, i.id).toBeGreaterThan(0);
        for (const s of i.slots) expect(inShow(s), `${i.id} ${s}`).toBe(true);
        continue;
      }
      expect(inShow(i.at.slot), i.id).toBe(true);
      const frac = i.at.frac ?? 0;
      expect(frac >= 0 && frac < 1, i.id).toBe(true);
      expect(i.seconds, i.id).toBeGreaterThan(0);
      if (i.card) expect(talk.has(i.card), `${i.id} ${i.card}`).toBe(true);
      if (i.kind === 'climax') expect(talk.has(i.counter), `${i.id} ${i.counter}`).toBe(true);
    }
  });
});

describe('every opening', () => {
  it('tries both sides of stat gates, and tonight-gated cards aired and not', () => {
    const [n1] = NIGHTS;
    const [board] = eventsOf(n1, 'switchboard');
    const night: NightDef = {
      ...n1,
      cards: n1.cards.map((c) => (c.id === 'ad_fish' ? { ...c, gate: { when: [{ stat: 'trust.netters', min: 60 }] } } : c)),
      events: [{ ...board, lines: [...board.lines, { ...board.lines[2], id: 'extra', gate: { tonight: { aired: ['news_wells'] } } }] }],
    };
    const openings = everyOpening(night);
    expect(openings.map((o) => o.where)).toEqual(['no flags; trust.netters=59', 'no flags; trust.netters=60']);
    expect(openings.map((o) => o.open.cards.some((c) => c.id === 'ad_fish'))).toEqual([false, true]);
    expect(openings[0].boards.map((b) => [b.aired, b.lines.length])).toEqual([[[], 3], [['news_wells'], 4]]);
  });

  it('tries confidences heard and not', () => {
    const [n1] = NIGHTS;
    const [board] = eventsOf(n1, 'switchboard');
    const night: NightDef = {
      ...n1,
      events: [{ ...board, lines: [...board.lines, { ...board.lines[2], id: 'extra', gate: { tonight: { flags: ['t_grace_ridge'] } } }] }],
    };
    expect(everyOpening(night)[0].boards.map((b) => [b.aired, b.lines.length])).toEqual([[[], 3], [['t_grace_ridge'], 4]]);
  });
});

describe('the run', () => {
  it('numbers nights in order and plays every record at most once across them', () => {
    expect(NIGHTS.map((n) => n.number)).toEqual(NIGHTS.map((_n, i) => i + 1));
    const recs = NIGHTS.flatMap((n) => n.cards.flatMap((c) => (c.kind === 'record' ? [c.recordId] : [])));
    expect(new Set(recs).size).toBe(recs.length);
  });
});

describe('records', () => {
  it('has unique ids', () => {
    const ids = RECORDS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only contains public-domain real records with full provenance', () => {
    expect(REAL_RECORDS.length).toBeGreaterThan(0);
    for (const r of REAL_RECORDS) {
      expect(r.year, r.id).toBeLessThanOrEqual(LATEST_PD_RECORDING_YEAR);
      for (const field of ['title', 'performer', 'label', 'composer', 'archiveId', 'sourceFile', 'file'] as const) {
        expect(r[field].trim().length, `${r.id}.${field}`).toBeGreaterThan(0);
      }
      expect(r.file, r.id).toMatch(/^[a-z0-9_]+\.mp3$/);
      expect(sourceUrl(r), r.id).toMatch(/^https:\/\/archive\.org\/details\//);
      expect(licenseNote(r), r.id).toContain(String(r.year));
      expect(['ragtime', 'waltz', 'blues', 'march', 'ballad'], r.id).toContain(r.fallback);
    }
  });

  it('can synthesize a stand-in for every record', () => {
    for (const r of RECORDS) expect(standInFor(r).style, r.id).toBeTruthy();
  });
});
