import Phaser from 'phaser';
import { DEBUG } from '../config';
import { markPhase } from '../debugHook';
import { Painter } from '../art/painter';
import { paintBooth, paintOnAirLit, paintRecord, BOOTH } from '../art/booth';
import { paintExterior } from '../art/exterior';
import { P } from '../art/palette';
import { NIGHTS } from '../data/nights';
import { startNight, townBefore } from '../run';

/** Paints every texture once, waits for the font, then starts the game. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  async create(): Promise<void> {
    markPhase('boot');
    await Promise.race([document.fonts.load('16px VT323'), new Promise((r) => setTimeout(r, 3000))]);

    this.paint('booth', BOOTH.w, BOOTH.h, (p) => paintBooth(p), 7);
    this.paint('exterior-night', 320, 180, (p) => paintExterior(p, 'night'), 3);
    this.paint('exterior-dawn', 320, 180, (p) => paintExterior(p, 'dawn'), 3);
    this.paint('record', BOOTH.record.rx * 2 + 3, BOOTH.record.ry * 2 + 3, (p) => paintRecord(p, P.ember), 1);
    this.paint('onair-lit', BOOTH.onAir.w, BOOTH.onAir.h, (p) => paintOnAirLit(p), 1);
    this.paint('scanlines', 1, 2, (p) => p.px(0, 1, '#000000'), 1);
    this.paint('pixel', 1, 1, (p) => p.px(0, 0, '#ffffff'), 1);
    this.makeGlow();

    // ?night=N starts the run at that night, with the town earlier nights would leave.
    const n = Math.max(1, Math.min(NIGHTS.length, DEBUG.night)) - 1;
    if (n > 0) startNight(n, townBefore(n));
    const start = DEBUG.scene === 'booth' ? 'Booth' : DEBUG.scene === 'dawn' ? 'Dawn' : 'Title';
    this.scene.start(start);
  }

  private paint(key: string, w: number, h: number, draw: (p: Painter) => void, seed: number): void {
    const tex = this.textures.createCanvas(key, w, h)!;
    draw(new Painter(tex.context, w, h, seed));
    tex.refresh();
  }

  private makeGlow(): void {
    const size = 64;
    const tex = this.textures.createCanvas('glow', size, size)!;
    const g = tex.context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    tex.context.fillStyle = g;
    tex.context.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
