// The desk, live: the cards that aren't in the running order. Pick one (1-9 or click)
// and it goes on next, in place of what was there. TAB or ESC puts the desk away.
import Phaser from 'phaser';
import { UI } from '../art/palette';
import type { Card, TownState } from '../sim/types';
import { KIND_TAG, describeCard } from './RundownBuilder';
import { label, panel } from './widgets';

const BOX = { x: 232, y: 74, w: 184 };
const ROW_H = 15;
const MAX_ROWS = 9;

export class DeskPanel {
  readonly root: Phaser.GameObjects.Container;
  private detailTag: Phaser.GameObjects.Text;
  readonly cards: Card[];

  constructor(
    scene: Phaser.Scene,
    cards: Card[],
    replaces: string,
    town: TownState,
    onPick: (i: number) => void,
    ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ) {
    this.cards = cards.slice(0, MAX_ROWS);
    const { x, y, w } = BOX;
    const rowsTop = y + 34;
    const detailY = rowsTop + Math.max(1, this.cards.length) * ROW_H + 4;
    const h = detailY - y + 32;
    const parts: Phaser.GameObjects.GameObject[] = [panel(scene, x, y, w, h, { alpha: 0.97 })];
    parts.push(label(scene, x + 8, y + 2, 'THE DESK', { size: 16, color: UI.amber }));
    parts.push(label(scene, x + w - 8, y + 3, 'TAB / ESC', { size: 13, color: UI.dim }).setOrigin(1, 0));
    parts.push(label(scene, x + 8, y + 18, `on next instead of: ${truncate(replaces, 18)}`, { size: 13, color: UI.dim }));
    if (!this.cards.length) parts.push(label(scene, x + 8, rowsTop, 'Nothing else on the desk.', { size: 14, color: UI.dim }));

    const hover = scene.add.graphics();
    parts.push(hover);
    this.cards.forEach((card, i) => {
      const ry = rowsTop + i * ROW_H;
      parts.push(label(scene, x + 8, ry, String(i + 1), { size: 14, color: UI.hot }));
      parts.push(label(scene, x + 20, ry, KIND_TAG[card.kind].tag, { size: 14, color: KIND_TAG[card.kind].color }));
      parts.push(label(scene, x + 54, ry, truncate(card.title, 21), { size: 14 }));
      const zone = scene.add.zone(x + w / 2, ry + ROW_H / 2, w - 8, ROW_H).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        hover.clear().fillStyle(0xffb347, 0.14).fillRect(x + 4, ry, w - 8, ROW_H - 1);
        this.detail(card, town);
      });
      zone.on('pointerdown', () => onPick(i));
      parts.push(zone);
    });

    this.detailTag = label(scene, x + 8, detailY, '', { size: 13, wrap: w - 16 });
    parts.push(this.detailTag);
    if (this.cards[0]) this.detail(this.cards[0], town);
    this.root = ui(scene.add.container(0, 0, parts).setDepth(118));
    this.root.setAlpha(0);
    scene.tweens.add({ targets: this.root, alpha: 1, duration: 120 });
  }

  private detail(card: Card, town: TownState): void {
    this.detailTag.setText(describeCard(card, town)).setColor(KIND_TAG[card.kind].color);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 2) + '..' : s;
}
