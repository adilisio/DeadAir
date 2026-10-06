// Voices: every spoken line is pre-rendered to a file (`npm run voices`, Kokoro TTS, one
// voice per person) and played through the Web Audio radio chain, so static, tuning and
// tube faults reach the voices the way they reach the records. See src/audio/lines.ts for
// how lines get their ids, and public/voice/README.md for dropping in recorded lines.
//
// Fallbacks, in order:
// - ?fast or ?mute: no audio at all; speak() waits a reading-speed delay so the show still
//   runs and the teleprompter still scrolls.
// - A line with no file (new or edited text, no index, audio not unlocked): the browser's
//   speechSynthesis, which plays straight to the speakers (no radio filter).

import { DEBUG } from '../config';
import { exposeDebug } from '../debugHook';
import { NIGHTS } from '../data/nights';
import { PEOPLE, type PersonId } from '../data/people';
import type { NightDef } from '../sim/types';
import { audio, type VoiceChannel, type VoiceHandle } from './engine';
import { charsSpokenAt, parseVoiceIndex, splitIntoKnown, voiceIdFor, voiceLines, type VoiceIndex } from './lines';

export interface SpeakOptions {
  /** Who is speaking (default the DJ). Picks the voice file, or the fallback's pitch and rate. */
  person?: PersonId;
  /** How the voice reaches the listener (default 'air'). See AudioEngine.playVoice. */
  channel?: VoiceChannel;
  /** Called with the character index of each word as it's spoken. */
  onWord?: (charIndex: number) => void;
}

export interface Speech {
  done: Promise<void>;
  cancel(): void;
  /** Estimated seconds to read, used for the teleprompter when word events aren't available. */
  estimate: number;
}

/** The Other Station's playback rate (engine.ts), which stretches its lines. */
const OTHER_RATE = 0.92;
/** Silence between joined lines (the Other Station reads several in a row). */
const JOIN_GAP = 0.35;

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = synth?.getVoices() ?? [];
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const preferred = [/natural/i, /google us english/i, /guy|davis|david|mark|daniel|alex/i, /en-us/i];
  for (const re of preferred) {
    const v = en.find((x) => re.test(x.name) || re.test(x.lang));
    if (v) return v;
  }
  return en[0] ?? voices[0] ?? null;
}

// Voices load asynchronously in Chrome.
synth?.addEventListener?.('voiceschanged', () => {});

export function readingSeconds(text: string, rate = 1): number {
  const words = text.trim().split(/\s+/).length;
  return (words / 2.6) / rate + 0.4;
}

// ─────────────────────────── Voice files ───────────────────────────

let index: VoiceIndex = { version: 1, lines: {} };
let indexLoad: Promise<void> | null = null;
/** Known line texts per person (from the nights' data) that have a file, for joined lines. */
let known: Map<PersonId, string[]> | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();
let plays = 0;

/** Fetches public/voice/index.json once. No index (or a bad one) means every line falls back. */
export function loadVoiceIndex(): Promise<void> {
  if (DEBUG.fast || DEBUG.mute) return Promise.resolve();
  indexLoad ??= fetch('voice/index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      index = parseVoiceIndex(json);
      known = null;
    })
    .catch(() => {});
  return indexLoad;
}

function knownTexts(person: PersonId): string[] {
  if (!known) {
    known = new Map();
    for (const l of voiceLines(NIGHTS)) {
      if (!index.lines[l.id]) continue;
      const list = known.get(l.person) ?? [];
      list.push(l.text);
      known.set(l.person, list);
    }
  }
  return known.get(person) ?? [];
}

/** The file ids that read this text: one line, or several known lines joined. Null if any is missing. */
function planFor(text: string, person: PersonId): string[] | null {
  const t = text.trim();
  const id = voiceIdFor(person, t);
  if (index.lines[id]) return [id];
  const parts = splitIntoKnown(t, knownTexts(person));
  return parts && parts.length ? parts.map((p) => voiceIdFor(person, p)) : null;
}

function decode(id: string): Promise<AudioBuffer> {
  let p = buffers.get(id);
  if (!p) {
    const entry = index.lines[id];
    p = fetch(`voice/${entry.file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((b) => audio.ctx!.decodeAudioData(b));
    p.catch(() => buffers.delete(id));
    buffers.set(id, p);
  }
  return p;
}

/** One buffer for a plan: the line itself, or its parts with short gaps between. */
async function bufferFor(ids: string[]): Promise<AudioBuffer> {
  const parts = await Promise.all(ids.map(decode));
  if (parts.length === 1) return parts[0];
  const ctx = audio.ctx!;
  const rate = parts[0].sampleRate;
  const gap = Math.round(JOIN_GAP * rate);
  const length = parts.reduce((n, b) => n + b.length, 0) + gap * (parts.length - 1);
  const out = ctx.createBuffer(1, length, rate);
  const data = out.getChannelData(0);
  let o = 0;
  for (const b of parts) {
    data.set(b.getChannelData(0), o);
    o += b.length + gap;
  }
  return out;
}

/** Fetch and decode a night's lines ahead of time (call once the audio is unlocked). */
export function prefetchVoices(night: NightDef): void {
  if (DEBUG.fast || DEBUG.mute) return;
  void (async () => {
    await loadVoiceIndex();
    if (!audio.ctx) return;
    for (const l of voiceLines([night])) if (index.lines[l.id]) await decode(l.id).catch(() => {});
  })();
}

// ─────────────────────────── speak ───────────────────────────

export function speak(text: string, opts: SpeakOptions = {}): Speech {
  const person = opts.person ?? 'dj';
  const channel = opts.channel ?? 'air';
  const pv = PEOPLE[person].voice;
  // The browser voice can't be filtered, so the Other Station's wrongness is pitch and pace.
  const synthPitch = channel === 'other' ? 0.4 : pv.pitch;
  const synthRate = channel === 'other' ? 0.82 : pv.rate;

  if (DEBUG.fast || DEBUG.mute) return timed(DEBUG.fast ? Math.min(2.5, readingSeconds(text, pv.rate)) : readingSeconds(text, pv.rate));

  const plan = audio.ctx ? planFor(text, person) : null;
  if (!plan) return speakSynth(text, opts, synthPitch, synthRate);

  const stretch = channel === 'other' ? 1 / OTHER_RATE : 1;
  const estimate = (plan.reduce((s, id) => s + index.lines[id].seconds, 0) + JOIN_GAP * (plan.length - 1)) * stretch;
  let cancelled = false;
  let handle: VoiceHandle | null = null;
  let fallback: Speech | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  const done = (async () => {
    let buffer: AudioBuffer;
    try {
      buffer = await bufferFor(plan);
    } catch (e) {
      if (cancelled) return;
      console.warn(`Voice file for "${text.slice(0, 40)}..." unavailable (${e}); using the browser voice.`);
      fallback = speakSynth(text, opts, synthPitch, synthRate);
      return fallback.done;
    }
    if (cancelled) return;
    handle = audio.playVoice(buffer, channel);
    exposeDebug('voicePlays', ++plays);
    const seconds = buffer.duration * stretch;
    const start = performance.now();
    timer = setInterval(() => opts.onWord?.(charsSpokenAt((performance.now() - start) / 1000, seconds, text)), 100);
    await handle.ended;
    clearInterval(timer);
  })();
  return {
    done,
    estimate,
    cancel: () => {
      cancelled = true;
      clearInterval(timer);
      handle?.stop();
      fallback?.cancel();
    },
  };
}

/** No voice at all: wait a reading-speed delay. */
function timed(estimate: number): Speech {
  let timer: ReturnType<typeof setTimeout>;
  let resolve!: () => void;
  const done = new Promise<void>((r) => {
    resolve = r;
    timer = setTimeout(r, estimate * 1000);
  });
  return { done, estimate, cancel: () => (clearTimeout(timer), resolve()) };
}

/** The browser's voice, sentence by sentence (Chrome cuts off long utterances). */
function speakSynth(text: string, opts: SpeakOptions, pitch: number, rate: number): Speech {
  const estimate = readingSeconds(text, rate);
  const voice = pickVoice();
  if (!synth || !voice) return timed(estimate);
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  let cancelled = false;
  let offset = 0;
  const done = (async () => {
    for (const sentence of sentences) {
      if (cancelled) break;
      const start = offset;
      offset += sentence.length;
      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(sentence);
        u.voice = voice;
        u.rate = rate;
        u.pitch = pitch;
        u.onboundary = (e) => opts.onWord?.(start + e.charIndex);
        u.onend = () => resolve();
        u.onerror = () => resolve();
        // Safety net if the engine never fires onend.
        setTimeout(resolve, (readingSeconds(sentence, rate) + 4) * 1000);
        synth.speak(u);
      });
    }
  })();
  return {
    done,
    estimate,
    cancel: () => {
      cancelled = true;
      synth.cancel();
    },
  };
}
