// Clemency Point from the water: the lighthouse, the station shack at its foot,
// and the town across the harbor. Painted at 320×180, at night or at dawn.

import { Painter } from './painter';
import { P } from './palette';

export const EXTERIOR = {
  lantern: { x: 230, y: 38 },
  shackWindow: { x: 251, y: 113 },
  townLights: [
    [18, 118], [24, 116], [31, 119], [40, 115], [47, 118], [55, 117], [63, 119], [70, 116],
    [79, 118], [86, 115], [94, 118], [101, 117], [110, 119],
  ] as [number, number][],
};

export function paintExterior(p: Painter, time: 'night' | 'dawn'): void {
  const night = time === 'night';
  const horizon = 120;
  p.clear();
  // Sky.
  p.vgrad(0, 0, 320, horizon, night
    ? [P.night0, P.night0, P.night1, P.night2, P.night3]
    : [P.dawn0, P.dawn1, P.dawn2, P.dawn3, P.dawn4, P.dawn5]);
  if (night) {
    for (let i = 0; i < 90; i++) {
      const r = p.rand();
      p.px(Math.floor(p.rand() * 320), Math.floor(p.rand() * 95), r < 0.15 ? P.star : r < 0.5 ? P.night5 : P.night4);
    }
  } else {
    // Low sun glow and a few clouds.
    p.disc(80, horizon - 2, 9, P.dawn5);
    p.disc(80, horizon - 2, 6, P.white);
    for (const [cx, cy, cw] of [[30, 70, 50], [150, 52, 70], [250, 80, 40], [190, 95, 60]]) {
      p.rect(cx, cy, cw, 3, P.dawn2);
      p.rect(cx + 6, cy - 2, cw - 14, 2, P.dawn3);
      p.rect(cx + 4, cy + 3, cw - 6, 1, P.dawn1);
    }
  }
  // Far shore: the town.
  const shore = night ? P.night0 : P.dawn0;
  p.rect(0, horizon - 4, 140, 5, shore);
  let hx = 4;
  while (hx < 130) {
    const hw = 5 + Math.floor(p.rand() * 7);
    const hh = 3 + Math.floor(p.rand() * 6);
    p.rect(hx, horizon - 4 - hh, hw, hh, shore);
    if (p.rand() < 0.5) p.poly([[hx, horizon - 4 - hh], [hx + hw / 2, horizon - 8 - hh], [hx + hw, horizon - 4 - hh]], shore);
    hx += hw + 1 + Math.floor(p.rand() * 3);
  }
  p.rect(60, horizon - 20, 2, 16, shore); // steeple
  p.rect(116, horizon - 14, 6, 10, shore); // silos
  p.rect(123, horizon - 11, 5, 7, shore);

  // Water.
  p.vgrad(0, horizon, 320, 60, night ? [P.night1, P.night2, P.night1, P.night0] : [P.dawn3, P.dawn2, P.dawn1, P.dawn0]);
  for (let y = horizon + 2; y < 180; y += 2) {
    for (let k = 0; k < 7; k++) {
      p.rect(Math.floor(p.rand() * 316), y, 2 + Math.floor(p.rand() * 8), 1, night ? P.night3 : P.dawn4);
    }
  }
  if (!night) for (let y = horizon + 1; y < 175; y += 2) p.rect(74 + Math.floor(p.rand() * 6), y, 6 + (y - horizon) / 6, 1, P.dawn5);

  // The point: a rocky spit with the lighthouse and the shack.
  const rock = night ? P.black : P.dawn0;
  const rockHi = night ? P.night2 : P.dawn1;
  p.poly([[160, 180], [175, 140], [205, 124], [262, 120], [300, 128], [320, 140], [320, 180]], rock);
  for (let k = 0; k < 30; k++) p.px(170 + Math.floor(p.rand() * 150), 126 + Math.floor(p.rand() * 20), rockHi);

  // Lighthouse tower (tapered), banded.
  const L = EXTERIOR.lantern;
  const towerTop = L.y + 8, towerBase = 124;
  for (let y = towerTop; y < towerBase; y++) {
    const t = (y - towerTop) / (towerBase - towerTop);
    const half = Math.round(5 + t * 6);
    const band = Math.floor((y - towerTop) / 14) % 2 === 0;
    const base = night ? (band ? P.night4 : P.redDim) : band ? P.white : P.red;
    const shade = night ? P.night2 : band ? P.paperDim : P.rust;
    p.rect(L.x - half, y, half * 2, 1, base);
    p.rect(L.x + Math.floor(half * 0.3), y, Math.ceil(half * 0.7), 1, shade);
  }
  // Gallery and lantern room.
  p.rect(L.x - 9, L.y + 6, 18, 2, night ? P.metal1 : P.metal2);
  p.rect(L.x - 5, L.y - 4, 10, 10, night ? P.metal0 : P.metal1);
  p.rect(L.x - 4, L.y - 3, 8, 8, night ? P.lamp : P.paperDim);
  p.rect(L.x - 1, L.y - 3, 1, 8, night ? P.amber : P.metal2);
  p.poly([[L.x - 6, L.y - 4], [L.x, L.y - 10], [L.x + 6, L.y - 4]], night ? P.metal1 : P.metal2);
  p.px(L.x, L.y - 11, P.metal3);

  // Station shack at the foot, with an antenna wire to the gallery.
  const S = EXTERIOR.shackWindow;
  p.rect(242, 108, 30, 16, night ? P.wood1 : P.wood3);
  p.poly([[239, 109], [257, 99], [275, 109]], night ? P.wood0 : P.wood2);
  p.rect(S.x - 3, S.y - 3, 7, 6, night ? P.lamp : P.wood1);
  p.rect(S.x, S.y - 3, 1, 6, night ? P.amber : P.wood0);
  p.rect(262, 115, 5, 9, night ? P.wood0 : P.wood1);
  for (let x = L.x + 9; x < 268; x++) {
    const t = (x - (L.x + 9)) / (268 - (L.x + 9));
    p.px(x, L.y + 7 + t * 92 + Math.sin(t * Math.PI) * 6, night ? P.metal2 : P.metal0);
  }
  // A mast with a red marker.
  p.rect(285, 70, 1, 52, night ? P.metal2 : P.metal0);
  p.px(285, 69, P.red);
}
