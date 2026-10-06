// The current playthrough, shared between scenes. The town (stats, trust, people and
// story flags) carries from one night to the next, and is saved between nights.
import { NIGHTS } from './data/nights';
import { STARTING_STATE, cloneState, resolveNight } from './sim/resolver';
import { openNight } from './sim/nights';
import { eventsOf } from './sim/events';
import { parseRun, serializeRun, type SavedRun } from './sim/save';
import type { NightDef, NightResult, TownState } from './sim/types';

export const run: { index: number; night: NightDef; town: TownState; result: NightResult | null } = {
  index: 0,
  night: openNight(NIGHTS[0], STARTING_STATE),
  town: cloneState(STARTING_STATE),
  result: null,
};

/** Begin night `index` (0-based) for this town. */
export function startNight(index: number, town: TownState): void {
  run.index = index;
  run.town = cloneState(town);
  run.night = openNight(NIGHTS[index], town);
  run.result = null;
}

export function hasNextNight(): boolean {
  return run.index + 1 < NIGHTS.length;
}

/** The night's over: keep the result, and save so a crash at dawn doesn't lose it. */
export function finishNight(result: NightResult): void {
  run.result = result;
  if (hasNextNight()) writeSave({ index: run.index + 1, town: result.after });
  else clearSave();
}

/** After dawn: carry the town into the next night. */
export function nextNight(): void {
  if (!run.result || !hasNextNight()) return;
  startNight(run.index + 1, run.result.after);
  saveRun();
}

export function resetRun(): void {
  startNight(0, STARTING_STATE);
}

// ───────────────────────────── Save ─────────────────────────────

export const SAVE_KEY = 'deadair.save';

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // blocked storage throws on access
  }
}

function writeSave(saved: SavedRun): void {
  try {
    storage()?.setItem(SAVE_KEY, serializeRun(saved));
  } catch {
    // Full or blocked storage: play on without a save.
  }
}

/** Save the run as it stands: the night about to be played and the town before it. */
export function saveRun(): void {
  writeSave({ index: run.index, town: run.town });
}

/** The saved run, if there is a usable one. */
export function savedRun(): SavedRun | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(SAVE_KEY) ?? null;
  } catch {
    return null;
  }
  const saved = parseRun(raw);
  return saved && saved.index < NIGHTS.length ? saved : null;
}

/** Continue the saved run. False (and nothing changes) if there isn't one. */
export function loadRun(): boolean {
  const saved = savedRun();
  if (!saved) return false;
  startNight(saved.index, saved.town);
  return true;
}

export function clearSave(): void {
  try {
    storage()?.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * The town as it would stand before night `index` if every earlier night went like its
 * ?auto show (all callers put on, Morse copied). For ?night=N.
 */
export function townBefore(index: number): TownState {
  let town = cloneState(STARTING_STATE);
  for (let i = 0; i < index; i++) {
    const night = openNight(NIGHTS[i], town);
    town = resolveNight(night, town, {
      rundown: night.rundowns.auto,
      signal: night.rundowns.auto.map(() => 1),
      deadAirSeconds: 0,
      calls: eventsOf(night, 'switchboard').flatMap((b) => b.lines.filter((l) => !l.turn).map((l) => ({ line: l.id }))),
      morse: eventsOf(night, 'morse').map((m) => ({ id: m.id, result: 'decoded' as const })),
    }).after;
  }
  return town;
}
