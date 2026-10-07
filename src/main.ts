import Phaser from 'phaser';
import '@fontsource/vt323';
import { W, H, RES } from './config';
import { exposeDebug } from './debugHook';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { BoothScene } from './scenes/BoothScene';
import { DawnScene } from './scenes/DawnScene';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: W * RES,
  height: H * RES,
  backgroundColor: '#07070c',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, BoothScene, DawnScene],
});
exposeDebug('game', game);

// Keys go to the game: the canvas can take focus, and a click on it takes it (so keys still
// work after clicking elsewhere on the page, or in the frame of an embedding site).
game.events.once(Phaser.Core.Events.READY, () => {
  const canvas = game.canvas;
  canvas.tabIndex = 0;
  canvas.style.outline = 'none';
  const focus = () => {
    window.focus();
    canvas.focus({ preventScroll: true });
  };
  canvas.addEventListener('pointerdown', focus);
  focus();
});
