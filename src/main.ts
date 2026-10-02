import Phaser from 'phaser';
import '@fontsource/vt323';
import { W, H } from './config';
import { BootScene } from './scenes/BootScene';

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#07070c',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene],
});
