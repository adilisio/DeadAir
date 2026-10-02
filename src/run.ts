// The current playthrough, shared between scenes. The town (stats, trust and
// story flags) carries from one night to the next.
import { NIGHTS } from './data/nights';
import { STARTING_STATE, cloneState, resolveNight } from './sim/resolver';
import { openNight } from './sim/nights';
import type { NightDef, NightResult, TownState } from './sim/types';

export const run: { index: number; night: NightDef; town: TownState; result: NightResult | null } = {
  index: 0,
  night: openNight(NIGHTS[0], []),
  town: cloneState(STARTING_STATE),
  result: null,
};

/** Begin night `index` (0-based) for this town. */
export function startNight(index: number, town: TownState): void {
  run.index = index;
  run.town = cloneState(town);
  run.night = openNight(NIGHTS[index], town.flags);
  run.result = null;
}

export function hasNextNight(): boolean {
  return run.index + 1 < NIGHTS.length;
}

/** After dawn: carry the town into the next night. */
export function nextNight(): void {
  if (!run.result || !hasNextNight()) return;
  startNight(run.index + 1, run.result.after);
}

export function resetRun(): void {
  startNight(0, STARTING_STATE);
}

/**
 * The town as it would stand before night `index` if every earlier night went like its
 * ?auto show (all callers put on, Morse copied). For ?night=N.
 */
export function townBefore(index: number): TownState {
  let town = cloneState(STARTING_STATE);
  for (let i = 0; i < index; i++) {
    const night = openNight(NIGHTS[i], town.flags);
    town = resolveNight(night, town, {
      rundown: night.rundowns.auto,
      signal: night.rundowns.auto.map(() => 1),
      deadAirSeconds: 0,
      calls: night.switchboard.lines.filter((l) => !l.turn).map((l) => ({ line: l.id })),
      morse: night.morse ? 'decoded' : undefined,
    }).after;
  }
  return town;
}
