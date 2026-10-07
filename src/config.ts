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
  /** With ?auto: in storms, hold the dial at -0.4 (toward 1250) instead of on 1260. */
  drift: params.has('drift'),
  /** With ?auto: talk over the last night's climax (SPACE) instead of holding the dial against it. */
  counter: params.has('counter'),
  /** Mutes all audio output (screenshots, CI). */
  mute: params.has('mute'),
  /** Skip bloom, CRT curve and vignette (slow GPUs, debugging). */
  nofx: params.has('nofx'),
  /** Jump straight to a scene: title | booth | dawn. */
  scene: params.get('scene') ?? '',
  /** Start the run at this night (1-based), as if earlier nights went like their ?auto shows. */
  night: Number(params.get('night') ?? 1) || 1,
  /** Whether ?night was given (it wins over a saved run). */
  nightGiven: params.has('night'),
  /** Forget the saved run. */
  reset: params.has('reset'),
};
