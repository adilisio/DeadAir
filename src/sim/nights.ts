// Nights in a run. Each night's content can depend on what earlier nights did:
// cards and callers carry a `gate` on story flags and town stats, and a night is
// "opened" against the town before prep, leaving only what's in play. Switchboard
// lines can also gate on what has aired so far tonight and on what callers confided
// off air tonight; the board re-checks them when it rings (`linesOpenNow`).

import type { CallLine, Gate, Letter, NightDef, StatName, SwitchboardEvent, TownState } from './types';

/** What a gate can be checked against beyond flags. A clause whose context is missing is left open. */
export interface GateContext {
  town?: TownState;
  airedTonight?: readonly string[];
  /** Confidences heard off air so far tonight (`t_<flag>`). */
  confidedTonight?: readonly string[];
}

/** A town number by its gate name (`trust.chapel` and so on). */
export function statValue(town: TownState, stat: StatName): number {
  if (stat.startsWith('trust.')) return town.trust[stat.slice(6) as keyof TownState['trust']] ?? NaN;
  return town[stat as Exclude<StatName, `trust.${string}`>] ?? NaN;
}

export function gateOpen(gate: Gate | undefined, flags: readonly string[], ctx: GateContext = {}): boolean {
  if (!gate) return true;
  if (!(gate.requires ?? []).every((f) => flags.includes(f))) return false;
  if ((gate.unless ?? []).some((f) => flags.includes(f))) return false;
  const town = ctx.town;
  if (town && gate.when) {
    for (const { stat, min, max } of gate.when) {
      const v = statValue(town, stat);
      if (Number.isNaN(v)) return false;
      if (min !== undefined && v < min) return false;
      if (max !== undefined && v > max) return false;
    }
  }
  const aired = ctx.airedTonight;
  if (aired && gate.tonight) {
    if (!(gate.tonight.aired ?? []).every((id) => aired.includes(id))) return false;
    if ((gate.tonight.notAired ?? []).some((id) => aired.includes(id))) return false;
  }
  const confided = ctx.confidedTonight;
  if (confided && gate.tonight?.flags) {
    if (!gate.tonight.flags.every((f) => confided.includes(f))) return false;
  }
  return true;
}

/**
 * The lines on this board that ring now, given the town, what's aired so far tonight and
 * (when known) the confidences heard tonight. Without `confidedTonight` that clause is open.
 */
export function linesOpenNow(board: SwitchboardEvent, town: TownState, airedTonight: readonly string[], confidedTonight?: readonly string[]): CallLine[] {
  return board.lines.filter((l) => gateOpen(l.gate, town.flags, { town, airedTonight, confidedTonight }));
}

/**
 * The night as it plays for this town: cards, callers, events and the Other Station's
 * intrusions whose flags or stats don't allow them removed. Tonight-gates are left for
 * the board (and the desk) to check live.
 */
export function openNight(night: NightDef, town: TownState): NightDef {
  const ctx = { town };
  const open = (g: Gate | undefined) => gateOpen(g, town.flags, ctx);
  const cards = night.cards.filter((c) => open(c.gate));
  const ids = new Set(cards.map((c) => c.id));
  const intrusions = night.otherStation.intrusions;
  return {
    ...night,
    cards,
    events: night.events
      .filter((e) => open(e.gate))
      .map((e) => (e.kind === 'switchboard' ? { ...e, lines: e.lines.filter((l) => open(l.gate)) } : e)),
    otherStation: {
      ...night.otherStation,
      prefer: night.otherStation.prefer.filter((id) => ids.has(id)),
      ...(intrusions ? { intrusions: intrusions.filter((i) => open(i.gate)) } : {}),
    },
  };
}

/** The listener's letter (a night's, or the one the night's result chose), with the Other Station's words in it. */
export function letterText(from: NightDef | Letter, quote: string): string {
  const letter = 'letter' in from ? from.letter : from;
  return letter.body.replace('{quote}', quote);
}
