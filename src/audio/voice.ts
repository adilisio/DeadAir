// The DJ's voice, v1: the browser's built-in speech synthesis.
//
// Limits, honestly: speechSynthesis plays straight to the speakers, so it can't be
// filtered like the records. The radio feel comes from static and crackle under it.
// Upgrade path (DESIGN.md): in-browser neural TTS rendered to buffers, or recorded lines.
//
// If there's no voice (headless, muted, ?fast), speak() waits a reading-speed delay so
// the show still runs and the teleprompter still scrolls.

import { DEBUG } from '../config';

export interface SpeakOptions {
  pitch?: number;
  rate?: number;
  /** Called with the character index of each word as it's spoken (when supported). */
  onWord?: (charIndex: number) => void;
}

export interface Speech {
  done: Promise<void>;
  cancel(): void;
  /** Estimated seconds to read, used for the teleprompter when word events aren't available. */
  estimate: number;
}

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

export function speak(text: string, opts: SpeakOptions = {}): Speech {
  const rate = opts.rate ?? 0.98;
  const estimate = DEBUG.fast ? Math.min(2.5, readingSeconds(text, rate)) : readingSeconds(text, rate);
  const voice = pickVoice();

  if (DEBUG.fast || DEBUG.mute || !synth || !voice) {
    let timer: ReturnType<typeof setTimeout>;
    let resolve!: () => void;
    const done = new Promise<void>((r) => {
      resolve = r;
      timer = setTimeout(r, estimate * 1000);
    });
    return { done, estimate, cancel: () => (clearTimeout(timer), resolve()) };
  }

  // Chrome cuts off long utterances, so speak sentence by sentence.
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
        u.pitch = opts.pitch ?? 0.95;
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
