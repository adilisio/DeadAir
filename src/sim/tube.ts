// Tube swap. A transmitter tube blows mid-item and the program all but dies.
// The player reads which socket went dark, finds a matching spare in the drawer,
// and seats it; it warms up and the Lamp comes back. Wrong tubes are duds and
// cost a moment of fumbling.

/** What sits in sockets V1..V5, left to right. */
export const TUBE_TYPES = ['6L6', '807', '5U4', '6SN7', '866'] as const;

export const TUBE = {
  spares: 3,
  fumbleSeconds: 1.0,
  warmSeconds: 1.4,
  /** Program strength while the tube is out (multiplies signal). */
  downStrength: 0.15,
  /** Down this long or less: you barely missed a beat. */
  quickSeconds: 5,
  /** Down this long or more: the town noticed. */
  slowSeconds: 12,
};

export type TubeState = 'blown' | 'fumble' | 'warming' | 'fixed';

export class TubeFault {
  state: TubeState = 'blown';
  /** Seconds the program was degraded (until the new tube is warm). */
  down = 0;
  wrongPicks = 0;
  readonly need: string;
  readonly spares: string[];
  private timer = 0;

  constructor(readonly socket: number, rand: () => number) {
    this.need = TUBE_TYPES[socket];
    const decoys = TUBE_TYPES.filter((t) => t !== this.need);
    const picked: string[] = [this.need];
    while (picked.length < TUBE.spares) {
      const d = decoys.splice(Math.floor(rand() * decoys.length), 1)[0];
      picked.push(d);
    }
    // Shuffle so the right one isn't always first.
    for (let i = picked.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [picked[i], picked[j]] = [picked[j], picked[i]];
    }
    this.spares = picked;
  }

  get fixed(): boolean {
    return this.state === 'fixed';
  }

  /** Program strength 0..1; multiplies the signal while the tube is out. */
  get strength(): number {
    if (this.state === 'fixed') return 1;
    if (this.state === 'warming') {
      const k = 1 - this.timer / TUBE.warmSeconds;
      return TUBE.downStrength + (1 - TUBE.downStrength) * Math.max(0, Math.min(1, k));
    }
    return TUBE.downStrength;
  }

  /** Seat spare `i` from the drawer. Ignored while fumbling, warming or fixed. */
  pick(i: number): 'right' | 'wrong' | 'ignored' {
    if (this.state !== 'blown' || i < 0 || i >= this.spares.length) return 'ignored';
    if (this.spares[i] === this.need) {
      this.state = 'warming';
      this.timer = TUBE.warmSeconds;
      return 'right';
    }
    this.wrongPicks++;
    this.state = 'fumble';
    this.timer = TUBE.fumbleSeconds;
    return 'wrong';
  }

  step(dt: number): void {
    if (this.state === 'fixed') return;
    this.down += dt;
    if (this.state === 'fumble' || this.state === 'warming') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = this.state === 'fumble' ? 'blown' : 'fixed';
    }
  }
}
