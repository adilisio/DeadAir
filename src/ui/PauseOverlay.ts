// The pause screen: the booth dimmed, a line saying how to go on, and the volume sliders.
// Built when the show pauses and destroyed when it goes on, so it holds nothing between.
import Phaser from 'phaser';
import { H, W } from '../config';
import { audio } from '../audio/engine';
import { UI } from '../art/palette';
import { VOLUME_KINDS } from '../sim/settings';
import { button, label, panel, slider } from './widgets';

const BOX = { w: 260, h: 176 };

export class PauseOverlay {
  readonly root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T, onResume: () => void) {
    // The dim layer takes every click, so nothing under the overlay can be pressed.
    const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.74).setOrigin(0).setInteractive();
    const x = (W - BOX.w) / 2;
    const y = (H - BOX.h) / 2;
    const parts: Phaser.GameObjects.GameObject[] = [
      dim,
      panel(scene, x, y, BOX.w, BOX.h, { alpha: 0.95 }),
      label(scene, W / 2, y + 10, 'PAUSED - ESC to go on', { size: 24, color: UI.amber, align: 'center' }).setOrigin(0.5, 0),
      label(scene, x + 20, y + 48, 'VOLUME', { size: 14, color: UI.dim }),
    ];
    VOLUME_KINDS.forEach((k, i) => {
      parts.push(slider(scene, x + 20, y + 68 + i * 26, BOX.w - 40, k, audio.volumes[k], (v) => audio.setVolume(k, v)).container);
    });
    parts.push(button(scene, W / 2 - 50, y + BOX.h - 34, 100, 22, 'GO ON', onResume, { size: 18 }).container);
    this.root = ui(scene.add.container(0, 0, parts).setDepth(300));
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
