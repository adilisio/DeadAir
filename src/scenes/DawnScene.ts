// Dawn: the town's report on the night, as a three-page morning ledger.
import Phaser from 'phaser';
import { ART_SCALE, DEBUG, H } from '../config';
import { markPhase } from '../debugHook';
import { applyScreenLook, glow, splitCameras } from './fx';
import { EXTERIOR } from '../art/exterior';
import { hex, P } from '../art/palette';
import { run, resetRun } from '../run';
import { NIGHT_1_DEMO_RUNDOWN } from '../data/night1';
import { STARTING_STATE, resolveNight } from '../sim/resolver';
import { FACTIONS, FACTION_NAMES, type DawnLine, type NightResult } from '../sim/types';
import { button, label } from '../ui/widgets';
import { audio } from '../audio/engine';

const PAPER = { x: 236, y: 14, w: 392, h: 332 };
const INK = '#2a2420';
const INK_DIM = '#6b5f50';
const TONE: Record<DawnLine['tone'], string> = { good: '#2f6b2a', bad: '#8c2a1e', neutral: INK, eerie: '#1f6b47' };

export class DawnScene extends Phaser.Scene {
  private page = 0;
  private pages: ((root: Phaser.GameObjects.Container) => void)[] = [];
  private content!: Phaser.GameObjects.Container;
  private result!: NightResult;
  private fadeAll: (out: boolean, ms: number, done?: () => void) => void = () => {};

  constructor() {
    super('Dawn');
  }

  create(): void {
    this.result = run.result ?? demoResult();
    const S = ART_SCALE;
    this.add.image(0, 0, 'exterior-dawn').setOrigin(0).setScale(S);
    glow(this, 80 * S, 118 * S, 160, hex(P.dawn5), 0.6);
    this.spawnGulls();
    applyScreenLook(this, { bloom: 0.35 });
    const { ui, fade } = splitCameras(this);
    this.fadeAll = fade;

    // The ledger: a sheet of paper, on the clean UI camera.
    const g = ui(this.add.graphics());
    g.fillStyle(0x000000, 0.35);
    g.fillRect(PAPER.x + 4, PAPER.y + 5, PAPER.w, PAPER.h);
    g.fillStyle(hex(P.paper), 1);
    g.fillRect(PAPER.x, PAPER.y, PAPER.w, PAPER.h);
    g.lineStyle(1, hex(P.paperDim), 1);
    g.strokeRect(PAPER.x + 4.5, PAPER.y + 4.5, PAPER.w - 9, PAPER.h - 9);
    ui(label(this, PAPER.x + PAPER.w / 2, PAPER.y + 8, 'THE VESPER LEDGER', { size: 30, color: INK, align: 'center' }).setOrigin(0.5, 0));
    ui(label(this, PAPER.x + PAPER.w / 2, PAPER.y + 36, `the morning after night ${run.night.number}  ·  one chit  ·  read it and pass it on`, { size: 14, color: INK_DIM, align: 'center' }).setOrigin(0.5, 0));
    g.fillStyle(hex(INK), 1);
    g.fillRect(PAPER.x + 12, PAPER.y + 54, PAPER.w - 24, 2);
    g.fillRect(PAPER.x + 12, PAPER.y + 57, PAPER.w - 24, 1);

    this.content = ui(this.add.container(0, 0));
    this.pages = [(c) => this.pageNumbers(c), ...this.storyPages(), (c) => this.pageOther(c)];

    const next = button(this, PAPER.x + PAPER.w - 150, PAPER.y + PAPER.h - 30, 138, 20, 'TURN THE PAGE >', () => this.turn(1), { size: 16, color: 0x5a3a20, textColor: INK, dimColor: INK_DIM });
    const prev = button(this, PAPER.x + 12, PAPER.y + PAPER.h - 30, 90, 20, '< BACK', () => this.turn(-1), { size: 16, color: 0x5a3a20, textColor: INK, dimColor: INK_DIM });
    const again = button(this, PAPER.x + PAPER.w / 2 - 80, PAPER.y + PAPER.h - 30, 160, 20, 'PLAY THE NIGHT AGAIN', () => this.again(), { size: 16, color: 0x2f6b2a, textColor: '#1f4a1c' });
    for (const b of [next, prev, again]) ui(b.container);
    this.events.on('page', () => {
      next.container.setVisible(this.page < this.pages.length - 1);
      prev.container.setVisible(this.page > 0);
      again.container.setVisible(this.page === this.pages.length - 1);
    });

    this.fadeAll(false, 1500);
    audio.setStatic(0.02);
    this.showPage(0);
    markPhase('dawn');
    if (DEBUG.auto) this.time.addEvent({ delay: 4000, repeat: 6, callback: () => this.turn(1) });
  }

  private turn(d: number): void {
    const p = Phaser.Math.Clamp(this.page + d, 0, this.pages.length - 1);
    if (p !== this.page) {
      audio.sfx('click');
      this.showPage(p);
    }
  }

  private showPage(p: number): void {
    this.page = p;
    this.content.removeAll(true);
    this.pages[p](this.content);
    this.content.setAlpha(0);
    this.tweens.add({ targets: this.content, alpha: 1, duration: 300 });
    this.events.emit('page');
    markPhase(`dawn-page-${p}`);
  }

  private pageNumbers(c: Phaser.GameObjects.Container): void {
    const { before, after } = this.result;
    const x = PAPER.x + 20;
    let y = PAPER.y + 66;
    c.add(label(this, x, y, 'HOW THE TOWN WOKE UP', { size: 20, color: INK }));
    y += 26;
    const rows: [string, number, number, number][] = [
      ['Morale', before.morale, after.morale, 100],
      ['Safety', before.safety, after.safety, 100],
      ['Your credibility', before.credibility, after.credibility, 100],
      ['Listeners', before.listeners, after.listeners, 250],
      ['Chits in the jar', before.chits, after.chits, 50],
    ];
    const g = this.add.graphics();
    c.add(g);
    const drawRow = (name: string, b: number, a: number, max: number, color: number) => {
      c.add(label(this, x, y, name, { size: 16, color: INK }));
      g.fillStyle(hex(P.paperDim), 1);
      g.fillRect(x + 150, y + 6, 150, 6);
      g.fillStyle(color, 1);
      g.fillRect(x + 150, y + 6, Math.round(150 * Math.min(1, a / max)), 6);
      const d = a - b;
      c.add(label(this, x + 310, y, `${a}`, { size: 16, color: INK }));
      c.add(label(this, x + 340, y, d === 0 ? '·' : `${d > 0 ? '+' : ''}${d}`, { size: 16, color: d > 0 ? TONE.good : d < 0 ? TONE.bad : INK_DIM }));
      y += 20;
    };
    for (const [name, b, a, max] of rows) drawRow(name, b, a, max, hex(INK));
    y += 10;
    c.add(label(this, x, y, 'WHO TRUSTS THE LAMP', { size: 20, color: INK }));
    y += 26;
    const fColor = { netters: 0x2b7f92, chapel: 0x6f4f9a, linemen: 0xa4501f };
    for (const f of FACTIONS) drawRow(`The ${FACTION_NAMES[f]}`, before.trust[f], after.trust[f], 100, fColor[f]);
  }

  private storyPages(): ((c: Phaser.GameObjects.Container) => void)[] {
    // Lay the night's lines onto as many pages as they need.
    const lines = this.result.lines;
    const pages: DawnLine[][] = [];
    let current: DawnLine[] = [];
    let used = 0;
    const budget = 210;
    const measure = this.add.text(0, 0, '', { fontFamily: 'VT323', fontSize: '16px', wordWrap: { width: PAPER.w - 52 }, lineSpacing: -2 }).setVisible(false);
    for (const line of lines) {
      measure.setText(line.text);
      const h = measure.height + 10;
      if (used + h > budget && current.length) {
        pages.push(current);
        current = [];
        used = 0;
      }
      current.push(line);
      used += h;
    }
    if (current.length) pages.push(current);
    measure.destroy();

    return pages.map((page, n) => (c: Phaser.GameObjects.Container) => {
      const x = PAPER.x + 20;
      let y = PAPER.y + 66;
      c.add(label(this, x, y, n === 0 ? 'WHAT PEOPLE ARE SAYING' : 'WHAT PEOPLE ARE SAYING (CONT.)', { size: 20, color: INK }));
      y += 28;
      page.forEach((line, i) => {
        const bullet = label(this, x, y, line.tone === 'good' ? '+' : line.tone === 'bad' ? '-' : '·', { size: 16, color: TONE[line.tone] });
        const t = label(this, x + 14, y, line.text, { size: 16, color: TONE[line.tone], wrap: PAPER.w - 52 });
        c.add([bullet, t]);
        bullet.setAlpha(0);
        t.setAlpha(0);
        this.tweens.add({ targets: [bullet, t], alpha: 1, duration: 400, delay: 200 + i * 450 });
        y += t.height + 10;
      });
    });
  }

  private pageOther(c: Phaser.GameObjects.Container): void {
    markPhase('dawn-letter');
    const x = PAPER.x + 20;
    let y = PAPER.y + 66;
    c.add(label(this, x, y, 'LETTERS', { size: 20, color: INK }));
    y += 28;
    const card = run.night.cards.find((k) => k.id === this.result.otherStation.cardId);
    const body = card && card.kind !== 'record' ? card.script : run.night.otherStation.outro;
    let quote = '';
    for (const sentence of body.split(/(?<=[.!?])\s+/)) {
      if (quote && (quote + ' ' + sentence).length > 110) break;
      quote = quote ? `${quote} ${sentence}` : sentence;
    }
    const letter =
      `To the Lamp. My husband says I dreamed it, but I didn't. After you signed off last night ` +
      `I left the set on, and around two there was someone on twelve-sixty. They sounded like you. ` +
      `They said, "${quote}" Then they said goodnight. Was that you? Please say it was you.`;
    c.add(label(this, x, y, letter, { size: 16, color: INK, wrap: PAPER.w - 40 }));
    c.add(label(this, PAPER.x + PAPER.w - 20, y + 120, '- a listener on Dock Street', { size: 16, color: INK_DIM, align: 'right' }).setOrigin(1, 0));
    y += 160;
    c.add(label(this, x, y, 'End of Night One. Thanks for listening.', { size: 16, color: TONE.eerie }));
    c.add(label(this, x, y + 18, 'This is the M1 demo: one night in the booth. Days, more nights and the rest of Port Vesper are coming.', { size: 14, color: INK_DIM, wrap: PAPER.w - 40 }));
  }

  private again(): void {
    resetRun();
    audio.sfx('thunk');
    this.fadeAll(true, 600, () => this.scene.start('Booth'));
  }

  private spawnGulls(): void {
    const S = ART_SCALE;
    for (let k = 0; k < 4; k++) {
      const gull = this.add.graphics();
      gull.lineStyle(1, 0x3b3f6b, 1);
      gull.beginPath();
      gull.moveTo(-4, 0);
      gull.lineTo(0, 2);
      gull.lineTo(4, 0);
      gull.strokePath();
      gull.setPosition(-20 - k * 60, (30 + k * 12) * S);
      this.tweens.add({ targets: gull, x: 700, y: `-=${10 + k * 4}`, duration: 26000 + k * 5000, delay: k * 2500, repeat: -1 });
      this.tweens.add({ targets: gull, scaleY: 0.4, duration: 300 + k * 40, yoyo: true, repeat: -1 });
    }
    void EXTERIOR;
    void H;
  }
}

/** For ?scene=dawn: a plausible night, so the ledger can be looked at directly. */
function demoResult(): NightResult {
  return resolveNight(run.night, STARTING_STATE, {
    rundown: NIGHT_1_DEMO_RUNDOWN,
    signal: [1, 0.9, 0.6, 0.8, 1, 1],
    deadAirSeconds: 6,
    caller: 'onair',
  });
}
