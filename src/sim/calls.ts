// The switchboard and the dump button. The station runs a few seconds behind
// what's said into the phone, so a caller dumped just after they turn never
// actually gets it out on air. Dump too late and it went out; dump someone who
// said nothing wrong and you cut them off.

import type { CallLine, CallRecord, CallResult, Outcome, ReachCheck } from './types';

/** The delay, in characters of speech (about three seconds at reading pace). */
export const DUMP_DELAY_CHARS = 40;

/** Where a caller turns, as a character index into their script (-1 if they don't). */
export function turnIndex(line: CallLine): number {
  return line.turn ? line.script.indexOf(line.turn.at) : -1;
}

export function callResult(line: CallLine, rec: CallRecord | undefined): CallResult {
  if (!rec) return 'notTaken';
  if (rec.dumpedAt === undefined) return 'aired';
  if (!line.turn) return 'cut';
  return rec.dumpedAt <= turnIndex(line) + DUMP_DELAY_CHARS ? 'caught' : 'late';
}

export function isReachCheck(x: ReachCheck | Outcome): x is ReachCheck {
  return 'faction' in x;
}
