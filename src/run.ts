// The current playthrough, shared between scenes.
import { NIGHT_1 } from './data/night1';
import { STARTING_STATE, cloneState } from './sim/resolver';
import type { NightDef, NightResult, TownState } from './sim/types';

export const run: { night: NightDef; town: TownState; result: NightResult | null } = {
  night: NIGHT_1,
  town: cloneState(STARTING_STATE),
  result: null,
};

export function resetRun(): void {
  run.night = NIGHT_1;
  run.town = cloneState(STARTING_STATE);
  run.result = null;
}
