// Needle drop. When a record comes up, the tonearm swings in from its rest; drop
// it on the lead-in groove. Too early skates across the rim on air; too late
// lands in the song and the intro is gone. Positions are 0 (rest) .. 1 (label).

import type { NeedleResult } from './types';

export const NEEDLE = {
  /** The lead-in groove, as a fraction of the arm's travel. */
  groove: [0.34, 0.48] as const,
  /** Seconds the arm takes to reach the label; each record picks one in this range. */
  sweep: [1.7, 2.5] as const,
  /** Dropping just short of the label skips this much of the record. */
  maxSkipSeconds: 12,
};

/** Where the arm is after `t` seconds of a `sweepSeconds` swing. */
export function armPosition(t: number, sweepSeconds: number): number {
  return Math.max(0, Math.min(1, t / Math.max(0.1, sweepSeconds)));
}

export function sweepFor(rand: () => number): number {
  const [a, b] = NEEDLE.sweep;
  return a + rand() * (b - a);
}

export function needleResult(pos: number): NeedleResult {
  const [g0, g1] = NEEDLE.groove;
  if (pos < g0 || pos >= 1) return 'scratch';
  return pos <= g1 ? 'clean' : 'late';
}

/** Seconds of the record lost to a late drop. */
export function lateSkip(pos: number): number {
  if (needleResult(pos) !== 'late') return 0;
  const g1 = NEEDLE.groove[1];
  return ((pos - g1) / (1 - g1)) * NEEDLE.maxSkipSeconds;
}
