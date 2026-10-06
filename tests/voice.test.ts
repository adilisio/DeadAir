import { describe, it, expect } from 'vitest';
import { NIGHTS } from '../src/data/nights';
import { NIGHT_1 } from '../src/data/night1';
import { PEOPLE } from '../src/data/people';
import { resolveNight, STARTING_STATE } from '../src/sim/resolver';
import { charsSpokenAt, hash16, parseVoiceIndex, splitIntoKnown, voiceIdFor, voiceLines, callerLines } from '../src/audio/lines';

const all = voiceLines(NIGHTS);
const has = (person: string, text: string) => all.some((l) => l.person === person && l.text === text.trim());

describe('voiceLines', () => {
  it('collects every spoken line of every night', () => {
    for (const night of NIGHTS) {
      expect(has('dj', night.signOn)).toBe(true);
      expect(has('dj', night.signOff)).toBe(true);
      for (const card of night.cards) if (card.kind !== 'record') expect(has('dj', card.script), card.id).toBe(true);
      for (const line of callerLines(night)) {
        expect(has(line.person, line.preview), line.id).toBe(true);
        expect(has(line.person, line.script), line.id).toBe(true);
      }
      for (const part of [night.otherStation.intro, night.otherStation.stamp, night.otherStation.outro]) expect(has('dj', part)).toBe(true);
    }
  });

  it('skips records and dedupes repeated lines', () => {
    const ids = all.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The Other Station's intro and outro are the same on both nights.
    expect(all.filter((l) => l.text === NIGHTS[0].otherStation.intro)).toHaveLength(1);
    expect(voiceLines([NIGHT_1, NIGHT_1])).toEqual(voiceLines([NIGHT_1]));
  });

  it('gives each line a stable 16-hex id that voiceIdFor reproduces', () => {
    for (const l of all) {
      expect(l.id).toMatch(/^[0-9a-f]{16}$/);
      expect(voiceIdFor(l.person, l.text)).toBe(l.id);
    }
    expect(voiceIdFor('dj', 'This is the Lamp. Twelve-sixty.')).toBe(voiceIdFor('dj', 'This is the Lamp. Twelve-sixty.'));
    expect(hash16('')).toBe('811c9dc5050c5d1f');
  });

  it('changes the id when the words or the voice change', () => {
    const t = 'Stay close.';
    expect(voiceIdFor('dj', t)).not.toBe(voiceIdFor('dj', 'Stay close!'));
    expect(voiceIdFor('dj', t)).not.toBe(voiceIdFor('grace', t));
    // Same Kokoro voice at a different rate is a different reading.
    expect(PEOPLE.sparky.voice.kokoro).toBe(PEOPLE.teddy.voice.kokoro);
    expect(voiceIdFor('sparky', t)).not.toBe(voiceIdFor('teddy', t));
  });
});

describe('charsSpokenAt', () => {
  const text = 'Netters, listen up. The ice is rotten.';

  it('starts at nothing and ends at everything', () => {
    expect(charsSpokenAt(0, 4, text)).toBe(0);
    expect(charsSpokenAt(-1, 4, text)).toBe(0);
    expect(charsSpokenAt(4, 4, text)).toBe(text.length);
    expect(charsSpokenAt(9, 4, text)).toBe(text.length);
    expect(charsSpokenAt(1, 0, text)).toBe(text.length);
  });

  it('snaps forward to the end of the word in progress', () => {
    // 0.3 of 38 chars = 11, inside "listen" (9..15); 1/4 = 9 is already a boundary.
    expect(charsSpokenAt(1, 4, text)).toBe(9);
    expect(charsSpokenAt(1.2, 4, text)).toBe(text.indexOf('listen') + 'listen'.length);
    for (let t = 0.05; t < 4; t += 0.1) {
      const c = charsSpokenAt(t, 4, text);
      expect(c === text.length || /\s/.test(text[c]) || /\s/.test(text[c - 1] ?? ' ')).toBe(true);
    }
  });

  it('never goes backwards', () => {
    let last = 0;
    for (let t = 0; t <= 4.2; t += 0.1) {
      const c = charsSpokenAt(t, 4, text);
      expect(c).toBeGreaterThanOrEqual(last);
      last = c;
    }
  });
});

describe('parseVoiceIndex', () => {
  it('reads a good index', () => {
    const idx = parseVoiceIndex({ version: 1, lines: { abc: { file: 'abc.mp3', seconds: 3.2, person: 'dj' } } });
    expect(idx.lines.abc).toEqual({ file: 'abc.mp3', seconds: 3.2, person: 'dj' });
  });

  it('tolerates a missing or invalid file', () => {
    for (const bad of [null, undefined, 'nope', 42, [], {}, { lines: null }, { lines: 'x' }]) {
      expect(parseVoiceIndex(bad)).toEqual({ version: 1, lines: {} });
    }
  });

  it('drops malformed entries and keeps the rest', () => {
    const idx = parseVoiceIndex({
      lines: {
        a: { file: 'a.mp3', seconds: 1 },
        b: { file: 'b.mp3' },
        c: { seconds: 2 },
        d: null,
        e: { file: 'e.mp3', seconds: -1 },
        f: 'f.mp3',
      },
    });
    expect(Object.keys(idx.lines)).toEqual(['a']);
  });
});

describe('splitIntoKnown', () => {
  it('reads the Other Station as known lines joined', () => {
    const result = resolveNight(NIGHT_1, STARTING_STATE, {
      rundown: NIGHT_1.rundowns.auto,
      signal: [1, 1, 1, 1, 1, 1],
      deadAirSeconds: 0,
      calls: [],
    });
    const script = result.otherStation.script;
    const card = NIGHT_1.cards.find((c) => c.id === result.otherStation.cardId);
    const dj = all.filter((l) => l.person === 'dj').map((l) => l.text);
    const parts = splitIntoKnown(script, dj);
    expect(parts).not.toBeNull();
    expect(parts!.join(' ')).toBe(script);
    expect(parts![0]).toBe(NIGHT_1.otherStation.intro);
    expect(parts!.at(-1)).toBe(NIGHT_1.otherStation.outro);
    if (card && card.kind !== 'record') expect(parts).toContain(card.script);
  });

  it('returns null when part of the text is unknown', () => {
    expect(splitIntoKnown('Hello there. Goodbye.', ['Hello there.'])).toBeNull();
    expect(splitIntoKnown('Hello there.', [])).toBeNull();
  });

  it('only splits at word boundaries and prefers the whole line', () => {
    expect(splitIntoKnown('ab cd', ['ab c', 'd', 'ab', 'cd'])).toEqual(['ab', 'cd']);
    expect(splitIntoKnown('ab cd', ['ab', 'cd', 'ab cd'])).toEqual(['ab cd']);
  });
});
