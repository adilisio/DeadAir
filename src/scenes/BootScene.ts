import Phaser from 'phaser';
import { W, H } from '../config';
import { markPhase } from '../debugHook';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.add
      .text(W / 2, H / 2, 'DEAD AIR', { fontFamily: 'VT323', fontSize: '48px', color: '#ffb347' })
      .setOrigin(0.5);
    markPhase('boot');
  }
}
