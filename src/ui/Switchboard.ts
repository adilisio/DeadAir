// The switchboard: up to three lines ringing at once, each on its own clock. Listen in
// off air (some callers tell you more if you keep listening), put one on, and keep a
// finger near the dump button: the town hears them a few seconds after you do.
import Phaser from 'phaser';
import { UI } from '../art/palette';
import { DUMP_DELAY_SECONDS } from '../sim/calls';
import type { CallLine } from '../sim/types';
import { button, label, panel, type Button } from './widgets';

export type LineState = 'ringing' | 'listening' | 'onair' | 'done' | 'gone';

export interface BoardView {
  states: LineState[];
  selected: number | null;
  onAir: number | null;
  /** Seconds each line keeps ringing. */
  left: number[];
  /** The selected line has begun to confide on the handset. */
  confided: boolean;
  /** The DJ is on the air after a call. */
  after: boolean;
}

const BOX = { x: 12, y: 80, w: 214, h: 206 };
const ROW_Y = BOX.y + 20;
const ROW_H = 21;
const STATE_TEXT: Record<LineState, string> = { ringing: 'ringing', listening: 'listening', onair: 'ON AIR', done: 'done', gone: 'hung up' };
const STATE_COLOR: Record<LineState, string> = { ringing: UI.bad, listening: UI.hot, onair: UI.good, done: UI.dim, gone: UI.dim };
const CALLER = '#c9e7ff';

export class SwitchboardPanel {
  readonly root: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Text;
  private stateText: Phaser.GameObjects.Text[] = [];
  private leftText: Phaser.GameObjects.Text[] = [];
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
      const left = label(scene, x + w - 62, ry + 9, '', { size: 12, color: UI.dim }).setOrigin(1, 0).setAlpha(0.75);
      this.stateText.push(st);
      this.leftText.push(left);
      parts.push(st, left);
      const zone = scene.add.zone(x + w / 2, ry + ROW_H / 2 - 1, w - 8, ROW_H).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => on.select(i));
      parts.push(zone);
    });

    this.preview = label(scene, x + 8, ROW_Y + 3 * ROW_H + 2, '', { size: 13, color: UI.dim, wrap: w - 16 });
    parts.push(this.preview);

    const by = y + h - 22;
    this.onAirBtn = button(scene, x + 6, by, 100, 17, 'ON AIR  SPACE', () => on.onAir(), { size: 14, color: 0x9be37a });
    this.dumpBtn = button(scene, x + 6, by, 100, 17, 'DUMP  X', () => on.dump(), { size: 14, color: 0xff7a6b });
    this.backBtn = button(scene, x + w - 106, by, 100, 17, 'HANG UP  ESC', () => on.back(), { size: 14 });
    parts.push(this.onAirBtn.container, this.dumpBtn.container, this.backBtn.container);

    this.root = ui(scene.add.container(0, 0, parts).setDepth(120));
    scene.tweens.add({ targets: this.root, x: { from: -6, to: 0 }, duration: 60, yoyo: true, repeat: 3 });
  }

  update(v: BoardView): void {
    const now = this.scene.time.now;
    const blink = Math.floor(now / 250) % 2 === 0;
    // An urgent line's lamp blinks twice as fast.
    const fast = Math.floor(now / 110) % 2 === 0;
    const g = this.gfx;
    g.clear();
    v.states.forEach((s, i) => {
      const ry = ROW_Y + i * ROW_H;
      const urgent = !!this.lines[i].urgent;
      // The line's lamp.
      const lit = s === 'onair' || s === 'listening' || (s === 'ringing' && (urgent ? fast : blink));
      const color = s === 'onair' ? 0x9be37a : s === 'listening' ? 0xffe08a : 0xff4a3a;
      g.fillStyle(lit ? color : 0x2a2420, 1);
      g.fillRect(BOX.x + 8, ry + 5, 6, 6);
      if (urgent && (s === 'ringing' || s === 'listening')) {
        // A second, red pip under the lamp: this one can't wait.
        g.fillStyle(0xff4a3a, fast ? 1 : 0.35);
        g.fillRect(BOX.x + 8, ry + 13, 6, 2);
      }
      if (i === v.selected || i === v.onAir) {
        g.lineStyle(1, color, 0.8);
        g.strokeRect(BOX.x + 4.5, ry - 1.5, BOX.w - 9, ROW_H - 1);
      }
      this.stateText[i].setText(STATE_TEXT[s]).setColor(STATE_COLOR[s]);
      const waiting = s === 'ringing' || s === 'listening';
      this.leftText[i].setText(waiting ? `${Math.ceil(Math.max(0, v.left[i] ?? 0))}s` : '');
    });

    const onAir = v.onAir !== null;
    const anyRinging = v.states.some((s) => s === 'ringing' || s === 'listening');
    const urgentRinging = v.states.some((s, i) => s === 'ringing' && this.lines[i].urgent);
    const title = onAir ? 'ON THE LINE' : urgentRinging ? 'SWITCHBOARD · URGENT' : 'SWITCHBOARD';
    this.title.setText(title).setColor(onAir ? UI.good : UI.bad).setAlpha(!onAir && anyRinging && !blink ? 0.6 : 1);
    // Nothing marks a dump in flight: the delay is just there, and you have to know it.
    this.timer.setText(onAir ? `DELAY ${DUMP_DELAY_SECONDS}s` : '');

    if (onAir) this.preview.setText('On air. They reach the town a few seconds after you hear them. X dumps the call.').setColor(UI.dim);
    else if (v.selected !== null) {
      // After the preview, a caller who confides says the rest off the air.
      const line = this.lines[v.selected];
      if (v.confided && line.confide) this.fit(`(off the air) "${line.confide.text}"`).setColor(UI.hot);
      else this.fit(`"${line.preview}"`).setColor(CALLER);
    } else if (v.after) this.preview.setText("You're back on the air. The lines are holding.").setColor(UI.dim);
    else this.preview.setText('1-3 listens in off air. SPACE or ENTER puts them on. ESC hangs up on everyone.').setColor(UI.dim);

    this.onAirBtn.container.setVisible(!onAir);
    this.onAirBtn.setEnabled(v.selected !== null && !v.after);
    this.dumpBtn.container.setVisible(onAir);
    this.backBtn.setEnabled(!onAir && !v.after);
  }

  /** The preview at 13px, or smaller when a long confide would run into the buttons. */
  private fit(text: string): Phaser.GameObjects.Text {
    const room = BOX.y + BOX.h - 26 - this.preview.y;
    for (const size of [13, 12, 11]) {
      this.preview.setFontSize(size).setText(text);
      if (this.preview.height <= room) break;
    }
    return this.preview;
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
