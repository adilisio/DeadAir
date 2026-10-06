// The switchboard and the dump button. The station runs a few seconds behind
// what's said into the phone, so a caller dumped just after they turn never
// actually gets it out on air. Dump too late and it went out; dump someone who
// said nothing wrong and you cut them off. What you dump isn't gone: the sentence
// is kept (`dumpedSentence`), and some nights the Other Station reads it back.

import type { Card, CallLine, CallRecord, CallResult, Outcome, ReachCheck, SwitchboardEvent } from './types';
import { airedWhenBoardOpens } from './events';

/**
 * The delay, in characters of speech (about three seconds at reading pace). The scene
 * plays the on-air copy of a call DUMP_DELAY_SECONDS behind the handset; the two must agree.
 */
export const DUMP_DELAY_CHARS = 40;
/** The delay, in seconds: how far the on-air voice lags the handset. Agrees with DUMP_DELAY_CHARS. */
export const DUMP_DELAY_SECONDS = 3;

/** How long a line rings before giving up, unless it has its own `patience`. */
export const RING_SECONDS = 18;

/** Seconds this line keeps ringing before the caller gives up. */
export function patienceOf(line: CallLine, ring = RING_SECONDS): number {
  return line.patience ?? ring;
}

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

/**
 * The sentences of a text as [start, end) spans: from the first character through the
 * terminal punctuation (and any closing quote). Punctuation not followed by a space
 * ("W.L.M.P") doesn't end a sentence; trailing text without punctuation is a sentence.
 */
export function sentenceSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i >= text.length) break;
    let j = i;
    for (;;) {
      while (j < text.length && !/[.!?]/.test(text[j])) j++;
      while (j < text.length && /[.!?"')]/.test(text[j])) j++;
      if (j >= text.length || /\s/.test(text[j])) break;
    }
    let end = j;
    while (end > i && /\s/.test(text[end - 1])) end--;
    spans.push([i, end]);
    i = j;
  }
  return spans;
}

/** The sentences of a text, each whole. */
export function sentencesOf(text: string): string[] {
  return sentenceSpans(text).map(([a, b]) => text.slice(a, b));
}

/**
 * The sentence that was dumped: the one with the turn in it when the caller turns and the
 * dump came at or after the turn, otherwise the one being said when the dump came. Whole,
 * from its first character to its terminal punctuation.
 */
export function dumpedSentence(line: CallLine, dumpedAt: number): string {
  const text = line.script;
  const turn = turnIndex(line);
  const at = turn >= 0 && dumpedAt >= turn ? turn : Math.max(0, dumpedAt);
  const spans = sentenceSpans(text);
  if (!spans.length) return '';
  const [a, b] = spans.find(([, end]) => at < end) ?? spans[spans.length - 1];
  return text.slice(a, b);
}

/**
 * What came of a caller's record request, if the call aired: `played` when a record card
 * of that record airs after the board rang (a later slot than the item it rang in or
 * before), else `missed`. Null when the line asks for nothing.
 */
export function requestResult(board: SwitchboardEvent, line: CallLine, rundown: readonly string[], cards: readonly Card[]): Outcome | null {
  const req = line.request;
  if (!req) return null;
  const later = rundown.slice(airedWhenBoardOpens(board, rundown).length);
  const played = later.some((id) => {
    const card = cards.find((c) => c.id === id);
    return card?.kind === 'record' && card.recordId === req.recordId;
  });
  return played ? req.played : req.missed;
}
