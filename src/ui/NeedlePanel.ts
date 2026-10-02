// The needle-drop gauge: the record seen edge-on from the rest post to the label,
// with the lead-in groove marked and the tonearm swinging across.
import Phaser from 'phaser';
import { UI } from '../art/palette';
import { NEEDLE } from '../sim/needle';
import type { NeedleResult } from '../sim/types';
import { label, panel } from './widgets';

const BOX = { x: 12, y: 196, w: 214, h: 48 };
const STRIP = { x: BOX.x + 10, y: BOX.y + 19, w: BOX.w - 20, h: 12 };

const RESULT: Record<NeedleResult, { text: string; color: string }> = {
  clean: { text: 'clean drop', color: UI.good },
  late: { text: 'late - the intro is gone', color: UI.amber },
  scratch: { text: 'SCRATCH - that went out on air', color: UI.bad },
};

export class NeedlePanel {
  readonly root: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene, ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T) {
    this.gfx = scene.add.graphics();
    this.title = label(scene, BOX.x + 8, BOX.y + 2, '', { size: 14, color: UI.amber });
    this.status = label(scene, BOX.x + 8, BOX.y + 32, '', { size: 14, color: UI.dim });
    const hint = label(scene, BOX.x + BOX.w - 8, BOX.y + 2, 'SPACE drops', { size: 14, color: UI.dim }).setOrigin(1, 0);
    this.root = ui(scene.add.container(0, 0, [panel(scene, BOX.x, BOX.y, BOX.w, BOX.h), this.gfx, this.title, hint, this.status]).setDepth(110).setVisible(false));
  }

  show(): void {
    this.title.setText('TURNTABLE');
    this.status.setText('drop it on the lead-in').setColor(UI.dim);
    this.scene.tweens.killTweensOf(this.root);
    this.root.setAlpha(1).setVisible(true);
    this.draw(0, true);
  }

  /** pos: 0 (rest) .. 1 (label). */
  draw(pos: number, live: boolean): void {
    const g = this.gfx;
    const { x, y, w, h } = STRIP;
    const [g0, g1] = NEEDLE.groove;
    g.clear();
    // Shellac, with grooves.
    g.fillStyle(0x07070a, 1);
    g.fillRect(x, y, w, h);
    for (let k = 0; k < w; k += 3) {
      g.fillStyle(0x2a2a33, 1);
      g.fillRect(x + k, y + 1, 1, h - 2);
    }
    // Off the record (rest side) and the paper label.
    g.fillStyle(0x3a2a20, 1);
    g.fillRect(x, y, w * 0.12, h);
    g.fillStyle(0xc0392b, 1);
    g.fillRect(x + w * 0.9, y, w * 0.1, h);
    // The lead-in groove.
    g.fillStyle(0x9be37a, live ? 0.45 : 0.25);
    g.fillRect(x + w * g0, y, w * (g1 - g0), h);
    // Tonearm.
    const ax = Math.round(x + w * pos);
    g.fillStyle(live ? 0xfff1c2 : 0x999999, 1);
    g.fillRect(ax - 1, y - 4, 2, h + 6);
    g.fillRect(ax - 3, y - 5, 6, 2);
  }

  result(r: NeedleResult): void {
    const { text, color } = RESULT[r];
    this.status.setText(text).setColor(color);
    this.scene.tweens.add({ targets: this.root, alpha: 0, delay: 1300, duration: 400, onComplete: () => this.root.setVisible(false) });
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
