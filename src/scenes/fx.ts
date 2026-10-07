// Shared look: bloom on bright things, a slight CRT curve, vignette, scanlines.
import Phaser from 'phaser';
import { W, H, DEBUG, RES } from '../config';

/** Zoom a camera so the logical W x H fills the RES-times-larger canvas. */
export function fitCamera(cam: Phaser.Cameras.Scene2D.Camera): Phaser.Cameras.Scene2D.Camera {
  cam.setZoom(RES);
  cam.centerOn(W / 2, H / 2);
  return cam;
}

export function applyScreenLook(scene: Phaser.Scene, opts: { bloom?: number } = {}): void {
  const cam = fitCamera(scene.cameras.main);
  if (DEBUG.nofx) return;
  Phaser.Actions.AddEffectBloom(cam, {
    threshold: 0.62,
    blurRadius: 3,
    blurSteps: 3,
    blurQuality: 1,
    blendAmount: opts.bloom ?? 0.7,
  });
  cam.filters.external.addBarrel(1.035);
  // Phaser's vignette darkens from the center out: keep it gentle (about 15% mid-screen, 45% in the corners).
  cam.filters.external.addVignette(0.5, 0.5, 1.0, 0.2);
  // Scanlines sit above everything, unaffected by lights.
  scene.add.tileSprite(0, 0, W, H, 'scanlines').setOrigin(0).setDepth(10_000).setAlpha(0.22).setScrollFactor(0);
}

/** A soft additive light blob. */
export function glow(scene: Phaser.Scene, x: number, y: number, size: number, color: number, alpha = 1): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, 'glow')
    .setDisplaySize(size, size)
    .setTint(color)
    .setAlpha(alpha)
    .setBlendMode(Phaser.BlendModes.ADD);
}

/**
 * A second, clean camera for UI: no bloom, curve or scanlines, so text stays crisp.
 * Everything that exists when this is called is treated as world (hidden from the UI camera);
 * pass later UI objects to `ui()` so the world camera skips them.
 */
export function splitCameras(scene: Phaser.Scene): { uiCam: Phaser.Cameras.Scene2D.Camera; ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T; fade: (out: boolean, ms: number, done?: () => void) => void } {
  const uiCam = fitCamera(scene.cameras.add(0, 0, W * RES, H * RES));
  uiCam.ignore(scene.children.list.slice());
  const ui = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    scene.cameras.main.ignore(o);
    return o;
  };
  const fade = (out: boolean, ms: number, done?: () => void) => {
    for (const cam of [scene.cameras.main, uiCam]) out ? cam.fadeOut(ms, 0, 0, 0) : cam.fadeIn(ms, 0, 0, 0);
    if (done) scene.cameras.main.once(out ? 'camerafadeoutcomplete' : 'camerafadeincomplete', done);
  };
  return { uiCam, ui, fade };
}
