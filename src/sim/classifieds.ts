// The classifieds: small ads in the morning paper, where the station's chits buy a spare
// tube for the drawer or a record for a later night's crate. Each ad sells once.

import { cloneState } from './resolver';
import { gateOpen } from './nights';
import type { Classified, NightDef, TownState } from './types';

/** Set once an ad has been answered, so it can't be bought twice. */
export const boughtFlag = (c: Classified): string => `bought_${c.id}`;
/** Set when the station owns a record; later nights' crates gate on it. */
export const ownsFlag = (recordId: string): string => `owns_${recordId}`;

/** The night's ads open for the town as it woke up. */
export function classifiedsFor(night: NightDef, town: TownState): Classified[] {
  return (night.classifieds ?? []).filter((c) => gateOpen(c.gate, town.flags, { town }));
}

export function alreadyBought(town: TownState, c: Classified): boolean {
  return town.flags.includes(boughtFlag(c)) || (!!c.gives.record && town.flags.includes(ownsFlag(c.gives.record)));
}

export function canBuy(town: TownState, c: Classified): boolean {
  return town.chits >= c.cost && !alreadyBought(town, c);
}

/** The town after answering the ad, or null if it can't (chits short, or already bought). */
export function buy(town: TownState, c: Classified): TownState | null {
  if (!canBuy(town, c)) return null;
  const t = cloneState(town);
  t.chits -= c.cost;
  if (c.gives.spare) t.spares[c.gives.spare] = (t.spares[c.gives.spare] ?? 0) + 1;
  if (c.gives.record) t.flags.push(ownsFlag(c.gives.record));
  t.flags.push(boughtFlag(c));
  return t;
}
