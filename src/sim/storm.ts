// Storms. Most of the night the transmitter holds 1260 by itself; when a squall
// comes off the lake the wind and the old tubes push it around and the player
// rides the dial.

import type { NightDef, StormEvent } from './types';
import { eventsOf } from './events';

export const CALM_WIND = 0;
export const STORM_WIND = 1.4;

/** Average signal through the storm at or above this counts as holding it. */
export const STORM_HELD = 0.85;
/** Below this the storm took the station off the air. */
export const STORM_LOST = 0.6;

/** The wind in a slot: STORM_WIND times the hardest storm blowing then (its `wind`, 1 by default). */
export function windForSlot(night: NightDef, slot: number): number {
  const blowing = eventsOf(night, 'storm').filter((s) => s.slots.includes(slot));
  return blowing.length ? STORM_WIND * Math.max(...blowing.map((s) => s.wind ?? 1)) : CALM_WIND;
}

/** Mean signal over one storm's slots. */
export function stormSignal(storm: StormEvent, signal: number[]): number {
  if (!storm.slots.length) return 1;
  const sum = storm.slots.reduce((s, slot) => s + Math.max(0, Math.min(1, signal[slot] ?? 1)), 0);
  return sum / storm.slots.length;
}
