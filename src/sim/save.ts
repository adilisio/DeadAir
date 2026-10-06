// Save and continue. A run is the index of the night to play next and the town as it
// stands before it. The shape is versioned; anything missing or broken in a save is
// filled from the starting town, and a save that can't be read at all is ignored.

import { FACTIONS, type PersonRecord, type TownState } from './types';
import { STARTING_STATE, cloneState } from './resolver';
import { TUBE_TYPES } from './tube';
import { PEOPLE, type PersonId } from '../data/people';

export const SAVE_VERSION = 1;

export interface SavedRun {
  /** The night to play next (0-based). */
  index: number;
  /** The town before that night. */
  town: TownState;
}

export function serializeRun(run: SavedRun): string {
  return JSON.stringify({ version: SAVE_VERSION, index: run.index, town: run.town });
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown, fallback: number): number => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
const count = (x: unknown): number => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0);

export function parseRun(s: string | null | undefined): SavedRun | null {
  if (!s) return null;
  let data: unknown;
  try {
    data = JSON.parse(s);
  } catch {
    return null;
  }
  if (!isObj(data) || data.version !== SAVE_VERSION) return null;
  const { index, town: raw } = data;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || !isObj(raw)) return null;

  const town = cloneState(STARTING_STATE);
  for (const k of ['morale', 'safety', 'credibility', 'listeners', 'chits'] as const) town[k] = num(raw[k], town[k]);
  if (isObj(raw.trust)) for (const f of FACTIONS) town.trust[f] = num(raw.trust[f], town.trust[f]);
  if (Array.isArray(raw.flags)) town.flags = [...new Set(raw.flags.filter((f): f is string => typeof f === 'string'))];
  if (isObj(raw.people)) {
    for (const [id, rec] of Object.entries(raw.people)) {
      if (!(id in PEOPLE) || !isObj(rec)) continue;
      const r: PersonRecord = { aired: count(rec.aired), cut: count(rec.cut), dumped: count(rec.dumped), ignored: count(rec.ignored) };
      town.people[id as PersonId] = r;
    }
  }
  // The spares drawer (added after version 1 shipped): missing or broken counts keep the default.
  if (isObj(raw.spares)) {
    for (const t of TUBE_TYPES) {
      const v = raw.spares[t];
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0) town.spares[t] = v;
    }
  }
  return { index, town };
}
