// The on-air HUD: teleprompter, tuning gauge, cue box, running order chips.
// The booth tasks (turntable, tubes, switchboard) have their own panels.
// Laid out to keep the ON AIR sign, tubes, dial, phone and turntable in view.
import Phaser from 'phaser';
import { W } from '../config';
import { UI } from '../art/palette';
import type { Card } from '../sim/types';
import { CLIMAX_HOLD, OTHER_OFFSET } from '../sim/intrusion';
import { KIND_TAG } from './RundownBuilder';
import { bar, button, label, panel, type Button } from './widgets';

export type CueState = 'hidden' | 'waiting' | 'open' | 'cued' | 'cuedHedged' | 'dead' | 'needleNext' | 'needle' | 'last';

const TP = { x: 12, y: 290, w: 446, h: 64 };
const CUE = { x: 464, y: 290, w: 164, h: 64 };
const TUNE = { x: 232, y: 236, w: 220, h: 50 };
/** The climax's three choices, in a strip over the tuning gauge (wider: the counter's title is long). */
const CHOICE = { x: 232, y: 192, w: 306, h: 42 };
const CHIPS = { x: 14, y: 52, w: 42, h: 15 };
const EERIE = 0x8aff9a;
/** First-time hints sit above the cue box, right of the transmitter gauge. */
const HINT = { x: 628, y: 287, w: 168 };

/** What else is on the dial: a second carrier, or the Other Station holding the frequency (an override, or the climax). */
export type DialIntrusion = 'carrier' | 'override' | 'climax' | null;

/** Which of the climax's choices the player is making: holding the dial, letting it through, or talking over it. */
export type ClimaxChoice = 'hold' | 'carry' | 'counter';

export class LiveHud {
  readonly root: Phaser.GameObjects.Container;
  private onAirText: Phaser.GameObjects.Text;
  private clockText: Phaser.GameObjects.Text;
  private deadText: Phaser.GameObjects.Text;
  private tpHeader: Phaser.GameObjects.Text;
  private tpDim: Phaser.GameObjects.Text;
  private tpLit: Phaser.GameObjects.Text;
  private tpFull = '';
  /** While the Other Station has the teleprompter: what the station's own item would show. */
  private behind: { header: string; text: string; color: string; reveal: boolean; spoken: number } | null = null;
  private tuneGfx: Phaser.GameObjects.Graphics;
  private tuneTitle: Phaser.GameObjects.Text;
  private tuneGroup: Phaser.GameObjects.Container;
  private tuneShown = false;
  private chipGfx: Phaser.GameObjects.Graphics;
  private chipText: Phaser.GameObjects.Text[] = [];
  private cueNext: Phaser.GameObjects.Text;
  private cueHint: Phaser.GameObjects.Text;
  private cueGfx: Phaser.GameObjects.Graphics;
  private deskBtn: Button;
  private deskHandler: () => void = () => {};
  private pauseHandler: () => void = () => {};
  private hintText: Phaser.GameObjects.Text;
  /** The slot of a card that ends the show, once it airs: the chips after it go dark. */
  private endAt: number | null = null;
  /** Pointer held on the tuning gauge: -1 left half, 1 right half. */
  pointerTune = 0;
  /** The climax's choices strip, while it runs. */
  private choice: { root: Phaser.GameObjects.Container; lines: Phaser.GameObjects.Text[]; gfx: Phaser.GameObjects.Graphics; counter: Button } | null = null;
  private uiLayer: <T extends Phaser.GameObjects.GameObject>(o: T) => T;

  constructor(
    private scene: Phaser.Scene,
    private cards: Card[],
    uiLayer: <T extends Phaser.GameObjects.GameObject>(o: T) => T = (o) => o,
  ) {
    this.uiLayer = uiLayer;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (parts.push(o), o);

    this.onAirText = add(label(scene, 14, 4, 'STANDBY', { size: 26, color: UI.dim }));
    this.clockText = add(label(scene, 14, 30, '', { size: 16, color: UI.text }));
    this.deadText = add(label(scene, 200, 30, '', { size: 16, color: UI.bad }));

    // Running order chips.
    this.chipGfx = add(scene.add.graphics());
    cards.forEach((c, i) => {
      this.chipText.push(add(label(scene, CHIPS.x + i * (CHIPS.w + 3) + CHIPS.w / 2, CHIPS.y + 1, KIND_TAG[c.kind].tag, { size: 13, color: KIND_TAG[c.kind].color, align: 'center' }).setOrigin(0.5, 0)));
    });

    // Teleprompter.
    add(panel(scene, TP.x, TP.y, TP.w, TP.h));
    this.tpHeader = add(label(scene, TP.x + 8, TP.y + 2, '', { size: 14, color: UI.amber }));
    this.tpDim = add(label(scene, TP.x + 8, TP.y + 17, '', { size: 14, color: '#8a7e6a', wrap: TP.w - 16 }));
    this.tpLit = add(label(scene, TP.x + 8, TP.y + 17, '', { size: 14, color: UI.text, wrap: TP.w - 16 }));

    // Cue box.
    add(panel(scene, CUE.x, CUE.y, CUE.w, CUE.h));
    this.cueGfx = add(scene.add.graphics());
    add(label(scene, CUE.x + 8, CUE.y + 2, 'UP NEXT', { size: 14, color: UI.amber }));
    this.cueNext = add(label(scene, CUE.x + 8, CUE.y + 18, '', { size: 15, color: UI.text, wrap: CUE.w - 16 }));
    this.cueHint = add(label(scene, CUE.x + 8, CUE.y + 46, '', { size: 14, color: UI.dim }));
    this.deskBtn = button(scene, CUE.x + CUE.w - 66, CUE.y + 4, 60, 14, 'THE DESK', () => this.deskHandler(), { size: 13 });
    this.deskBtn.container.setVisible(false);
    add(this.deskBtn.container);

    // First-time hint: dim, above the cue box, empty until a task shows up for the first time.
    this.hintText = add(label(scene, HINT.x, HINT.y, '', { size: 14, color: UI.dim, wrap: HINT.w, align: 'right' }).setOrigin(1, 1).setStroke('#07070c', 3));

    // Top right: a small PAUSE label (ESC does the same).
    const pause = add(label(scene, W - 8, 5, 'PAUSE', { size: 16, color: UI.dim }).setOrigin(1, 0));
    const pauseZone = add(scene.add.zone(W - 8 - 24, 5 + 8, 56, 18).setInteractive({ useHandCursor: true }));
    pauseZone.on('pointerover', () => pause.setColor(UI.hot));
    pauseZone.on('pointerout', () => pause.setColor(UI.dim));
    pauseZone.on('pointerdown', () => this.pauseHandler());

    // Tuning gauge: only shown while the transmitter needs a hand (storms).
    const tune: Phaser.GameObjects.GameObject[] = [panel(scene, TUNE.x, TUNE.y, TUNE.w, TUNE.h)];
    this.tuneTitle = label(scene, TUNE.x + 8, TUNE.y + 2, 'TRANSMITTER', { size: 14, color: UI.amber });
    tune.push(this.tuneTitle, label(scene, TUNE.x + TUNE.w - 8, TUNE.y + 2, 'hold A / D', { size: 14, color: UI.dim }).setOrigin(1, 0));
    this.tuneGfx = scene.add.graphics();
    tune.push(this.tuneGfx);
    // 1250 sits where the second carrier does.
    for (const [k, f] of [[(1 + OTHER_OFFSET) / 2, '1250'], [0.5, '1260'], [(1 - OTHER_OFFSET) / 2, '1270']] as const) {
      tune.push(label(scene, TUNE.x + 12 + k * (TUNE.w - 24), TUNE.y + 31, f, { size: 12, color: UI.dim }).setOrigin(0.5, 0));
    }
    const zone = scene.add.zone(TUNE.x + TUNE.w / 2, TUNE.y + TUNE.h / 2, TUNE.w, TUNE.h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => (this.pointerTune = p.x < TUNE.x + TUNE.w / 2 ? -1 : 1));
    zone.on('pointerup', () => (this.pointerTune = 0));
    zone.on('pointerout', () => (this.pointerTune = 0));
    tune.push(zone);
    this.tuneGroup = add(scene.add.container(0, 0, tune).setAlpha(0).setVisible(false));

    this.root = uiLayer(scene.add.container(0, 0, parts).setDepth(100));
  }

  /** Show or hide the transmitter gauge; a storm, a second carrier or an override changes its title. */
  setTransmitter(show: boolean, storm: boolean, other: DialIntrusion = null): void {
    if (other === 'climax') this.tuneTitle.setText('THE OTHER ONE').setColor(UI.eerie);
    else if (other === 'override') this.tuneTitle.setText('HOLD THE DIAL').setColor(UI.bad);
    else if (other === 'carrier') this.tuneTitle.setText('TWO CARRIERS').setColor(UI.eerie);
    else this.tuneTitle.setText(storm ? 'STORM - TRANSMITTER' : 'TRANSMITTER').setColor(storm ? UI.bad : UI.amber);
    if (show === this.tuneShown) return;
    this.tuneShown = show;
    this.pointerTune = 0;
    this.scene.tweens.killTweensOf(this.tuneGroup);
    if (show) this.tuneGroup.setVisible(true);
    this.scene.tweens.add({
      targets: this.tuneGroup, alpha: show ? 1 : 0, duration: show ? 180 : 600,
      onComplete: () => this.tuneGroup.setVisible(this.tuneShown),
    });
  }

  setOnAir(on: boolean, text = on ? '[ ON AIR ]' : 'OFF AIR'): void {
    this.onAirText.setText(text).setColor(on ? UI.bad : UI.dim);
  }

  setClock(text: string, deadAir = 0): void {
    this.clockText.setText(text);
    this.deadText.setX(this.clockText.x + this.clockText.width + 14);
    this.deadText.setText(deadAir > 0.05 ? `dead air ${deadAir.toFixed(1)}s` : '');
  }

  /** What the PAUSE label does. */
  setPauseHandler(onPause: () => void): void {
    this.pauseHandler = onPause;
  }

  /** A first-time hint above the cue box (empty text clears it). */
  setHint(text: string): void {
    this.hintText.setText(text);
  }

  /** What THE DESK button in the cue box does. */
  setDeskHandler(onDesk: () => void): void {
    this.deskHandler = onDesk;
  }

  /** Show THE DESK button while the desk can be opened; `open` lights it. */
  setDesk(available: boolean, open = false): void {
    this.deskBtn.container.setVisible(available || open);
    this.deskBtn.setLabel(open ? 'CLOSE' : 'THE DESK');
  }

  /** Relabel the running-order chips after a swap; hedged slots read `NEWS*`. */
  setChips(hedged: ReadonlySet<number> = new Set()): void {
    this.cards.forEach((c, i) => {
      this.chipText[i]?.setText(`${KIND_TAG[c.kind].tag}${hedged.has(i) ? '*' : ''}`).setColor(KIND_TAG[c.kind].color);
    });
  }

  /** A card that ends the show is airing in `slot`: nothing after it will. */
  setEndAt(slot: number | null): void {
    this.endAt = slot;
  }

  setOrder(current: number, done: number): void {
    const g = this.chipGfx;
    g.clear();
    this.cards.forEach((_c, i) => {
      const x = CHIPS.x + i * (CHIPS.w + 3);
      const isCur = i === current;
      const gone = this.endAt !== null && i > this.endAt;
      g.fillStyle(0x0a0b12, gone ? 0.25 : i < done && !isCur ? 0.5 : 0.85);
      g.fillRect(x, CHIPS.y, CHIPS.w, CHIPS.h);
      g.lineStyle(1, isCur ? 0xffe08a : 0xffb347, isCur ? 1 : gone ? 0.1 : 0.3);
      g.strokeRect(x + 0.5, CHIPS.y + 0.5, CHIPS.w - 1, CHIPS.h - 1);
      this.chipText[i].setAlpha(gone ? 0.12 : i < done && !isCur ? 0.35 : 1);
    });
  }

  /**
   * Show a script on the teleprompter; shrinks the type until it fits.
   * `reveal` hides the unspoken part (callers: you only know what they've said).
   */
  setTeleprompter(header: string, text: string, color: string = UI.text, reveal = false): void {
    if (this.behind) {
      this.behind = { header, text, color, reveal, spoken: 0 };
      return;
    }
    this.showPrompt(header, text, color, reveal);
  }

  private showPrompt(header: string, text: string, color: string, reveal: boolean): void {
    this.tpHeader.setText(header);
    this.tpFull = text;
    for (const size of [14, 13, 12, 11]) {
      this.tpDim.setFontSize(size).setText(text);
      this.tpLit.setFontSize(size);
      if (this.tpDim.height <= TP.h - 19) break;
    }
    if (reveal) this.tpDim.setText('');
    this.tpLit.setText('').setColor(color);
  }

  setSpoken(chars: number): void {
    if (this.behind) {
      this.behind.spoken = chars;
      return;
    }
    this.light(chars);
  }

  /** The Other Station takes the teleprompter; the station's own item carries on behind it. */
  showOverride(header: string, text: string): void {
    if (!this.behind) {
      this.behind = { header: this.tpHeader.text, text: this.tpFull, color: this.tpLit.style.color as string, reveal: this.tpDim.text === '', spoken: this.tpLit.text.length };
    }
    this.showPrompt(header, text, UI.eerie, true);
    this.tpHeader.setColor(UI.eerie);
  }

  overrideSpoken(chars: number): void {
    if (this.behind) this.light(chars);
  }

  /** Talking over the Other Station: the teleprompter shows what the DJ is reading (its own item still waits behind). */
  showCounter(header: string, text: string): void {
    if (!this.behind) return;
    this.showPrompt(header, text, UI.text, false);
    this.tpHeader.setColor(UI.amber);
  }

  /**
   * The climax's choices over the tuning gauge: hold the dial, let it through, or talk over
   * it with the counter card (SPACE, or the COUNTER button, which calls `onCounter`).
   */
  showClimax(counterTitle: string, onCounter: () => void): void {
    this.endClimax();
    const s = this.scene;
    const lines = [
      'HOLD THE DIAL - jam it',
      'LET IT THROUGH',
      `SPACE - talk over it: "${counterTitle}"`,
    ].map((t, k) => label(s, CHOICE.x + 8, CHOICE.y + 2 + k * 13, t, { size: 12, color: UI.dim }));
    const gfx = s.add.graphics();
    const counter = button(s, CHOICE.x + CHOICE.w - 58, CHOICE.y + 28, 52, 12, 'COUNTER', onCounter, { size: 12, color: EERIE, textColor: UI.eerie });
    const root = this.uiLayer(s.add.container(0, 0, [panel(s, CHOICE.x, CHOICE.y, CHOICE.w, CHOICE.h), gfx, ...lines, counter.container]).setDepth(101));
    this.choice = { root, lines, gfx, counter };
  }

  /**
   * Light the choice being made. `held`: the fraction of the climax so far the dial was held
   * (a small bar on the HOLD line, ticked where it would jam). `committed`: talked over, for good.
   */
  climaxState(active: ClimaxChoice, held: number, committed: boolean): void {
    const c = this.choice;
    if (!c) return;
    const order: ClimaxChoice[] = ['hold', 'carry', 'counter'];
    c.lines.forEach((t, k) => {
      const on = order[k] === active;
      t.setColor(on ? (active === 'counter' ? UI.eerie : active === 'hold' ? UI.hot : UI.text) : UI.dim).setAlpha(on ? 1 : committed ? 0.35 : 0.7);
    });
    c.counter.setEnabled(!committed);
    const g = c.gfx;
    g.clear();
    const bx = CHOICE.x + CHOICE.w - 58, by = CHOICE.y + 7, bw = 52;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(bx, by, bw, 4);
    g.fillStyle(held >= CLIMAX_HOLD ? 0x9be37a : 0xffb347, committed ? 0.35 : 0.9);
    g.fillRect(bx, by, Math.round(bw * Math.max(0, Math.min(1, held))), 4);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(bx + Math.round(bw * CLIMAX_HOLD), by - 1, 1, 6);
  }

  endClimax(): void {
    this.choice?.root.destroy(true);
    this.choice = null;
  }

  /** Give the teleprompter back to whatever the station has on now. */
  endOverride(): void {
    const b = this.behind;
    if (!b) return;
    this.behind = null;
    this.tpHeader.setColor(UI.amber);
    this.showPrompt(b.header, b.text, b.color, b.reveal);
    this.light(b.spoken);
  }

  private light(chars: number): void {
    if (!this.tpFull) return;
    let end = Math.min(this.tpFull.length, Math.max(0, Math.round(chars)));
    while (end < this.tpFull.length && /\S/.test(this.tpFull[end])) end++;
    this.tpLit.setText(this.tpFull.slice(0, end));
  }

  /**
   * The gauge. `other`: a second carrier sits on the dial (a dim needle at 1250), or the
   * Other Station has the frequency (the needle pins to 1250; the player's dial shows faintly).
   */
  drawTuning(error: number, quality: number, live: boolean, other: DialIntrusion = null): void {
    const g = this.tuneGfx;
    g.clear();
    const x0 = TUNE.x + 12, w = TUNE.w - 24, y = TUNE.y + 18;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(x0, y, w, 12);
    g.fillStyle(0x9be37a, 0.28);
    g.fillRect(x0 + w / 2 - w * 0.04, y, w * 0.08, 12);
    for (let k = 0; k <= 20; k++) {
      g.fillStyle(0xffb347, k % 5 === 0 ? 0.9 : 0.4);
      g.fillRect(x0 + (k / 20) * w, y + (k % 5 === 0 ? 0 : 7), 1, k % 5 === 0 ? 12 : 5);
    }
    const at = (e: number) => Math.round(x0 + w / 2 + e * (w / 2));
    if (other) {
      g.fillStyle(EERIE, 0.18);
      g.fillRect(at(OTHER_OFFSET) - 5, y, 10, 12);
      const pinned = other === 'override' || other === 'climax';
      g.fillStyle(EERIE, pinned ? 0.9 : 0.45);
      g.fillRect(at(OTHER_OFFSET + (pinned ? (Math.random() - 0.5) * 0.02 : 0)) - 1, y - 3, 2, 18);
    }
    g.fillStyle(live ? 0xff5040 : 0x777777, other === 'override' || other === 'climax' ? 0.35 : 1);
    g.fillRect(at(error) - 1, y - 3, 2, 18);
    const qColor = quality > 0.8 ? 0x9be37a : quality > 0.5 ? 0xffb347 : 0xff7a6b;
    bar(g, x0, TUNE.y + 44, w, 3, quality, qColor);
  }

  /** `hedge`: the next item can be read hedged, so the hint offers H as well as SPACE. */
  setCue(state: CueState, nextTitle: string, deadSeconds = 0, hedge = false): void {
    const g = this.cueGfx;
    g.clear();
    if (state === 'hidden') {
      this.cueNext.setText('');
      this.cueHint.setText('');
      return;
    }
    const hint = {
      waiting: 'cue opens near the end',
      open: hedge ? 'SPACE run it · H hedge it' : 'SPACE to cue it',
      cued: hedge ? 'cued - H to hedge it' : 'cued - rolls next',
      cuedHedged: 'cued hedged - rolls next',
      dead: `DEAD AIR ${deadSeconds.toFixed(1)}s - SPACE${hedge ? '/H' : '!'}`,
      needleNext: 'record - the arm swings in',
      needle: 'SPACE - drop the needle',
      last: 'the show ends here',
    }[state];
    const color = { waiting: UI.dim, open: UI.hot, cued: UI.good, cuedHedged: UI.good, dead: UI.bad, needleNext: UI.dim, needle: UI.hot, last: UI.dim }[state];
    this.cueNext.setText(nextTitle);
    this.cueHint.setText(hint).setColor(color);
    const pulse = state === 'dead' || state === 'open' || state === 'needle' ? 0.55 + 0.45 * Math.abs(Math.sin(this.scene.time.now / 160)) : 1;
    this.cueHint.setAlpha(pulse);
    if (state !== 'waiting' && state !== 'needleNext') {
      g.lineStyle(1, Phaser.Display.Color.HexStringToColor(color).color, 0.9 * pulse);
      g.strokeRect(CUE.x + 2.5, CUE.y + 2.5, CUE.w - 5, CUE.h - 5);
    }
  }

  destroy(): void {
    this.endClimax();
    this.root.destroy(true);
  }
}

export function kindHeader(card: Card): string {
  return KIND_TAG[card.kind].tag;
}
