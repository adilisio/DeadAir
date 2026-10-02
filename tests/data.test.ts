import { describe, it, expect } from 'vitest';
import { NIGHT_1, NIGHT_1_AUTO_RUNDOWN, NIGHT_1_DEMO_RUNDOWN } from '../src/data/night1';
import { validateRundown } from '../src/sim/resolver';
import { RECORDS, REAL_RECORDS, LATEST_PD_RECORDING_YEAR, licenseNote, resolveRecord, sourceUrl, standInFor } from '../src/data/records';
import { SHOW_SLOTS } from '../src/sim/types';

describe('night 1 content', () => {
  it('has unique card ids and more cards than slots', () => {
    const ids = NIGHT_1.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(SHOW_SLOTS);
  });

  it('only references records that exist', () => {
    for (const c of NIGHT_1.cards) if (c.kind === 'record') expect(resolveRecord(c.recordId), c.id).toBeDefined();
  });

  it('gives every talk card a script and every card a blurb', () => {
    for (const c of NIGHT_1.cards) {
      expect(c.blurb.length, c.id).toBeGreaterThan(0);
      if (c.kind !== 'record') expect(c.script.length, c.id).toBeGreaterThan(20);
    }
  });

  it('has valid auto-play and demo rundowns', () => {
    expect(validateRundown(NIGHT_1, NIGHT_1_AUTO_RUNDOWN)).toBeNull();
    expect(validateRundown(NIGHT_1, NIGHT_1_DEMO_RUNDOWN)).toBeNull();
  });

  it('points the caller and the Other Station at real things', () => {
    expect(NIGHT_1.caller.slot).toBeGreaterThanOrEqual(0);
    expect(NIGHT_1.caller.slot).toBeLessThan(SHOW_SLOTS);
    const ids = new Set(NIGHT_1.cards.map((c) => c.id));
    for (const id of NIGHT_1.otherStation.prefer) expect(ids.has(id), id).toBe(true);
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
