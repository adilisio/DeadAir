import Phaser from 'phaser';
import { W, H, ART_SCALE } from '../config';
import { markPhase } from '../debugHook';
import { EXTERIOR } from '../art/exterior';
import { hex, P, UI } from '../art/palette';
import { applyScreenLook, glow } from './fx';
import { audio } from '../audio/engine';

export class TitleScene extends Phaser.Scene {
  private beam!: Phaser.GameObjects.Graphics;
  private beamAngle = 0;

  constructor() {
    super('Title');
  }

  create(): void {
    const S = ART_SCALE;
    this.add.image(0, 0, 'exterior-night').setOrigin(0).setScale(S);

    // Lighthouse beam: a rotating wedge, brighter when it faces us.
    this.beam = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    glow(this, EXTERIOR.lantern.x * S, EXTERIOR.lantern.y * S, 90, hex(P.lamp), 0.9);
    glow(this, EXTERIOR.shackWindow.x * S, EXTERIOR.shackWindow.y * S, 40, hex(P.amber), 0.7);
    for (const [x, y] of EXTERIOR.townLights) {
      const g = glow(this, x * S, y * S, 10, hex(P.lamp), 0.5 + Math.random() * 0.4);
      this.tweens.add({ targets: g, alpha: 0.2, duration: 800 + Math.random() * 3000, yoyo: true, repeat: -1, delay: Math.random() * 3000 });
    }

    const title = this.add
      .text(W * 0.27, H * 0.17, 'DEAD AIR', { fontFamily: 'VT323', fontSize: '88px', color: UI.amber })
      .setOrigin(0.5);
    title.setShadow(0, 0, '#ff7a1a', 18, false, true);
    this.add
      .text(W * 0.27, H * 0.17 + 46, 'WLMP 1260 AM  ·  PORT VESPER', { fontFamily: 'VT323', fontSize: '20px', color: UI.dim })
      .setOrigin(0.5);
    const prompt = this.add
      .text(W * 0.27, H * 0.43, 'click to sign on', { fontFamily: 'VT323', fontSize: '24px', color: UI.text })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 1100, yoyo: true, repeat: -1 });
    this.add
      .text(W - 8, H - 6, 'headphones recommended', { fontFamily: 'VT323', fontSize: '16px', color: UI.dim })
      .setOrigin(1, 1);

    applyScreenLook(this, { bloom: 0.9 });

    const go = () => {
      audio.unlock();
      audio.sfx('thunk');
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Booth'));
    };
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
    markPhase('title');
  }

  update(_t: number, dt: number): void {
    const S = ART_SCALE;
    this.beamAngle = (this.beamAngle + dt * 0.0006) % (Math.PI * 2);
    const { x, y } = EXTERIOR.lantern;
    const cx = x * S, cy = y * S;
    const len = 700;
    const spread = 0.09;
    // Fake perspective: the beam sweeps left-right and shrinks when it points away.
    const facing = Math.cos(this.beamAngle);
    const dir = Math.sin(this.beamAngle) > 0 ? 1 : -1;
    const reach = len * Math.abs(Math.sin(this.beamAngle));
    this.beam.clear();
    this.beam.fillStyle(hex(P.lamp), 0.1 + 0.12 * Math.max(0, facing));
    this.beam.fillTriangle(cx, cy, cx + dir * reach, cy - reach * spread, cx + dir * reach, cy + reach * spread);
    this.beam.fillStyle(hex(P.hot), 0.08 + 0.1 * Math.max(0, facing));
    this.beam.fillTriangle(cx, cy, cx + dir * reach, cy - reach * spread * 0.4, cx + dir * reach, cy + reach * spread * 0.4);
  }
}
