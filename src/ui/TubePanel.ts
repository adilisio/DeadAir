// The tube drawer: which socket went dark, and up to three spares from the drawer, with
// how many of each are left. With no spare of the right type, any tube is a bodge.
import Phaser from 'phaser';
import { UI } from '../art/palette';
import { TUBE_TYPES, type TubeFault } from '../sim/tube';
import { button, label, panel, type Button } from './widgets';

const BOX = { x: 420, y: 98, w: 208, h: 88 };
const KEYS = ['Q', 'W', 'E'];

export class TubePanel {
  readonly root: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private status: Phaser.GameObjects.Text;
  private buttons: Button[] = [];
  private shown = '';

  constructor(private scene: Phaser.Scene, private fault: TubeFault, onPick: (i: number) => void, ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T) {
    const { x, y, w, h } = BOX;
    const parts: Phaser.GameObjects.GameObject[] = [panel(scene, x, y, w, h, { edge: 0xff7a6b, alpha: 0.92 })];
    parts.push(label(scene, x + 8, y + 2, `TUBE BLOWN - V${fault.socket + 1}`, { size: 16, color: UI.bad }));
    parts.push(label(scene, x + w - 8, y + 3, KEYS.join(' / '), { size: 14, color: UI.dim }).setOrigin(1, 0));
    this.gfx = scene.add.graphics();
    parts.push(this.gfx);
    // The sockets, V1..V5.
    TUBE_TYPES.forEach((t, i) => {
      const sx = x + 8 + i * 39;
      parts.push(label(scene, sx + 18, y + 19, `V${i + 1}`, { size: 12, color: UI.dim, align: 'center' }).setOrigin(0.5, 0));
      parts.push(label(scene, sx + 18, y + 29, t, { size: 14, color: i === fault.socket ? UI.bad : UI.text, align: 'center' }).setOrigin(0.5, 0));
    });
    if (!fault.spares.length) parts.push(label(scene, x + 8, y + 50, 'THE DRAWER IS EMPTY', { size: 14, color: UI.bad }));
    fault.spares.forEach((t, i) => {
      const b = button(scene, x + 8 + i * 66, y + 49, 62, 17, `${KEYS[i]} ${t} x${fault.drawer[t]}`, () => onPick(i), { size: 14 });
      this.buttons.push(b);
      parts.push(b.container);
    });
    this.status = label(scene, x + 8, y + 69, '', { size: 14, color: UI.dim });
    parts.push(this.status);
    this.root = ui(scene.add.container(0, 0, parts).setDepth(115));
    scene.tweens.add({ targets: this.root, x: { from: 5, to: 0 }, duration: 50, yoyo: true, repeat: 3 });
  }

  /** Redraw from the fault's state. */
  update(): void {
    const f = this.fault;
    const g = this.gfx;
    g.clear();
    const sx = BOX.x + 8 + f.socket * 39;
    const on = f.state === 'warming' ? 0.5 + 0.5 * Math.sin(this.scene.time.now / 60) : Math.floor(this.scene.time.now / 300) % 2;
    g.lineStyle(1, f.state === 'warming' ? 0xffb347 : 0xff7a6b, f.settled ? 0.3 : 0.4 + 0.6 * on);
    g.strokeRect(sx + 0.5, BOX.y + 18.5, 35, 28);

    const missing = `NO ${f.need} IN THE DRAWER`;
    const queued = f.queued !== null ? f.spares[f.queued] : null;
    const text = {
      blown: f.inStock ? 'match the dead tube' : missing,
      fumble: !f.spares.length ? missing : queued ? `DUD - the ${queued} goes in next` : 'DUD - that tube is dead',
      warming: 'warming up...',
      fixed: 'back on the air',
      bodged: 'bodged - running weak',
    }[f.state];
    if (text !== this.shown) {
      this.shown = text;
      const color = { blown: f.inStock ? UI.hot : UI.bad, fumble: queued ? UI.amber : UI.bad, warming: UI.amber, fixed: UI.good, bodged: UI.bad }[f.state];
      this.status.setText(text).setColor(color);
      // A pick lands while blown, and queues through a fumble.
      this.buttons.forEach((b) => b.setEnabled(f.state === 'blown' || f.state === 'fumble'));
    }
  }

  close(): void {
    this.scene.tweens.add({ targets: this.root, alpha: 0, delay: 700, duration: 400, onComplete: () => this.destroy() });
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
