// Tube swap. A transmitter tube blows mid-item and the program all but dies.
// The player reads which socket went dark, finds a matching spare in the drawer,
// and seats it; it warms up and the Lamp comes back. Wrong tubes are duds and
// cost a moment of fumbling; a spare picked during the fumble goes in as soon as
// the hands are free. The tube gives a beat of warning before it goes (the scene
// shows it: a sputter in the socket), so the pop isn't out of nowhere.
//
// The drawer is the town's: spares carry from night to night and only come back
// through the classifieds. With no matching spare, the player seats the wrong type
// (or, with an empty drawer, rigs something) and runs weak for the rest of the night.

/** What sits in sockets V1..V5, left to right. */
export const TUBE_TYPES = ['6L6', '807', '5U4', '6SN7', '866'] as const;
export type TubeType = (typeof TUBE_TYPES)[number];

export const TUBE = {
  /** At most this many spares are offered from the drawer. */
  spares: 3,
  /** The socket sputters this long before the tube goes. */
  warnSeconds: 1.8,
  fumbleSeconds: 1.0,
  warmSeconds: 1.4,
  /** Program strength while the tube is out (multiplies signal). */
  downStrength: 0.15,
  /** Program strength for the rest of the night on a bodged tube. */
  bodgedStrength: 0.6,
  /** Rummaging through an empty drawer before rigging something. */
  emptySeconds: 2,
  /** Down this long or less: you barely missed a beat. */
  quickSeconds: 5,
  /** Down this long or more: the town noticed. */
  slowSeconds: 12,
};

/** A drawer with one of each: how every run starts. */
export function fullDrawer(): Record<TubeType, number> {
  return Object.fromEntries(TUBE_TYPES.map((t) => [t, 1])) as Record<TubeType, number>;
}

export type TubeState = 'blown' | 'fumble' | 'warming' | 'fixed' | 'bodged';

export class TubeFault {
  state: TubeState = 'blown';
  /** Seconds the program was degraded (until the new tube is warm, or the bodge is in). */
  down = 0;
  wrongPicks = 0;
  readonly need: TubeType;
  /** The spares offered (types with at least one in the drawer), in drawer order. */
  readonly spares: TubeType[];
  /** The drawer as it stood when the tube blew. */
  readonly drawer: Record<TubeType, number>;
  /** The spare that ended up in the socket, if any: the right one, or the wrong one in a bodge. */
  used: TubeType | null = null;
  /** A spare picked mid-fumble; it goes in when the fumble ends (the last pick wins). */
  queued: number | null = null;
  private timer = 0;

  constructor(readonly socket: number, drawer: Record<TubeType, number>, rand: () => number) {
    this.need = TUBE_TYPES[socket];
    this.drawer = { ...drawer };
    const inStock = TUBE_TYPES.filter((t) => (drawer[t] ?? 0) > 0);
    const decoys = inStock.filter((t) => t !== this.need);
    const picked: TubeType[] = inStock.includes(this.need) ? [this.need] : [];
    while (picked.length < TUBE.spares && decoys.length) {
      const d = decoys.splice(Math.floor(rand() * decoys.length), 1)[0];
      picked.push(d);
    }
    // Shuffle so the right one isn't always first.
    for (let i = picked.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [picked[i], picked[j]] = [picked[j], picked[i]];
    }
    this.spares = picked;
    if (!picked.length) {
      // Nothing in the drawer: a moment of rummaging, then make do.
      this.state = 'fumble';
      this.timer = TUBE.emptySeconds;
    }
  }

  /** Whether the drawer has the type this socket needs. */
  get inStock(): boolean {
    return this.spares.includes(this.need);
  }

  get fixed(): boolean {
    return this.state === 'fixed';
  }

  get bodged(): boolean {
    return this.state === 'bodged';
  }

  /** Fixed or bodged: nothing more to do about this tube tonight. */
  get settled(): boolean {
    return this.state === 'fixed' || this.state === 'bodged';
  }

  /** Program strength 0..1; multiplies the signal while the tube is out (and all night when bodged). */
  get strength(): number {
    if (this.state === 'fixed') return 1;
    if (this.state === 'bodged') return TUBE.bodgedStrength;
    if (this.state === 'warming') {
      const k = 1 - this.timer / TUBE.warmSeconds;
      return TUBE.downStrength + (1 - TUBE.downStrength) * Math.max(0, Math.min(1, k));
    }
    return TUBE.downStrength;
  }

  /**
   * Seat spare `i` from the drawer. The right type warms up. A wrong type is a dud while
   * the right one is in the drawer, and a bodge when it isn't. A pick during a dud's
   * fumble is queued and goes in when the fumble ends. Ignored while warming, fixed or
   * bodged, and while rummaging an empty drawer.
   */
  pick(i: number): 'right' | 'wrong' | 'bodged' | 'queued' | 'ignored' {
    if (i < 0 || i >= this.spares.length) return 'ignored';
    if (this.state === 'fumble') {
      this.queued = i;
      return 'queued';
    }
    if (this.state !== 'blown') return 'ignored';
    const t = this.spares[i];
    if (t === this.need) {
      this.state = 'warming';
      this.timer = TUBE.warmSeconds;
      this.used = t;
      return 'right';
    }
    if (!this.inStock) {
      this.state = 'bodged';
      this.used = t;
      return 'bodged';
    }
    this.wrongPicks++;
    this.state = 'fumble';
    this.timer = TUBE.fumbleSeconds;
    return 'wrong';
  }

  /** Advance the fault. Returns what a queued pick did, when the fumble ends on one. */
  step(dt: number): 'right' | 'wrong' | 'bodged' | null {
    if (this.settled) return null;
    this.down += dt;
    if (this.state === 'fumble' || this.state === 'warming') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'warming') this.state = 'fixed';
        else this.state = this.spares.length ? 'blown' : 'bodged';
        if (this.state === 'blown' && this.queued !== null) {
          const q = this.queued;
          this.queued = null;
          const r = this.pick(q);
          return r === 'queued' || r === 'ignored' ? null : r;
        }
      }
    }
    return null;
  }
}
