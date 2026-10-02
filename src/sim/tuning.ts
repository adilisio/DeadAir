// Transmitter drift. The wind and the old tubes push the carrier off 1260;
// the player pushes it back. Pure and frame-rate independent.

export interface TuningConfig {
  /** Max drift speed from gusts, in dial-units per second at wind 1. */
  gustSpeed: number;
  /** How fast the player can correct, dial-units per second. */
  correctSpeed: number;
  /** Error below this still counts as perfectly tuned. */
  deadZone: number;
}

export const TUNING: TuningConfig = { gustSpeed: 0.28, correctSpeed: 0.85, deadZone: 0.08 };

export class Tuning {
  error = 0;
  private drift = 0;
  private target = 0;
  private gustTimer = 0;

  constructor(private rand: () => number, private cfg: TuningConfig = TUNING) {}

  /** Signal quality 0..1 for an error value. */
  static quality(error: number, deadZone = TUNING.deadZone): number {
    const e = Math.max(0, Math.abs(error) - deadZone) / (1 - deadZone);
    return 1 - Math.min(1, e);
  }

  /**
   * Advance by dt seconds. input: -1..1 (player turning the dial). wind: 0 calm .. ~1.5 storm.
   * Returns the current quality.
   */
  step(dt: number, input: number, wind: number): number {
    this.gustTimer -= dt;
    if (this.gustTimer <= 0) {
      this.gustTimer = 1.5 + this.rand() * 3;
      this.target = (this.rand() * 2 - 1) * this.cfg.gustSpeed * wind;
    }
    // Ease the drift toward the current gust.
    this.drift += (this.target - this.drift) * Math.min(1, dt * 1.5);
    this.error += (this.drift + Math.max(-1, Math.min(1, input)) * this.cfg.correctSpeed) * dt;
    this.error = Math.max(-1, Math.min(1, this.error));
    return Tuning.quality(this.error, this.cfg.deadZone);
  }
}
