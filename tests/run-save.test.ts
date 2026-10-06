import { describe, it, expect, afterEach, vi } from 'vitest';
import { SAVE_KEY, clearSave, finishNight, loadRun, nextNight, resetRun, run, savedRun } from '../src/run';
import { STARTING_STATE, resolveNight } from '../src/sim/resolver';
import { NIGHTS } from '../src/data/nights';

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    map: m,
  };
}

const playAuto = () =>
  resolveNight(run.night, run.town, {
    rundown: run.night.rundowns.auto,
    signal: [1, 1, 1, 1, 1, 1],
    deadAirSeconds: 0,
    calls: [{ line: 'call_okafor' }],
    morse: [{ id: 'n1_morse', result: 'decoded' }],
  });

afterEach(() => {
  vi.unstubAllGlobals();
  resetRun();
});

describe('saving the run', () => {
  it('saves at the end of a night and again when the next one starts, and continues from it', () => {
    const store = fakeStorage();
    vi.stubGlobal('localStorage', store);
    resetRun();
    expect(savedRun()).toBeNull();
    finishNight(playAuto());
    const atDawn = savedRun();
    expect(atDawn?.index).toBe(1);
    expect(atDawn?.town).toEqual(run.result!.after);
    expect(atDawn?.town.flags).toEqual(expect.arrayContaining(['n1_teddy_found', 'n1_shanty_found', 'grace_aired']));

    nextNight();
    expect(savedRun()).toEqual({ index: 1, town: run.town });

    // A fresh page: back to Night 1, then continue.
    resetRun();
    expect(run.index).toBe(0);
    expect(loadRun()).toBe(true);
    expect(run.index).toBe(1);
    expect(run.night.number).toBe(2);
    expect(run.town).toEqual(atDawn!.town);
    expect(run.night.cards.map((c) => c.id)).toContain('news_wozniak');
  });

  it('clears the save after the last night', () => {
    const store = fakeStorage();
    vi.stubGlobal('localStorage', store);
    resetRun();
    finishNight(playAuto());
    nextNight();
    expect(run.index).toBe(NIGHTS.length - 1);
    finishNight(resolveNight(run.night, run.town, { rundown: run.night.rundowns.auto, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls: [] }));
    expect(store.map.has(SAVE_KEY)).toBe(false);
    expect(loadRun()).toBe(false);
  });

  it('ignores junk and saves for nights that do not exist', () => {
    const store = fakeStorage();
    vi.stubGlobal('localStorage', store);
    store.setItem(SAVE_KEY, '{"version":1,"index":99,"town":{}}');
    expect(loadRun()).toBe(false);
    store.setItem(SAVE_KEY, 'garbage');
    expect(loadRun()).toBe(false);
    expect(run.index).toBe(0);
    store.setItem(SAVE_KEY, '{"version":1,"index":1,"town":{"flags":["n1_slander_aired"]}}');
    expect(loadRun()).toBe(true);
    expect(run.town).toEqual({ ...STARTING_STATE, flags: ['n1_slander_aired'] });
    clearSave();
    expect(savedRun()).toBeNull();
  });

  it('plays on without storage', () => {
    vi.stubGlobal('localStorage', undefined);
    resetRun();
    expect(() => finishNight(playAuto())).not.toThrow();
    expect(() => nextNight()).not.toThrow();
    expect(loadRun()).toBe(false);
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); }, removeItem: () => {} });
    expect(() => finishNight(playAuto())).not.toThrow();
    expect(savedRun()).toBeNull();
  });
});
