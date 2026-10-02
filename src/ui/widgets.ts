// Small UI kit: panels, text, buttons. Dark glass with amber edges, VT323 everywhere.
import Phaser from 'phaser';
import { UI } from '../art/palette';

export const FONT = 'VT323';

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: { size?: number; color?: string; wrap?: number; align?: 'left' | 'center' | 'right' } = {},
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONT,
    fontSize: `${opts.size ?? 16}px`,
    color: opts.color ?? UI.text,
    align: opts.align ?? 'left',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    lineSpacing: -2,
  });
  t.setResolution(2);
  return t;
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { alpha?: number; edge?: number; fill?: number } = {},
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(opts.fill ?? UI.panel, opts.alpha ?? 0.84);
  g.fillRect(x, y, w, h);
  g.lineStyle(1, opts.edge ?? UI.panelEdge, 0.55);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Corner ticks.
  g.fillStyle(opts.edge ?? UI.panelEdge, 1);
  for (const [cx, cy] of [[x, y], [x + w - 3, y], [x, y + h - 3], [x + w - 3, y + h - 3]]) g.fillRect(cx, cy, 3, 3);
  return g;
}

export interface Button {
  container: Phaser.GameObjects.Container;
  setEnabled(on: boolean): void;
  setLabel(text: string): void;
  flash(): void;
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  onClick: () => void,
  opts: { color?: number; size?: number; textColor?: string; dimColor?: string } = {},
): Button {
  const color = opts.color ?? UI.panelEdge;
  const bg = scene.add.graphics();
  const t = label(scene, w / 2, h / 2, text, { size: opts.size ?? 18, align: 'center' }).setOrigin(0.5);
  const zone = scene.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
  const container = scene.add.container(x, y, [bg, t, zone]);
  let enabled = true;
  let hover = false;
  const draw = () => {
    bg.clear();
    bg.fillStyle(color, !enabled ? 0.08 : hover ? 0.45 : 0.22);
    bg.fillRect(0, 0, w, h);
    bg.lineStyle(1, color, enabled ? 0.95 : 0.3);
    bg.strokeRect(0.5, 0.5, w - 1, h - 1);
    t.setColor(enabled ? (opts.textColor ?? UI.hot) : (opts.dimColor ?? UI.dim));
  };
  zone.on('pointerover', () => ((hover = true), draw()));
  zone.on('pointerout', () => ((hover = false), draw()));
  zone.on('pointerdown', () => enabled && onClick());
  draw();
  return {
    container,
    setEnabled(on) {
      enabled = on;
      draw();
    },
    setLabel(s) {
      t.setText(s);
    },
    flash() {
      scene.tweens.add({ targets: container, alpha: 0.4, duration: 90, yoyo: true, repeat: 2 });
    },
  };
}

/** A horizontal meter bar. */
export function bar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, frac: number, color: number): void {
  g.fillStyle(0x000000, 0.6);
  g.fillRect(x, y, w, h);
  g.fillStyle(color, 1);
  g.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
}

export const toNum = (css: string): number => parseInt(css.slice(1), 16);
