// The record library. Two kinds:
//
// - Stand-in pressings: synthesized in code (src/audio/pressings.ts). Invented
//   titles and performers, clearly marked. Used until real 78s are added.
// - Real records: public-domain audio files in public/records/ with full
//   provenance. Rules: public/records/README.md. Enforced by tests/records.test.ts.

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
  /** File name in public/records/. */
  file: string;
  /** Year first published. Must be <= LATEST_PD_RECORDING_YEAR. */
  year: number;
  composer: string;
  /** Where the file came from. */
  sourceUrl: string;
  /** Why it's public domain, in a sentence. */
  licenseNote: string;
  /** Optional: substitute this record for a stand-in id. */
  replaces?: string;
}

export type RecordEntry = StandInRecord | RealRecord;

/** US sound recordings published before 1926 are public domain as of 2026. */
export const LATEST_PD_RECORDING_YEAR = 1925;

export const RECORDS: RecordEntry[] = [
  { id: 'breakwater_rag', standIn: true, title: 'Breakwater Rag', performer: 'The Clemency Point Players', style: 'ragtime', seed: 11 },
  { id: 'lamp_is_lit', standIn: true, title: 'The Lamp Is Lit', performer: 'Ada Morrow & Orchestra', style: 'waltz', seed: 23 },
  { id: 'volunteers_march', standIn: true, title: 'Clemency Volunteers March', performer: 'Port Clemency Civic Band', style: 'march', seed: 37 },
  { id: 'copper_wire_blues', standIn: true, title: 'Copper Wire Blues', performer: '"Tall" Benny Okafor', style: 'blues', seed: 41 },
  { id: 'far_shore', standIn: true, title: 'Light Me to the Far Shore', performer: 'Margaret Vail', style: 'ballad', seed: 53 },

  // Real records go here, e.g.:
  // {
  //   id: 'some_song', standIn: false, title: '…', performer: '…', file: 'some_song.mp3',
  //   year: 1921, composer: '…', sourceUrl: 'https://…', licenseNote: 'Published 1921; US public domain.',
  //   replaces: 'breakwater_rag',
  // },
];

/** Resolves a record id, preferring a real record that replaces a stand-in. */
export function resolveRecord(id: string): RecordEntry | undefined {
  return RECORDS.find((r) => !r.standIn && r.replaces === id) ?? RECORDS.find((r) => r.id === id);
}
