// A clock and timers that stand still while the show is paused. Phaser's own clock
// stops with `time.paused`, but a bare setTimeout (the switchboard's delayed copy, a
// voice's reading-speed wait) does not: these do. Pure TS: the clock is injectable.

interface Timer {
  fn: () => void;
  /** Milliseconds left, as of `since` (while running). */
  left: number;
  since: number;
  handle: ReturnType<typeof setTimeout> | undefined;
  done: boolean;
}

export interface PauseTimer {
  clear(): void;
}

export class PauseClock {
  private pausedFlag = false;
  private pausedAt = 0;
  /** Total real milliseconds spent paused so far. */
  private away = 0;
  private timers = new Set<Timer>();

  constructor(private real: () => number = () => performance.now()) {}

  get paused(): boolean {
    return this.pausedFlag;
  }

  /** Milliseconds of unpaused time: frozen while paused. */
  now(): number {
    return (this.pausedFlag ? this.pausedAt : this.real()) - this.away;
  }

  /** Like setTimeout, but the countdown halts while paused. */
  timeout(fn: () => void, ms: number): PauseTimer {
    const t: Timer = { fn, left: Math.max(0, ms), since: this.real(), handle: undefined, done: false };
    this.timers.add(t);
    if (!this.pausedFlag) this.arm(t);
    return {
      clear: () => {
        t.done = true;
        if (t.handle !== undefined) clearTimeout(t.handle);
        this.timers.delete(t);
      },
    };
  }

  setPaused(on: boolean): void {
    if (on === this.pausedFlag) return;
    const t = this.real();
    if (on) {
      this.pausedFlag = true;
      this.pausedAt = t;
      for (const timer of this.timers) {
        if (timer.handle !== undefined) clearTimeout(timer.handle);
        timer.handle = undefined;
        timer.left = Math.max(0, timer.left - (t - timer.since));
      }
    } else {
      this.pausedFlag = false;
      this.away += t - this.pausedAt;
      for (const timer of this.timers) {
        timer.since = t;
        this.arm(timer);
      }
    }
  }

  private arm(t: Timer): void {
    t.handle = setTimeout(() => {
      if (t.done) return;
      t.done = true;
      this.timers.delete(t);
      t.fn();
    }, t.left);
  }
}

/** The game's one clock: voice.ts and the booth share it. */
export const pauseClock = new PauseClock();
