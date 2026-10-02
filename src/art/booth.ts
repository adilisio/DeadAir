// The booth at the foot of the lighthouse, painted at 320×180.
// Static parts are painted here; anything that moves or glows is a separate
// sprite placed at the coordinates in BOOTH (art pixels; multiply by ART_SCALE).

import { Painter } from './painter';
import { P } from './palette';

export const BOOTH = {
  w: 320,
  h: 180,
  window: { x: 22, y: 16, w: 120, h: 62 },
  horizonY: 55,
  moon: { x: 118, y: 27 },
  /** Lit windows across the harbor; more light up as Listeners grow. */
  townLights: [
    [30, 51], [34, 50], [41, 52], [47, 49], [52, 51], [58, 50], [63, 52], [69, 48], [74, 51],
    [80, 50], [88, 52], [93, 49], [99, 51], [104, 52], [36, 53], [55, 53], [85, 53], [66, 50],
  ] as [number, number][],
  breakwaterLight: { x: 139, y: 58 },
  clock: { x: 170, y: 26, r: 9 },
  onAir: { x: 214, y: 5, w: 44, h: 10 },
  tubes: [0, 1, 2, 3, 4].map((i) => ({ x: 217 + i * 18, y: 38 })),
  meters: [
    { x: 232, y: 72, r: 11 },
    { x: 280, y: 72, r: 11 },
  ],
  dial: { x: 256, y: 103, r: 13 },
  record: { x: 46, y: 140, rx: 23, ry: 11 },
  lamp: { x: 113, y: 117 },
  mic: { x: 160, y: 108 },
  mug: { x: 236, y: 146 },
  phone: { x: 280, y: 148 },
  phoneLamp: { x: 297, y: 137 },
} as const;

export function paintBooth(p: Painter): void {
  const B = BOOTH;
  p.clear();

  // ── Back wall: vertical plank paneling ──
  p.rect(0, 0, 320, 120, P.wood2);
  for (let x = 0; x < 320; x += 13) {
    p.rect(x, 0, 1, 120, P.wood0);
    p.rect(x + 1, 0, 1, 120, P.wood3);
    // Grain.
    for (let k = 0; k < 6; k++) {
      const gx = x + 3 + Math.floor(p.rand() * 9);
      const gy = Math.floor(p.rand() * 110);
      p.rect(gx, gy, 1, 4 + Math.floor(p.rand() * 10), P.wood1);
    }
  }
  p.bayer(0, 0, 320, 120, P.wood1, 0.12);
  // Ceiling shadow and chair rail.
  p.vgrad(0, 0, 320, 10, [P.black, P.wood0, P.wood1]);
  p.rect(0, 112, 320, 3, P.wood4);
  p.rect(0, 115, 320, 1, P.wood0);

  paintWindow(p);
  paintWallClutter(p);
  paintTransmitter(p);
  paintDesk(p);
  void B;
}

function paintWindow(p: Painter): void {
  const { x, y, w, h } = BOOTH.window;
  const hz = BOOTH.horizonY;
  // Frame.
  p.rect(x - 4, y - 4, w + 8, h + 9, P.wood4);
  p.box(x - 4, y - 4, w + 8, h + 9, P.wood0);
  p.rect(x - 6, y + h + 3, w + 12, 3, P.wood5); // sill
  p.rect(x - 6, y + h + 6, w + 12, 1, P.wood0);
  // Sky.
  p.vgrad(x, y, w, hz - y, [P.night0, P.night1, P.night2, P.night3]);
  for (let i = 0; i < 40; i++) {
    const sx = x + Math.floor(p.rand() * w);
    const sy = y + Math.floor(p.rand() * (hz - y - 6));
    p.px(sx, sy, p.rand() < 0.3 ? P.star : P.night5);
  }
  // Moon with a crescent shadow.
  const m = BOOTH.moon;
  p.disc(m.x, m.y, 5, P.moon);
  p.disc(m.x + 2, m.y - 1, 4, P.night1);
  p.bayer(m.x - 8, m.y - 8, 16, 16, P.night3, 0.06);
  // Far shore: the town, low against the horizon.
  p.rect(x, hz - 3, w, 4, P.night0);
  let hx = x;
  while (hx < x + 92) {
    const hw = 4 + Math.floor(p.rand() * 6);
    const hh = 2 + Math.floor(p.rand() * 5);
    p.rect(hx, hz - 3 - hh, hw, hh, P.night0);
    if (p.rand() < 0.4) p.poly([[hx, hz - 3 - hh], [hx + hw / 2, hz - 6 - hh], [hx + hw, hz - 3 - hh]], P.night0);
    hx += hw + Math.floor(p.rand() * 2);
  }
  // The Chapel steeple and the water tower.
  p.rect(x + 70, hz - 14, 2, 11, P.night0);
  p.px(x + 70, hz - 15, P.night0);
  p.rect(x + 100, hz - 10, 5, 7, P.night0);
  p.rect(x + 106, hz - 8, 4, 5, P.night0);
  // The lake.
  p.vgrad(x, hz + 1, w, y + h - hz - 1, [P.night1, P.night2, P.night1]);
  for (let ly = hz + 2; ly < y + h; ly += 2) {
    for (let k = 0; k < 4; k++) {
      const lx = x + Math.floor(p.rand() * (w - 8));
      p.rect(lx, ly, 2 + Math.floor(p.rand() * 6), 1, P.night3);
    }
    // Moon path.
    const spread = (ly - hz) * 0.5 + 2;
    const mx = m.x - spread / 2 + p.rand() * spread;
    p.rect(Math.min(x + w - 4, mx), ly, 3, 1, p.rand() < 0.5 ? P.night5 : P.moon);
  }
  // Breakwater.
  p.rect(x + 70, hz + 3, w - 70, 2, P.night0);
  p.px(BOOTH.breakwaterLight.x, BOOTH.breakwaterLight.y, P.redDim);
  // Mullions.
  p.rect(x + w / 2 - 1, y, 2, h, P.wood4);
  p.rect(x, y + 30, w, 2, P.wood4);
  p.rect(x + w / 2 - 1, y, 1, h, P.wood5);
  // Glass glare.
  for (let k = 0; k < 6; k++) p.px(x + 6 + k, y + 4 + k, P.night4);
  for (let k = 0; k < 4; k++) p.px(x + 66 + k, y + 36 + k, P.night4);
}

function paintWallClutter(p: Painter): void {
  // Clock.
  const c = BOOTH.clock;
  p.disc(c.x, c.y, c.r + 1, P.wood0);
  p.disc(c.x, c.y, c.r, P.paperDim);
  p.disc(c.x, c.y, c.r - 1, P.paper);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    p.px(c.x + Math.cos(a) * (c.r - 2), c.y + Math.sin(a) * (c.r - 2), P.ink);
  }
  // Pinned town map.
  p.rect(152, 42, 40, 30, P.paperDim);
  p.rect(153, 43, 38, 28, P.paper);
  p.line(155, 60, 189, 52, P.night4); // shoreline
  p.bayer(155, 44, 34, 9, P.night5, 0.35); // the lake
  p.rect(160, 62, 3, 2, P.ink);
  p.rect(166, 64, 2, 2, P.ink);
  p.rect(175, 60, 3, 3, P.ink);
  p.rect(182, 63, 2, 2, P.ink);
  p.disc(158, 55, 1, P.red);
  p.line(158, 55, 176, 46, P.red);
  p.px(171, 43, P.red); // pin
  p.px(152, 42, P.metal5);
  // A photograph under the window, slightly crooked.
  p.poly([[30, 88], [52, 86], [53, 106], [31, 108]], P.paperDim);
  p.poly([[32, 90], [51, 88], [51, 103], [33, 105]], P.night3);
  p.rect(38, 94, 4, 7, P.night1); // a figure
  p.disc(40, 93, 1, P.night1);
  p.rect(44, 96, 3, 5, P.night1);
  p.disc(45, 95, 1, P.night1);
  // A calendar by the transmitter.
  p.rect(178, 80, 20, 24, P.paperDim);
  p.rect(179, 81, 18, 22, P.paper);
  p.rect(179, 81, 18, 5, P.red);
  for (let k = 0; k < 12; k++) p.px(181 + (k % 4) * 4, 89 + Math.floor(k / 4) * 4, P.ink);
  p.line(181, 89, 185, 93, P.red);
  // Hanging cable.
  for (let x = 196; x < 205; x++) p.px(x, 60 + Math.round(Math.sin((x - 196) / 3) * 2), P.metal0);
}

function paintTransmitter(p: Painter): void {
  // ON AIR sign (unlit; the lit state is an overlay).
  const s = BOOTH.onAir;
  p.rect(s.x, s.y, s.w, s.h, P.metal0);
  p.rect(s.x + 1, s.y + 1, s.w - 2, s.h - 2, P.redDim);
  p.tinyText(s.x + 11, s.y + 3, 'ON AIR', P.rust);

  // Cabinet.
  const x = 204, y = 18, w = 104, h = 104;
  p.rect(x, y, w, h, P.metal1);
  p.rect(x, y, w, 2, P.metal3);
  p.rect(x, y, 2, h, P.metal2);
  p.rect(x + w - 2, y, 2, h, P.metal0);
  p.bayer(x + 2, y + 2, w - 4, h - 4, P.metal2, 0.08);
  for (const ry of [y + 4, y + h - 5]) for (let rx = x + 5; rx < x + w - 3; rx += 12) p.px(rx, ry, P.metal4);

  // Tube bay.
  p.rect(x + 6, y + 6, w - 12, 34, P.black);
  p.box(x + 6, y + 6, w - 12, 34, P.metal3);
  for (const t of BOOTH.tubes) {
    // Socket.
    p.rect(t.x - 4, t.y + 12, 9, 3, P.metal3);
    // Glass envelope.
    p.rect(t.x - 3, t.y - 8, 7, 20, P.night2);
    p.rect(t.x - 2, t.y - 10, 5, 2, P.night2);
    p.px(t.x, t.y - 11, P.night3);
    p.rect(t.x - 3, t.y - 8, 1, 20, P.night4);
    // Plates and filament (dim; lit by glow sprites).
    p.rect(t.x - 1, t.y - 4, 3, 10, P.metal2);
    p.rect(t.x, t.y - 2, 1, 6, P.rust);
  }

  // Meters.
  for (const m of BOOTH.meters) {
    p.rect(m.x - m.r - 3, m.y - m.r - 2, m.r * 2 + 7, m.r + 9, P.metal0);
    p.rect(m.x - m.r - 2, m.y - m.r - 1, m.r * 2 + 5, m.r + 7, P.paperDim);
    p.rect(m.x - m.r - 1, m.y - m.r, m.r * 2 + 3, m.r + 5, P.paper);
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI * (1.15 + 0.7 * (k / 10));
      const len = k % 5 === 0 ? 3 : 2;
      for (let d = 0; d < len; d++) p.px(m.x + Math.cos(a) * (m.r - d), m.y + 2 + Math.sin(a) * (m.r - d), k > 7 ? P.red : P.ink);
    }
    p.tinyText(m.x - 5, m.y + 1, 'VU', P.ink);
  }

  // Tuning dial.
  const d = BOOTH.dial;
  p.disc(d.x, d.y, d.r + 3, P.metal0);
  p.disc(d.x, d.y, d.r + 2, P.metal3);
  p.disc(d.x, d.y, d.r, P.paper);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    p.px(d.x + Math.cos(a) * (d.r - 1), d.y + Math.sin(a) * (d.r - 1), k % 6 === 0 ? P.red : P.ink);
  }
  p.disc(d.x, d.y, 3, P.metal1);
  p.tinyText(d.x - 7, d.y + 5, '1260', P.ink);

  // Knobs and switches.
  for (const [kx, ky] of [[216, 98], [216, 112], [296, 98], [296, 112]]) {
    p.disc(kx, ky, 3, P.metal0);
    p.disc(kx, ky, 2, P.metal4);
    p.px(kx, ky - 2, P.white);
  }
  p.rect(x + 34, y + 96, 36, 5, P.wood4);
  p.tinyText(x + 38, y + 96, 'WLMP', P.wood0);

  // Cables to the desk.
  for (let k = 0; k < 3; k++) {
    for (let cy = y + h; cy < 128; cy++) p.px(x + 10 + k * 5 + Math.round(Math.sin(cy / 4 + k) * 1), cy, P.metal0);
  }
}

function paintDesk(p: Painter): void {
  // Desk top and front edge.
  p.rect(0, 118, 320, 52, P.wood4);
  p.vgrad(0, 118, 320, 10, [P.wood2, P.wood3, P.wood4]);
  for (let k = 0; k < 40; k++) {
    const gy = 126 + Math.floor(p.rand() * 42);
    const gx = Math.floor(p.rand() * 300);
    p.rect(gx, gy, 10 + Math.floor(p.rand() * 30), 1, P.wood3);
  }
  p.rect(0, 168, 320, 2, P.wood5);
  p.rect(0, 170, 320, 10, P.wood2);
  p.rect(0, 179, 320, 1, P.wood0);

  // Turntable.
  const r = BOOTH.record;
  p.rect(14, 124, 74, 36, P.wood1);
  p.rect(15, 125, 72, 33, P.wood3);
  p.rect(15, 125, 72, 1, P.wood5);
  p.rect(14, 160, 74, 2, P.wood0);
  p.oval(r.x, r.y + 1, r.rx + 2, r.ry + 2, P.metal0);
  p.oval(r.x, r.y, r.rx + 1, r.ry + 1, P.metal2);
  // Tonearm.
  p.disc(80, 129, 3, P.metal3);
  p.line(80, 129, 64, 141, P.metal5);
  p.line(80, 130, 64, 142, P.metal3);
  p.rect(61, 140, 4, 3, P.metal4);
  // Speed knob.
  p.disc(80, 153, 2, P.metal4);
  p.tinyText(70, 151, '78', P.wood0);

  // Desk lamp (gooseneck). Base, neck, shade.
  p.oval(100, 152, 8, 3, P.metal0);
  p.oval(100, 151, 7, 2, P.metal3);
  for (let t = 0; t <= 1; t += 0.02) {
    const lx = 100 + (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * 2 + t * t * 12;
    const ly = 150 + (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * -40 + t * t * -38;
    p.px(lx, ly, P.metal2);
    p.px(lx + 1, ly, P.metal4);
  }
  p.poly([[106, 110], [120, 106], [124, 118], [104, 120]], P.metal1);
  p.poly([[108, 111], [119, 108], [121, 116], [107, 118]], P.metal3);
  p.rect(107, 118, 16, 2, P.lamp);

  // Microphone: a ribbon mic on a desk stand.
  const m = BOOTH.mic;
  p.oval(m.x, 152, 14, 4, P.metal0);
  p.oval(m.x, 151, 13, 3, P.metal3);
  p.rect(m.x - 1, 124, 3, 27, P.metal2);
  p.rect(m.x, 124, 1, 27, P.metal4);
  // Yoke.
  p.rect(m.x - 12, 108, 2, 16, P.metal2);
  p.rect(m.x + 11, 108, 2, 16, P.metal2);
  p.rect(m.x - 12, 122, 25, 2, P.metal2);
  // Capsule.
  p.oval(m.x, m.y, 10, 15, P.metal0);
  p.oval(m.x, m.y, 9, 14, P.metal3);
  for (let gy = m.y - 12; gy <= m.y + 12; gy += 2) {
    const half = Math.round(9 * Math.sqrt(Math.max(0, 1 - Math.pow((gy - m.y) / 14, 2))));
    p.rect(m.x - half + 1, gy, half * 2 - 1, 1, P.metal1);
  }
  p.rect(m.x - 9, m.y - 1, 19, 3, P.metal4);
  p.rect(m.x - 9, m.y, 19, 1, P.metal5);
  p.rect(m.x - 3, m.y - 1, 7, 3, P.wood5); // badge
  p.oval(m.x - 4, m.y - 8, 2, 4, P.metal5);

  // Rundown clipboard.
  p.poly([[184, 134], [222, 132], [226, 164], [186, 166]], P.wood1);
  p.poly([[186, 136], [220, 134], [223, 162], [188, 164]], P.paper);
  p.rect(198, 132, 12, 3, P.metal4);
  for (let k = 0; k < 7; k++) p.line(190, 141 + k * 3, 216 - (k % 3) * 3, 140 + k * 3, P.paperDim);

  // Mug.
  const g = BOOTH.mug;
  p.rect(g.x - 5, g.y - 8, 10, 11, P.ember);
  p.rect(g.x - 5, g.y - 8, 10, 2, P.rust);
  p.rect(g.x - 4, g.y - 8, 8, 1, P.wood0);
  p.rect(g.x + 5, g.y - 6, 3, 1, P.ember);
  p.rect(g.x + 7, g.y - 6, 1, 5, P.ember);
  p.rect(g.x + 5, g.y - 2, 3, 1, P.ember);
  p.rect(g.x - 5, g.y + 3, 10, 1, P.wood1);

  // Rotary phone.
  const ph = BOOTH.phone;
  p.poly([[ph.x - 15, ph.y + 8], [ph.x + 15, ph.y + 8], [ph.x + 11, ph.y - 6], [ph.x - 11, ph.y - 6]], P.metal0);
  p.poly([[ph.x - 13, ph.y + 6], [ph.x + 13, ph.y + 6], [ph.x + 10, ph.y - 5], [ph.x - 10, ph.y - 5]], P.metal1);
  p.disc(ph.x, ph.y + 1, 6, P.metal0);
  p.ring(ph.x, ph.y + 1, 4, P.metal4);
  p.disc(ph.x, ph.y + 1, 1, P.paper);
  // Handset.
  p.rect(ph.x - 14, ph.y - 11, 28, 4, P.metal1);
  p.rect(ph.x - 14, ph.y - 11, 28, 1, P.metal3);
  p.rect(ph.x - 16, ph.y - 13, 6, 6, P.metal1);
  p.rect(ph.x + 10, ph.y - 13, 6, 6, P.metal1);
  // Cord.
  for (let k = 0; k < 10; k++) p.px(ph.x + 15 + k, ph.y + 6 + Math.round(Math.sin(k) * 1.5), P.metal0);
  // Line lamp housing.
  p.disc(BOOTH.phoneLamp.x, BOOTH.phoneLamp.y, 2, P.metal0);
  p.px(BOOTH.phoneLamp.x, BOOTH.phoneLamp.y, P.redDim);
}

/** The record on the platter: dark grooves and a label. Painted to its own small canvas. */
export function paintRecord(p: Painter, labelColor: string): void {
  const { rx, ry } = BOOTH.record;
  const cx = rx + 1, cy = ry + 1;
  p.clear();
  p.oval(cx, cy, rx, ry, P.black);
  for (let k = 3; k < rx; k += 3) {
    for (let a = 0; a < Math.PI * 2; a += 0.04) {
      if (Math.sin(a * 3 + k) > 0.3) p.px(cx + Math.cos(a) * k, cy + Math.sin(a) * k * (ry / rx), P.metal0);
    }
  }
  p.oval(cx, cy, 7, 3, labelColor);
  p.px(cx, cy, P.black);
}

/** The ON AIR sign, lit. Same size as BOOTH.onAir. */
export function paintOnAirLit(p: Painter): void {
  const s = BOOTH.onAir;
  p.clear();
  p.rect(0, 0, s.w, s.h, P.metal0);
  p.rect(1, 1, s.w - 2, s.h - 2, P.red);
  p.bayer(1, 1, s.w - 2, s.h - 2, '#ff6a5a', 0.25);
  p.tinyText(11, 3, 'ON AIR', P.hot);
}
