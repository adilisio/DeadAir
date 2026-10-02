import Phaser from 'phaser';
import '@fontsource/vt323';
import { W, H } from './config';
import { exposeDebug } from './debugHook';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { BoothScene } from './scenes/BoothScene';
import { DawnScene } from './scenes/DawnScene';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#07070c',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, BoothScene, DawnScene],
});
exposeDebug('game', game);
