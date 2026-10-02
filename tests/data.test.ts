import { describe, it, expect } from 'vitest';
import { NIGHTS } from '../src/data/nights';
import { validateRundown } from '../src/sim/resolver';
import { openNight } from '../src/sim/nights';
import { RECORDS, REAL_RECORDS, LATEST_PD_RECORDING_YEAR, licenseNote, resolveRecord, sourceUrl, standInFor } from '../src/data/records';
import { SHOW_SLOTS, type NightDef } from '../src/sim/types';
import { TUBE_TYPES } from '../src/sim/tube';
import { turnIndex } from '../src/sim/calls';
import { encode } from '../src/sim/morse';

/** Every flag any gate in this night mentions. */
function gateFlags(night: NightDef): string[] {
  const gates = [...night.cards.map((c) => c.gate), ...night.switchboard.lines.map((l) => l.gate)];
  return [...new Set(gates.flatMap((g) => [...(g?.requires ?? []), ...(g?.unless ?? [])]))];
}

/** The night opened for every combination of its gate flags. */
function everyOpening(night: NightDef): { flags: string[]; open: NightDef }[] {
  const flags = gateFlags(night);
  return Array.from({ length: 2 ** flags.length }, (_, mask) => {
    const set = flags.filter((_f, i) => mask & (1 << i));
    return { flags: set, open: openNight(night, set) };
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
    const open = openNight(night, []);
    expect(validateRundown(open, night.rundowns.auto)).toBeNull();
    expect(validateRundown(open, night.rundowns.demo)).toBeNull();
  });

  it('fills the crate and the board whatever happened before', () => {
    for (const { flags, open } of everyOpening(night)) {
      const where = flags.join(',') || 'no flags';
      expect(open.cards.length, where).toBeGreaterThan(SHOW_SLOTS);
      expect(open.cards.length, where).toBeLessThanOrEqual(15); // what the prep crate can show
      expect(open.switchboard.lines.length, where).toBeGreaterThanOrEqual(2);
      expect(open.switchboard.lines.length, where).toBeLessThanOrEqual(3); // keys 1-3
      expect(open.otherStation.prefer.length, where).toBeGreaterThan(0);
    }
  });

  it('schedules its booth tasks inside the show', () => {
    const { tube, storm, morse, switchboard } = night;
    const inShow = (s: number) => s >= 0 && s < SHOW_SLOTS;
    expect(inShow(switchboard.slot)).toBe(true);
    if (tube) {
      expect(inShow(tube.slot)).toBe(true);
      expect(tube.at > 0 && tube.at < 1).toBe(true);
      expect(tube.socket >= 0 && tube.socket < TUBE_TYPES.length).toBe(true);
    }
    for (const s of storm?.slots ?? []) expect(inShow(s), String(s)).toBe(true);
    if (morse) {
      expect(inShow(morse.slot)).toBe(true);
      expect(() => encode(morse.word)).not.toThrow();
      // A and D tune the dial; keep them out of the word so tuning never counts as a guess.
      expect(morse.word).not.toMatch(/[AD]/i);
    }
  });

  it('has a switchboard of distinct lines whose turns appear in their scripts', () => {
    const { lines } = night.switchboard;
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    for (const l of lines) {
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
