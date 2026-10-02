/** Logical screen size. UI is laid out at this size; pixel art is painted at half and scaled 2x. */
export const W = 640;
export const H = 360;
export const ART_SCALE = 2;

/** URL switches used by the screenshot tool and for quick testing. */
const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const DEBUG = {
  /** Shortens records and talk so a full night runs in about a minute. */
  fast: params.has('fast'),
  /** Plays the night with no input: auto-builds a rundown, auto-cues, auto-tunes. */
  auto: params.has('auto'),
  /** Mutes all audio output (screenshots, CI). */
  mute: params.has('mute'),
  /** Jump straight to a scene: title | booth | dawn. */
  scene: params.get('scene') ?? '',
};
