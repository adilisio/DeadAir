// Nights in a run. Each night's content can depend on what earlier nights did:
// cards and callers carry a `gate` on story flags, and a night is "opened"
// against the town's flags before prep, leaving only what's in play.

import type { Gate, NightDef } from './types';

export function gateOpen(gate: Gate | undefined, flags: readonly string[]): boolean {
  if (!gate) return true;
  return (gate.requires ?? []).every((f) => flags.includes(f)) && !(gate.unless ?? []).some((f) => flags.includes(f));
}

/** The night as it plays for a town with these flags: gated cards and callers removed. */
export function openNight(night: NightDef, flags: readonly string[]): NightDef {
  const cards = night.cards.filter((c) => gateOpen(c.gate, flags));
  const ids = new Set(cards.map((c) => c.id));
  return {
    ...night,
    cards,
    switchboard: { ...night.switchboard, lines: night.switchboard.lines.filter((l) => gateOpen(l.gate, flags)) },
    otherStation: { ...night.otherStation, prefer: night.otherStation.prefer.filter((id) => ids.has(id)) },
  };
}

/** The listener's letter, with the Other Station's words in it. */
export function letterText(night: NightDef, quote: string): string {
  return night.letter.body.replace('{quote}', quote);
}
