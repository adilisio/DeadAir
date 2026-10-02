// The Dead Air palette. Cool night blues, warm tube amber, one wrong green.

export const P = {
  black: '#05060a',
  night0: '#0b0e1a',
  night1: '#121a2e',
  night2: '#1b2742',
  night3: '#263657',
  night4: '#34496e',
  night5: '#4a6491',
  moon: '#9fb4d6',
  star: '#dfe8ff',

  wood0: '#170f0e',
  wood1: '#231817',
  wood2: '#33231f',
  wood3: '#47312a',
  wood4: '#5f4336',
  wood5: '#7d5a45',

  metal0: '#15181d',
  metal1: '#232831',
  metal2: '#353d49',
  metal3: '#4c5665',
  metal4: '#6c7888',
  metal5: '#9aa6b5',

  amber: '#ffb347',
  tube: '#ff9c3a',
  lamp: '#ffd27a',
  hot: '#fff1c2',
  ember: '#c4552b',
  rust: '#7a2a1c',

  red: '#e0473f',
  redDim: '#5c1c1a',

  ghost: '#8aff9a',
  ghostDim: '#2d6b45',

  paper: '#d9cfb3',
  paperDim: '#a89c80',
  ink: '#2a2420',
  white: '#f4f1e8',

  // Dawn
  dawn0: '#3b3f6b',
  dawn1: '#6a5f8f',
  dawn2: '#b0779a',
  dawn3: '#e59a8c',
  dawn4: '#f6c48f',
  dawn5: '#fde7b5',
} as const;

/** Hex string to 0xRRGGBB. */
export const hex = (c: string): number => parseInt(c.slice(1), 16);

/** UI colors (used by Phaser text/graphics). */
export const UI = {
  text: '#f2e3c4',
  dim: '#9d8f78',
  amber: '#ffb347',
  hot: '#ffe08a',
  good: '#9be37a',
  bad: '#ff7a6b',
  eerie: '#8aff9a',
  panel: 0x0a0b12,
  panelEdge: 0xffb347,
  faction: { netters: '#5ec4d6', chapel: '#c7a3f0', linemen: '#e07a3c' },
} as const;
