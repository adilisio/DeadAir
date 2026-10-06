// Every line that is spoken in the game, and the ids their voice files go by.
//
// Pure (no DOM, no Web Audio, no Node APIs), so the offline renderer (tools/voices.ts),
// the runtime (voice.ts) and the tests all agree on the same ids.
//
// A line's id is a hash of the voice that reads it and the words: change either and the
// line gets a new id, so `npm run voices` renders only what changed.

import { PEOPLE, type PersonId } from '../data/people';
import type { CallLine, NightDef } from '../sim/types';

export interface VoiceLine {
  id: string;
  person: PersonId;
  text: string;
}

/** One rendered (or recorded) line in public/voice/index.json. */
export interface VoiceEntry {
  file: string;
  seconds: number;
  person?: string;
}

export interface VoiceIndex {
  version: 1;
  lines: Record<string, VoiceEntry>;
}

/** 32-bit FNV-1a over UTF-8 bytes, from a given offset basis. */
function fnv1a(bytes: Uint8Array, basis: number): number {
  let h = basis >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A stable 16-hex-char hash (two FNV-1a 32s with different bases). */
export function hash16(s: string): string {
  const bytes = new TextEncoder().encode(s);
  const a = fnv1a(bytes, 0x811c9dc5);
  const b = fnv1a(bytes, 0x050c5d1f);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** The id a line's voice file goes by: who reads it, how fast, and the words. */
export function voiceIdFor(person: PersonId, text: string): string {
  const v = PEOPLE[person].voice;
  return hash16(`${v.kokoro}|${v.rate}|${text}`);
}

/**
 * The night's callers. Isolated so it's the one place to change when the switchboard
 * becomes one of several night events (`events: { kind: 'switchboard', lines }[]`):
 * collect the lines of every switchboard event here instead.
 */
export function callerLines(night: NightDef): CallLine[] {
  return night.switchboard?.lines ?? [];
}

/** Every spoken line of these nights, deduped by id, in a stable order. */
export function voiceLines(nights: NightDef[]): VoiceLine[] {
  const out = new Map<string, VoiceLine>();
  const add = (person: PersonId, text: string | undefined) => {
    const t = text?.trim();
    if (!t) return;
    const id = voiceIdFor(person, t);
    if (!out.has(id)) out.set(id, { id, person, text: t });
  };
  for (const night of nights) {
    add('dj', night.signOn);
    add('dj', night.signOff);
    for (const card of night.cards) if (card.kind !== 'record') add('dj', card.script);
    for (const line of callerLines(night)) {
      add(line.person, line.preview);
      add(line.person, line.script);
    }
    // The Other Station speaks in the DJ's voice; the wrongness is applied at playback.
    add('dj', night.otherStation.intro);
    add('dj', night.otherStation.stamp);
    add('dj', night.otherStation.outro);
  }
  return [...out.values()];
}

/** Reads index.json's contents; anything missing or malformed reads as an empty index. */
export function parseVoiceIndex(json: unknown): VoiceIndex {
  const index: VoiceIndex = { version: 1, lines: {} };
  if (!json || typeof json !== 'object') return index;
  const lines = (json as { lines?: unknown }).lines;
  if (!lines || typeof lines !== 'object') return index;
  for (const [id, e] of Object.entries(lines as Record<string, unknown>)) {
    if (!e || typeof e !== 'object') continue;
    const { file, seconds, person } = e as Record<string, unknown>;
    if (typeof file !== 'string' || !file || typeof seconds !== 'number' || !(seconds > 0)) continue;
    index.lines[id] = typeof person === 'string' ? { file, seconds, person } : { file, seconds };
  }
  return index;
}

/**
 * Characters spoken after `elapsed` of `seconds`, assuming an even pace, snapped forward
 * to the end of the word in progress (so a word lights up whole).
 */
export function charsSpokenAt(elapsed: number, seconds: number, text: string): number {
  if (!(seconds > 0) || elapsed >= seconds) return text.length;
  if (elapsed <= 0) return 0;
  const raw = Math.floor((elapsed / seconds) * text.length);
  if (raw <= 0) return 0;
  if (raw >= text.length) return text.length;
  if (/\s/.test(text[raw]) || /\s/.test(text[raw - 1])) return raw;
  const m = /\s/.exec(text.slice(raw));
  return m ? raw + m.index : text.length;
}

/**
 * Splits `text` into a run of known lines joined by spaces (the Other Station's script is
 * intro + stamp + a card + outro), or null if it can't be covered. Prefers fewer parts.
 */
export function splitIntoKnown(text: string, known: Iterable<string>): string[] | null {
  const parts = [...new Set(known)].filter(Boolean).sort((a, b) => b.length - a.length);
  const memo = new Map<number, string[] | null>();
  const from = (i: number): string[] | null => {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i >= text.length) return [];
    if (memo.has(i)) return memo.get(i)!;
    let best: string[] | null = null;
    for (const p of parts) {
      if (!text.startsWith(p, i)) continue;
      const end = i + p.length;
      if (end < text.length && !/\s/.test(text[end])) continue;
      const rest = from(end);
      if (rest && (!best || rest.length + 1 < best.length)) best = [p, ...rest];
    }
    memo.set(i, best);
    return best;
  };
  return from(0);
}
