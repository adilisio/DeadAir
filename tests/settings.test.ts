import { describe, it, expect } from 'vitest';
import { DEFAULT_VOLUME, clampVolume, parseVolume, serializeVolume, volumeGain } from '../src/sim/settings';

describe('volume settings', () => {
  it('defaults to 80 / 90 / 60', () => {
    expect(DEFAULT_VOLUME).toEqual({ music: 80, voice: 90, static: 60 });
    expect(parseVolume(null)).toEqual(DEFAULT_VOLUME);
    expect(parseVolume('')).toEqual(DEFAULT_VOLUME);
  });

  it('round-trips', () => {
    const v = { music: 10, voice: 100, static: 0 };
    expect(parseVolume(serializeVolume(v))).toEqual(v);
  });

  it('clamps to 0-100 and rounds', () => {
    expect(clampVolume(-5)).toBe(0);
    expect(clampVolume(250)).toBe(100);
    expect(clampVolume(33.6)).toBe(34);
    expect(parseVolume('{"music":500,"voice":-1,"static":42.2}')).toEqual({ music: 100, voice: 0, static: 42 });
    expect(JSON.parse(serializeVolume({ music: 999, voice: -3, static: 50.4 }))).toEqual({ music: 100, voice: 0, static: 50 });
  });

  it('fills missing or broken sliders from the defaults and survives junk', () => {
    expect(parseVolume('{"music":20}')).toEqual({ ...DEFAULT_VOLUME, music: 20 });
    expect(parseVolume('{"music":"loud","voice":null,"static":NaN}')).toEqual(DEFAULT_VOLUME);
    for (const s of ['nope', '{', 'null', '[]', '42', '"x"']) expect(parseVolume(s), s).toEqual(DEFAULT_VOLUME);
  });

  it('maps a slider to a gain: the default is 1, 0 is silent', () => {
    for (const k of ['music', 'voice', 'static'] as const) {
      expect(volumeGain(k, DEFAULT_VOLUME[k])).toBe(1);
      expect(volumeGain(k, 0)).toBe(0);
      expect(volumeGain(k, 100)).toBeGreaterThan(1);
    }
  });
});
