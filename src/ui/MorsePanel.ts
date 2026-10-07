// The Morse panel: a keying lamp, the tape of what's come through this pass,
// a code chart, and the letters copied so far. Dots and dashes are drawn as
// shapes; the font's are too small to tell apart.
import Phaser from 'phaser';
import { UI } from '../art/palette';
import { MORSE } from '../sim/morse';
import { label, panel } from './widgets';

const BOX = { x: 232, y: 140, w: 220, h: 94 };
const CW = '#c9e7ff';

/** How wide a run of marks draws. */
function marksWidth(marks: string, u: number): number {
  let w = 0;
  for (const m of marks) w += m === ' ' ? u * 2 : (m === '-' ? u * 3 : u) + u;
  return w;
}

/** The tail of a run of marks that fits in `width`. */
function marksThatFit(marks: string, u: number, width: number): string {
  let from = 0;
  while (from < marks.length && marksWidth(marks.slice(from), u) > width) from++;
  return marks.slice(from);
}

/** Draw a run of marks ('.', '-', ' ') left to right; returns the end x. */
function drawMarks(g: Phaser.GameObjects.Graphics, x: number, y: number, marks: string, u: number, color: number): number {
  g.fillStyle(color, 1);
  for (const m of marks) {
    if (m === ' ') {
      x += u * 2;
      continue;
    }
    const w = m === '-' ? u * 3 : u;
    g.fillRect(x, y, w, u);
    x += w + u;
  }
  return x;
}

export class MorsePanel {
  readonly root: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private timer: Phaser.GameObjects.Text;
  private copy: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.Text;
  private flashUntil = 0;
  private dead = false;

  constructor(private scene: Phaser.Scene, private wordLength: number, chart: string[], ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T, delayMs = 0) {
    const { x, y, w, h } = BOX;
    const parts: Phaser.GameObjects.GameObject[] = [panel(scene, x, y, w, h, { edge: 0x8ab4ff, alpha: 0.92 })];
    parts.push(label(scene, x + 8, y + 2, 'UNDER THE STATIC', { size: 15, color: CW }));
    this.timer = label(scene, x + w - 8, y + 3, '', { size: 14, color: UI.dim }).setOrigin(1, 0);
    parts.push(this.timer);

    // The chart: static marks, drawn once.
    const chartGfx = scene.add.graphics();
    parts.push(chartGfx);
    chart.forEach((l, i) => {
      const cx = x + 8 + (i % 4) * 52;
      const cy = y + 37 + Math.floor(i / 4) * 13;
      parts.push(label(scene, cx, cy, l, { size: 14, color: UI.text }));
      drawMarks(chartGfx, cx + 10, cy + 6, MORSE[l], 2, 0xf2e3c4);
    });

    this.gfx = scene.add.graphics();
    parts.push(this.gfx);
    this.copy = label(scene, x + 8, y + 66, '', { size: 20, color: UI.hot });
    this.status = label(scene, x + w - 8, y + 72, 'type the letters', { size: 13, color: UI.dim }).setOrigin(1, 0);
    parts.push(this.copy, this.status);
    this.root = ui(scene.add.container(0, 0, parts).setDepth(110).setAlpha(0));
    scene.tweens.add({ targets: this.root, alpha: 1, delay: delayMs, duration: 1200 });
  }

  update(on: boolean, tape: string, typed: string, secondsLeft: number): void {
    const g = this.gfx;
    g.clear();
    // Keying lamp, then the tape.
    g.fillStyle(on ? 0xc9e7ff : 0x23303f, 1);
    g.fillRect(BOX.x + 9, BOX.y + 22, 8, 8);
    // A long pass runs off the box: show its tail, which is what was just keyed.
    drawMarks(g, BOX.x + 24, BOX.y + 24, marksThatFit(tape, 4, BOX.w - 32), 4, 0xffe08a);
    this.copy.setText(Array.from({ length: this.wordLength }, (_, i) => typed[i] ?? '_').join(' '));
    this.timer.setText(`fading in ${Math.ceil(Math.max(0, secondsLeft))}s`);
    if (this.scene.time.now > this.flashUntil) this.status.setText('type the letters').setColor(UI.dim);
  }

  wrong(letter: string): void {
    this.status.setText(`not ${letter.toUpperCase()}`).setColor(UI.bad);
    this.flashUntil = this.scene.time.now + 900;
  }

  finish(decoded: boolean, word: string): void {
    this.gfx.clear();
    this.copy.setText(decoded ? word.split('').join(' ') : this.copy.text).setColor(decoded ? UI.good : UI.dim);
    this.status.setText(decoded ? 'copied' : 'the signal faded').setColor(decoded ? UI.good : UI.bad);
    this.timer.setText('');
    this.flashUntil = Number.POSITIVE_INFINITY;
    this.scene.tweens.add({ targets: this.root, alpha: 0, delay: 1800, duration: 600, onComplete: () => this.destroy() });
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.root.destroy(true);
  }
}
