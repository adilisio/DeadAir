// The switchboard: up to three lines ringing at once. Listen in off air, put one
// on, and keep a finger near the dump button.
import Phaser from 'phaser';
import { UI } from '../art/palette';
import type { CallLine } from '../sim/types';
import { button, label, panel, type Button } from './widgets';

export type LineState = 'ringing' | 'listening' | 'onair' | 'done' | 'gone';

export interface BoardView {
  states: LineState[];
  selected: number | null;
  onAir: number | null;
  secondsLeft: number;
}

const BOX = { x: 12, y: 136, w: 214, h: 150 };
const ROW_Y = BOX.y + 20;
const ROW_H = 21;
const STATE_TEXT: Record<LineState, string> = { ringing: 'ringing', listening: 'listening', onair: 'ON AIR', done: 'done', gone: 'hung up' };
const STATE_COLOR: Record<LineState, string> = { ringing: UI.bad, listening: UI.hot, onair: UI.good, done: UI.dim, gone: UI.dim };

export class SwitchboardPanel {
  readonly root: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Text;
  private stateText: Phaser.GameObjects.Text[] = [];
  private preview: Phaser.GameObjects.Text;
  private onAirBtn: Button;
  private dumpBtn: Button;
  private backBtn: Button;

  constructor(
    private scene: Phaser.Scene,
    private lines: CallLine[],
    on: { select(i: number): void; onAir(): void; dump(): void; back(): void },
    ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ) {
    const { x, y, w, h } = BOX;
    const parts: Phaser.GameObjects.GameObject[] = [panel(scene, x, y, w, h, { edge: 0xff7a6b, alpha: 0.93 })];
    this.gfx = scene.add.graphics();
    parts.push(this.gfx);
    this.title = label(scene, x + 8, y + 2, 'SWITCHBOARD', { size: 16, color: UI.bad });
    this.timer = label(scene, x + w - 8, y + 3, '', { size: 14, color: UI.dim }).setOrigin(1, 0);
    parts.push(this.title, this.timer);

    lines.forEach((line, i) => {
      const ry = ROW_Y + i * ROW_H;
      parts.push(label(scene, x + 18, ry, String(i + 1), { size: 14, color: UI.amber }));
      parts.push(label(scene, x + 30, ry, line.prompt, { size: 13, color: UI.text }));
      const st = label(scene, x + w - 8, ry + 9, '', { size: 12, color: UI.dim }).setOrigin(1, 0);
      this.stateText.push(st);
      parts.push(st);
      const zone = scene.add.zone(x + w / 2, ry + ROW_H / 2 - 1, w - 8, ROW_H).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => on.select(i));
      parts.push(zone);
    });

    this.preview = label(scene, x + 8, ROW_Y + 3 * ROW_H + 2, '', { size: 13, color: UI.dim, wrap: w - 16 });
    parts.push(this.preview);

    const by = y + h - 22;
    this.onAirBtn = button(scene, x + 6, by, 100, 17, 'ON AIR  ENTER', () => on.onAir(), { size: 14, color: 0x9be37a });
    this.dumpBtn = button(scene, x + 6, by, 100, 17, 'DUMP  X', () => on.dump(), { size: 14, color: 0xff7a6b });
    this.backBtn = button(scene, x + w - 106, by, 100, 17, 'BACK  SPACE', () => on.back(), { size: 14 });
    parts.push(this.onAirBtn.container, this.dumpBtn.container, this.backBtn.container);

    this.root = ui(scene.add.container(0, 0, parts).setDepth(120));
    scene.tweens.add({ targets: this.root, x: { from: -6, to: 0 }, duration: 60, yoyo: true, repeat: 3 });
  }

  update(v: BoardView): void {
    const now = this.scene.time.now;
    const blink = Math.floor(now / 250) % 2 === 0;
    const g = this.gfx;
    g.clear();
    v.states.forEach((s, i) => {
      const ry = ROW_Y + i * ROW_H;
      // The line's lamp.
      const lit = s === 'onair' || s === 'listening' || (s === 'ringing' && blink);
      const color = s === 'onair' ? 0x9be37a : s === 'listening' ? 0xffe08a : 0xff4a3a;
      g.fillStyle(lit ? color : 0x2a2420, 1);
      g.fillRect(BOX.x + 8, ry + 5, 6, 6);
      if (i === v.selected || i === v.onAir) {
        g.lineStyle(1, color, 0.8);
        g.strokeRect(BOX.x + 4.5, ry - 1.5, BOX.w - 9, ROW_H - 1);
      }
      this.stateText[i].setText(STATE_TEXT[s]).setColor(STATE_COLOR[s]);
    });

    const onAir = v.onAir !== null;
    const anyRinging = v.states.some((s) => s === 'ringing' || s === 'listening');
    this.title.setText(onAir ? 'ON THE LINE' : 'SWITCHBOARD').setColor(onAir ? UI.good : UI.bad).setAlpha(!onAir && anyRinging && !blink ? 0.6 : 1);
    this.timer.setText(onAir ? 'X dumps the call' : `lines drop in ${Math.ceil(Math.max(0, v.secondsLeft))}s`);

    if (onAir) this.preview.setText('On air, a few seconds behind the phone. If they say something that must not go out, dump them.').setColor(UI.dim);
    else if (v.selected !== null) this.preview.setText(`"${this.lines[v.selected].preview}"`).setColor('#c9e7ff');
    else this.preview.setText('1-3 listens in off air. Press it again, or ENTER, to put them on.').setColor(UI.dim);

    this.onAirBtn.container.setVisible(!onAir);
    this.onAirBtn.setEnabled(v.selected !== null);
    this.dumpBtn.container.setVisible(onAir);
    this.backBtn.setEnabled(!onAir);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
