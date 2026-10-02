// A tiny pixel painter over a 2D canvas: rects, lines, circles, dithered fills.
// Everything snaps to whole pixels and uses palette colors, so it reads as pixel art.

import { rng } from '../audio/pressings';

export class Painter {
  readonly ctx: CanvasRenderingContext2D;
  readonly w: number;
  readonly h: number;
  private r: () => number;

  constructor(ctx: CanvasRenderingContext2D, w: number, h: number, seed = 1) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    this.r = rng(seed);
    ctx.imageSmoothingEnabled = false;
  }

  rand(): number {
    return this.r();
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  px(x: number, y: number, c: string): void {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  rect(x: number, y: number, w: number, h: number, c: string): void {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** 1px outline. */
  box(x: number, y: number, w: number, h: number, c: string): void {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }

  /** Checkerboard mix of two colors. */
  dither(x: number, y: number, w: number, h: number, a: string, b: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, (i + j) % 2 === 0 ? a : b);
  }

  /** Sparse dither: color b on a fraction of pixels (ordered 4x4 Bayer). */
  bayer(x: number, y: number, w: number, h: number, b: string, amount: number): void {
    const M = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) if (M[((y + j) % 4) * 4 + ((x + i) % 4)] / 16 < amount) this.px(x + i, y + j, b);
  }

  /** Vertical banded gradient through a list of colors, with dithered seams. */
  vgrad(x: number, y: number, w: number, h: number, colors: string[]): void {
    const bands = colors.length;
    for (let j = 0; j < h; j++) {
      const f = (j / h) * (bands - 1);
      const k = Math.min(bands - 2, Math.floor(f));
      const t = f - k;
      for (let i = 0; i < w; i++) {
        const M = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
        const th = M[((y + j) % 4) * 4 + ((x + i) % 4)] / 16;
        this.px(x + i, y + j, t > th ? colors[k + 1] : colors[k]);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  disc(cx: number, cy: number, r: number, c: string): void {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.px(cx + x, cy + y, c);
  }

  ring(cx: number, cy: number, r: number, c: string): void {
    for (let a = 0; a < Math.PI * 2; a += 0.5 / Math.max(1, r)) this.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c);
  }

  /** Filled ellipse. */
  oval(cx: number, cy: number, rx: number, ry: number, c: string): void {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) this.px(cx + x, cy + y, c);
  }

  /** Filled convex polygon (scanline). */
  poly(points: [number, number][], c: string): void {
    const ys = points.map((p) => p[1]);
    const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) this.rect(Math.round(xs[k]), y, Math.round(xs[k + 1]) - Math.round(xs[k]) + 1, 1, c);
    }
  }

  /** Tiny 3x5 pixel font for in-world labels (dial numbers, signs). */
  tinyText(x: number, y: number, text: string, c: string): void {
    let cx = x;
    for (const ch of text.toUpperCase()) {
      const glyph = TINY[ch];
      if (glyph) glyph.forEach((row, j) => [...row].forEach((bit, i) => bit === '1' && this.px(cx + i, y + j, c)));
      cx += 4;
    }
  }
}

const TINY: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '011', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'], M: ['101', '111', '111', '101', '101'],
  N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'], V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'], Y: ['101', '101', '010', '010', '010'],
  '-': ['000', '000', '111', '000', '000'], '.': ['000', '000', '000', '000', '010'],
  ' ': ['000', '000', '000', '000', '000'],
};
