import { describe, it, expect, afterEach, vi } from 'vitest';
import { HINTS, unseenHints } from '../src/ui/hints';
import { finishNight, loadRun, markHint, nextNight, resetRun, run, saveRun, savedRun } from '../src/run';
import { resolveNight } from '../src/sim/resolver';

function fakeStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetRun();
});

describe('first-time hints', () => {
  it('are one short line each, and unseenHints ignores unknown ids', () => {
    for (const [id, text] of Object.entries(HINTS)) {
      expect(text, id).toMatch(/^First time: /);
      expect(text.length, id).toBeLessThanOrEqual(80);
    }
    expect(unseenHints([])).toEqual(Object.keys(HINTS));
    expect(unseenHints(['needle', 'nope'])).not.toContain('needle');
    expect(unseenHints(Object.keys(HINTS))).toEqual([]);
  });

  it('are saved with the run and not repeated after continue', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    resetRun();
    expect(markHint('needle')).toBe(true);
    expect(markHint('needle')).toBe(false);
    markHint('tube');
    finishNight(
      resolveNight(run.night, run.town, { rundown: run.night.rundowns.auto, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls: [] }),
    );
    expect(savedRun()?.hints).toEqual(['needle', 'tube']);
    nextNight();
    expect(savedRun()?.hints).toEqual(['needle', 'tube']);
    // Marking a hint does not touch the save; the next save (the next dawn) carries it.
    markHint('morse');
    expect(savedRun()?.hints).toEqual(['needle', 'tube']);
    saveRun();
    expect(savedRun()?.hints).toEqual(['needle', 'tube', 'morse']);

    // A fresh page: nothing shown yet, until the run is continued.
    resetRun();
    expect(run.hints).toEqual([]);
    expect(loadRun()).toBe(true);
    expect(run.hints).toEqual(['needle', 'tube', 'morse']);
    expect(markHint('tube')).toBe(false);
    expect(markHint('desk')).toBe(true);
  });

  it('start again with a new run', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    markHint('needle');
    resetRun();
    expect(run.hints).toEqual([]);
  });
});
