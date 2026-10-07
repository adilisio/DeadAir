// First-time hints: the first time each booth task turns up in a run, one dim line near the
// cue box says what to press. Which have been shown is saved with the run (sim/save.ts),
// so a continued run does not repeat them. Keep each line short: the box is about 170 px wide.
// The keys are in priority order: when several are waiting, the earlier one shows first
// (the time-critical tasks before the calm ones).

export const HINT_SECONDS = 6;

export const HINTS = {
  needle: 'First time: SPACE drops the needle on the green band',
  tube: 'First time: Q / W / E seats the spare that matches the dead socket',
  switchboard: 'First time: 1 / 2 / 3 listens in, SPACE puts them on, X dumps, ESC hangs up',
  morse: 'First time: type the letters on the chart as the tape spells them',
  storm: 'First time: hold A / D to keep the dial on 1260',
  override: 'First time: it has the dial; hold A or D against it',
  desk: 'First time: TAB opens the desk; 1-9 puts a card on next',
  hedge: 'First time: H cues this story hedged: half the effect, no comeback',
} as const;

export type HintId = keyof typeof HINTS;

/** Hint ids, most urgent first. */
export const HINT_ORDER = Object.keys(HINTS) as HintId[];

/** The hints a run has not shown yet, from the ids it has (unknown saved ids are ignored). */
export function unseenHints(seen: readonly string[]): HintId[] {
  return HINT_ORDER.filter((id) => !seen.includes(id));
}
