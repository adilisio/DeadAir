// Player settings that outlive a run: the three volume sliders. Pure: parse, serialize,
// clamp and map to gain. The engine (audio/engine.ts) applies them; storage is its job.

export const VOLUME_KINDS = ['music', 'voice', 'static'] as const;
export type VolumeKind = (typeof VOLUME_KINDS)[number];
export type Volume = Record<VolumeKind, number>;

/** localStorage key for the saved sliders. */
export const VOLUME_KEY = 'deadair.volume';

/** Slider positions (0-100) a new player starts with. */
export const DEFAULT_VOLUME: Readonly<Volume> = { music: 80, voice: 90, static: 60 };

/** A slider value as a whole number from 0 to 100; anything that is not a number is `fallback`. */
export function clampVolume(x: unknown, fallback = 0): number {
  const n = typeof x === 'number' && Number.isFinite(x) ? x : fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Saved sliders, with any missing or broken one at its default. Never throws. */
export function parseVolume(s: string | null | undefined): Volume {
  const out: Volume = { ...DEFAULT_VOLUME };
  if (!s) return out;
  let data: unknown;
  try {
    data = JSON.parse(s);
  } catch {
    return out;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return out;
  const raw = data as Record<string, unknown>;
  for (const k of VOLUME_KINDS) out[k] = clampVolume(raw[k], DEFAULT_VOLUME[k]);
  return out;
}

export function serializeVolume(v: Volume): string {
  return JSON.stringify({ music: clampVolume(v.music), voice: clampVolume(v.voice), static: clampVolume(v.static) });
}

/**
 * The gain a slider drives. The mix was balanced with every channel at gain 1, and the
 * defaults are the slider positions that keep it so: a slider at its default is gain 1,
 * 0 is silence, and 100 is a little louder than the default.
 */
export function volumeGain(kind: VolumeKind, value: number): number {
  return clampVolume(value, DEFAULT_VOLUME[kind]) / DEFAULT_VOLUME[kind];
}
