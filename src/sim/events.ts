// Night events: the booth tasks a night schedules (switchboards, tubes, Morse, storms).
// A night lists any number of each. Storms are wind over whole slots (storm.ts); the
// others fire at a moment in the show, and the scene asks `eventsDue` when.

import type { NightDef, NightEvent, SwitchboardEvent } from './types';

/** Every event of one kind, in the night's order. */
export function eventsOf<K extends NightEvent['kind']>(night: NightDef, kind: K): Extract<NightEvent, { kind: K }>[] {
  return night.events.filter((e): e is Extract<NightEvent, { kind: K }> => e.kind === kind);
}

/** What the scene is doing when it asks: between items, or partway through a record or a talk item. */
export type ItemKind = 'record' | 'talk' | 'between';

/**
 * Which events fire now, in the night's order. The scene keeps the set of ids already
 * fired and adds each event it starts, so every event fires once.
 *
 * - `between`: just before item `slot` begins (`slot` may be SHOW_SLOTS, before sign-off).
 *   Fires events with no `frac` (or 0) at this slot, and anything whose moment has passed
 *   without firing: a switchboard that came due during talk (the board waits for the talk
 *   to end), or an event whose item ended before its fraction was reached.
 * - `record` / `talk`: `frac` (0..1) of item `slot` has played. Fires events at this slot
 *   with 0 < at.frac <= frac. A switchboard fires during a record (the record plays under
 *   the call) but not during talk.
 * - Storms never fire here.
 */
export function eventsDue(night: NightDef, fired: ReadonlySet<string>, slot: number, frac: number, itemKind: ItemKind): NightEvent[] {
  return night.events.filter((e) => {
    if (e.kind === 'storm' || fired.has(e.id)) return false;
    const at = e.at.frac ?? 0;
    if (itemKind === 'between') return e.at.slot < slot || (e.at.slot === slot && at <= 0);
    if (e.at.slot !== slot || at <= 0 || at > frac) return false;
    return !(e.kind === 'switchboard' && itemKind === 'talk');
  });
}

/**
 * The cards that have begun airing by the time this board rings, for a rundown that
 * plays straight through: the items before its slot, plus its own item if it rings
 * partway through (or after) it.
 */
export function airedWhenBoardOpens(board: SwitchboardEvent, rundown: readonly string[]): string[] {
  return rundown.slice(0, (board.at.frac ?? 0) > 0 ? board.at.slot + 1 : board.at.slot);
}
