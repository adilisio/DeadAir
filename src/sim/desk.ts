// The desk: every card that isn't in tonight's running order. Live, the player can pull
// one off the desk and put it on in place of the next item; the one it replaces goes
// back on the desk. Desk cards are checked against what has aired so far tonight each
// time the desk opens, so a card can wait for something else to go out first.

import { gateOpen } from './nights';
import type { Card, NightDef, ShowPerformance, TownState } from './types';

export type Swap = NonNullable<ShowPerformance['swaps']>[number];

/**
 * Cards on the desk now: not in the running order, and open for the town and tonight
 * (what has aired, and, when given, the confidences heard off air). With `slot`, the item
 * a pick would replace: a card whose group already has a card elsewhere in the show stays off.
 */
export function deskCards(
  night: NightDef,
  rundown: readonly string[],
  town: TownState,
  airedTonight: readonly string[],
  opts: { confidedTonight?: readonly string[]; slot?: number } = {},
): Card[] {
  const inShow = new Set(rundown);
  const groupOf = (id: string) => {
    const c = night.cards.find((k) => k.id === id);
    return c && c.kind !== 'record' ? c.group : undefined;
  };
  const taken = new Set(rundown.flatMap((id, i) => (i === opts.slot ? [] : [groupOf(id)])).filter((g): g is string => !!g));
  return night.cards.filter((c) => {
    if (inShow.has(c.id) || !gateOpen(c.gate, town.flags, { town, airedTonight, confidedTonight: opts.confidedTonight })) return false;
    return c.kind === 'record' || !c.group || !taken.has(c.group);
  });
}

/**
 * Put card `inId` on at `slot` instead of what's there. Returns the new running order and
 * the swap to record, or null if the slot is outside the show or the card is already in it.
 */
export function swapNext(rundown: readonly string[], slot: number, inId: string): { rundown: string[]; swap: Swap } | null {
  if (slot < 0 || slot >= rundown.length || rundown.includes(inId)) return null;
  const next = [...rundown];
  const out = next[slot];
  next[slot] = inId;
  return { rundown: next, swap: { slot, out, in: inId } };
}
