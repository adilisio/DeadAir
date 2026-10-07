// The Other Station during the show. A night can put a second carrier on the dial for
// some slots (`carrier`), or have it take the frequency for a while (`override`). The
// last night's `climax` takes it too, and the player decides: hold the dial against it,
// let it through, or talk over it. Pure: the scene asks when, how loud and for how long;
// the resolver says what the town heard.

import type { ItemKind } from './events';
import type { ClimaxResult, Intrusion, NightDef } from './types';

/** Where the second carrier sits on the dial (tuning error units; about 1250 on the gauge). */
export const OTHER_OFFSET = -0.55;
/** How far from the second carrier it still comes through at all (error units). */
export const BLEED_WIDTH = 0.5;
/** Average bleed over a carrier's slots at or above this: the town heard it. */
export const OTHER_HEARD = 0.35;
/** Holding the dial at full input the whole override, on a healthy tube, cuts it by this much. */
export const HOLD_RELIEF = 0.4;
/** Held at least this much of an override counts as leaning on the dial (a dawn line). */
export const HARD_HOLD = 0.6;
/** Held at least this much of the climax (at full input) jams it. */
export const CLIMAX_HOLD = 0.75;
/** Held less than this much of the climax is a touch on the dial, not an attempt: it was let through. */
export const CLIMAX_TRIED = 0.1;
/** While the dial is held against the climax the town hears static: the station's signal counts at this. */
export const JAM_SIGNAL = 0.5;

export type CarrierIntrusion = Extract<Intrusion, { kind: 'carrier' }>;
export type TimedIntrusion = Exclude<Intrusion, CarrierIntrusion>;
export type ClimaxIntrusion = Extract<Intrusion, { kind: 'climax' }>;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Every intrusion a night has, in its order. */
export function intrusionsOf(night: NightDef): Intrusion[] {
  return night.otherStation.intrusions ?? [];
}

/**
 * How much of the second carrier the town hears through yours, 0..1. Nothing on 1260;
 * it rises as the dial drifts toward 1250, and a weak tube lets more of it through.
 */
export function bleed(error: number, tubeStrength: number): number {
  const near = clamp01(1 - Math.abs(error - OTHER_OFFSET) / BLEED_WIDTH);
  return near * (0.7 + 0.3 * (1 - clamp01(tubeStrength)));
}

/** The carrier on the dial during this slot, or null. */
export function carrierForSlot(night: NightDef, slot: number): CarrierIntrusion | null {
  return intrusionsOf(night).find((i): i is CarrierIntrusion => i.kind === 'carrier' && i.slots.includes(slot)) ?? null;
}

/**
 * Which overrides (and climaxes) start now, in the night's order. Same rules as
 * `eventsDue`: between items, anything at this slot with no `frac` and anything whose
 * moment passed; partway through an item, anything at this slot with 0 < frac <= `frac`.
 * The scene adds each id it starts to `fired`. Carriers never fire here.
 */
export function intrusionsDue(night: NightDef, fired: ReadonlySet<string>, slot: number, frac: number, itemKind: ItemKind): TimedIntrusion[] {
  return intrusionsOf(night).filter((i): i is TimedIntrusion => {
    if (i.kind === 'carrier' || fired.has(i.id)) return false;
    const at = i.at.frac ?? 0;
    if (itemKind === 'between') return i.at.slot < slot || (i.at.slot === slot && at <= 0);
    return i.at.slot === slot && at > 0 && at <= frac;
  });
}

/**
 * How long an override lasts: `seconds × (1 − 0.4 × held × tubeStrength)`, where `held`
 * is the fraction of it the dial was held hard against it.
 */
export function overrideSeconds(seconds: number, held: number, tubeStrength: number): number {
  return seconds * (1 - HOLD_RELIEF * clamp01(held) * clamp01(tubeStrength));
}

/**
 * The climax's outcome. Talking over it (SPACE) wins whatever the dial did; else holding at
 * least CLIMAX_HOLD of it jams it; holding some (CLIMAX_TRIED or more) and letting go fails;
 * less than that is letting it through.
 */
export function climaxResult(held: number, countered: boolean): ClimaxResult {
  if (countered) return 'countered';
  if (held >= CLIMAX_HOLD) return 'jammed';
  return held >= CLIMAX_TRIED ? 'failed' : 'carried';
}

/**
 * What an override reads: its own card if it names one that is tonight's and not aired
 * yet, else the first preferred card not aired yet, else nothing.
 */
export function overrideCard(night: NightDef, airedTonight: readonly string[], wanted?: string): string | null {
  const talk = new Set(night.cards.filter((c) => c.kind !== 'record').map((c) => c.id));
  const aired = new Set(airedTonight);
  const open = (id: string) => talk.has(id) && !aired.has(id);
  if (wanted && open(wanted)) return wanted;
  return night.otherStation.prefer.find(open) ?? null;
}

/** Show time in minutes past midnight: 8 PM plus 70 minutes a slot, like the booth clock. */
export function showMinutes(slot: number, frac = 0): number {
  return 20 * 60 + (slot + frac) * 70;
}

/** "9:10 PM" for minutes past midnight (wraps past midnight). */
export function formatClock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** The clock text for a moment in the show. */
export function clockText(slot: number, frac = 0): string {
  return formatClock(showMinutes(slot, frac));
}
