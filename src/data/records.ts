// The record library. Two kinds:
//
// - Real records: public-domain 78s listed in records.json, downloaded into
//   public/records/ by `npm run records` (tools/fetch-records.mjs). Rules:
//   public/records/README.md. Enforced by tests/data.test.ts.
// - Stand-in pressings: synthesized in code (src/audio/pressings.ts). Used as a
//   real record's fallback if its file is missing, and for anything still unrecorded.

import catalog from './records.json';

export type PressingStyle = 'ragtime' | 'waltz' | 'blues' | 'march' | 'ballad';

export interface StandInRecord {
  id: string;
  standIn: true;
  title: string;
  performer: string;
  style: PressingStyle;
  seed: number;
}

export interface RealRecord {
  id: string;
  standIn: false;
  title: string;
  performer: string;
  /** Year first published. Must be <= LATEST_PD_RECORDING_YEAR. */
  year: number;
  /** Label and matrix/catalog number as the source lists them. */
  label: string;
  /** Who wrote the song, and when it was published. */
  composer: string;
  /** archive.org item identifier and the file within it. */
  archiveId: string;
  sourceFile: string;
  /** File name in public/records/. */
  file: string;
  /** Stand-in style to synthesize if the file can't be loaded. */
  fallback: PressingStyle;
}

export type RecordEntry = StandInRecord | RealRecord;

/** US sound recordings published before 1926 are public domain as of 2026. */
export const LATEST_PD_RECORDING_YEAR = 1925;

const STAND_INS: StandInRecord[] = [
  { id: 'breakwater_rag', standIn: true, title: 'Breakwater Rag', performer: 'The Vesper Point Players', style: 'ragtime', seed: 11 },
  { id: 'lamp_is_lit', standIn: true, title: 'The Lamp Is Lit', performer: 'Ada Morrow & Orchestra', style: 'waltz', seed: 23 },
  { id: 'volunteers_march', standIn: true, title: 'Vesper Volunteers March', performer: 'Port Vesper Civic Band', style: 'march', seed: 37 },
  { id: 'copper_wire_blues', standIn: true, title: 'Copper Wire Blues', performer: '"Tall" Benny Okafor', style: 'blues', seed: 41 },
  { id: 'far_shore', standIn: true, title: 'Light Me to the Far Shore', performer: 'Margaret Vail', style: 'ballad', seed: 53 },
];

export const REAL_RECORDS: RealRecord[] = catalog.records.map((r) => ({ ...r, standIn: false as const, fallback: r.fallback as PressingStyle }));

export const RECORDS: RecordEntry[] = [...REAL_RECORDS, ...STAND_INS];

export function resolveRecord(id: string): RecordEntry | undefined {
  return RECORDS.find((r) => r.id === id);
}

export function sourceUrl(r: RealRecord): string {
  return `https://archive.org/details/${r.archiveId}`;
}

export function licenseNote(r: RealRecord): string {
  return `US sound recording first published ${r.year}: public domain in the US (recordings published before ${LATEST_PD_RECORDING_YEAR + 1}). Song by ${r.composer}: public domain.`;
}

/** A stand-in to synthesize for any record: itself, or a real record's fallback. */
export function standInFor(r: RecordEntry): StandInRecord {
  if (r.standIn) return r;
  const seed = [...r.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 1000;
  return { id: `${r.id}__fallback`, standIn: true, title: r.title, performer: r.performer, style: r.fallback, seed };
}
