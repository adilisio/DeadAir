// Dawn: the town's report on the night, as a morning ledger of a few pages: the numbers,
// what people are saying, the notices (classifieds to spend chits on), and a letter.
import Phaser from 'phaser';
import { ART_SCALE, DEBUG, H } from '../config';
import { markPhase } from '../debugHook';
import { applyScreenLook, glow, splitCameras } from './fx';
import { EXTERIOR } from '../art/exterior';
import { hex, P } from '../art/palette';
import { buyClassified, hasNextNight, nextNight, run, resetRun } from '../run';
import { alreadyBought, canBuy, classifiedsFor } from '../sim/classifieds';
import { TUBE_TYPES } from '../sim/tube';
import { resolveNight } from '../sim/resolver';
import { letterText } from '../sim/nights';
import { eventsOf } from '../sim/events';
import { FACTIONS, FACTION_NAMES, type Classified, type DawnLine, type NightResult } from '../sim/types';
import { button, label } from '../ui/widgets';
import { audio } from '../audio/engine';

const PAPER = { x: 236, y: 14, w: 392, h: 332 };
const INK = '#2a2420';
const INK_DIM = '#6b5f50';
// Rumors are what people are saying that may be wrong; for now they read like neutral lines.
const TONE: Record<DawnLine['tone'], string> = { good: '#2f6b2a', bad: '#8c2a1e', neutral: INK, eerie: '#1f6b47', rumor: INK };

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
    run.result = run.result ?? demoResult();
    this.result = run.result;
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
    const notices = classifiedsFor(run.night, this.result.after).length ? [(c: Phaser.GameObjects.Container) => this.pageNotices(c)] : [];
    this.pages = [(c) => this.pageNumbers(c), ...this.storyPages(), ...notices, (c) => this.pageOther(c)];

    const next = button(this, PAPER.x + PAPER.w - 150, PAPER.y + PAPER.h - 30, 138, 20, 'TURN THE PAGE >', () => this.turn(1), { size: 16, color: 0x5a3a20, textColor: INK, dimColor: INK_DIM });
    const prev = button(this, PAPER.x + 12, PAPER.y + PAPER.h - 30, 90, 20, '< BACK', () => this.turn(-1), { size: 16, color: 0x5a3a20, textColor: INK, dimColor: INK_DIM });
    const againText = hasNextNight() ? `SIGN ON: NIGHT ${NIGHT_WORDS[run.night.number + 1]?.toUpperCase() ?? run.night.number + 1}` : 'START OVER: NIGHT ONE';
    const again = button(this, PAPER.x + PAPER.w / 2 - 90, PAPER.y + PAPER.h - 30, 180, 20, againText, () => this.again(), { size: 16, color: 0x2f6b2a, textColor: '#1f4a1c' });
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
    markPhase(`dawn-night-${run.night.number}`);
    // ?auto turns every page, however many the night's stories fill.
    if (DEBUG.auto) this.time.addEvent({ delay: 4000, repeat: this.pages.length - 2, callback: () => this.turn(1) });
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
    const { before, after, headline } = this.result;
    const x = PAPER.x + 20;
    let y = PAPER.y + 66;
    const g = this.add.graphics();
    c.add(g);
    // Spacing for the meters; a headline above them pushes them down and closer together.
    let rowH = 20;
    let rowSize = 16;
    let gapHead = 26;
    let gapTrust = 24;
    let gapSpares = 22;
    if (headline) {
      markPhase('dawn-headline');
      const mid = PAPER.x + PAPER.w / 2;
      const text = label(this, mid, y - 4, headline.text, { size: 22, color: INK, align: 'center' }).setOrigin(0.5, 0);
      const sub = label(this, mid, text.y + text.height - 2, headline.sub, { size: 14, color: INK, align: 'center', wrap: PAPER.w - 48 }).setOrigin(0.5, 0);
      c.add([text, sub]);
      y = sub.y + sub.height + 5;
      g.fillStyle(hex(INK), 1);
      g.fillRect(PAPER.x + 12, y, PAPER.w - 24, 1);
      y += 6;
      gapHead = 22;
      gapTrust = 20;
      gapSpares = 18;
      const bottom = PAPER.y + PAPER.h - 34;
      rowH = Math.max(13, Math.min(20, Math.floor((bottom - y - gapHead - gapTrust - gapSpares) / 8)));
      rowSize = rowH < 16 ? 15 : 16;
    }
    c.add(label(this, x, y, 'HOW THE TOWN WOKE UP', { size: 20, color: INK }));
    y += gapHead;
    const rows: [string, number, number, number][] = [
      ['Morale', before.morale, after.morale, 100],
      ['Safety', before.safety, after.safety, 100],
      ['Your credibility', before.credibility, after.credibility, 100],
      ['Listeners', before.listeners, after.listeners, 250],
      ['Chits in the jar', before.chits, after.chits, 50],
    ];
    const bar = Math.round((rowSize - 4) / 2);
    const drawRow = (name: string, b: number, a: number, max: number, color: number) => {
      c.add(label(this, x, y, name, { size: rowSize, color: INK }));
      g.fillStyle(hex(P.paperDim), 1);
      g.fillRect(x + 150, y + bar, 150, 6);
      g.fillStyle(color, 1);
      g.fillRect(x + 150, y + bar, Math.round(150 * Math.min(1, a / max)), 6);
      const d = a - b;
      c.add(label(this, x + 310, y, `${a}`, { size: rowSize, color: INK }));
      c.add(label(this, x + 340, y, d === 0 ? '·' : `${d > 0 ? '+' : ''}${d}`, { size: rowSize, color: d > 0 ? TONE.good : d < 0 ? TONE.bad : INK_DIM }));
      y += rowH;
    };
    for (const [name, b, a, max] of rows) drawRow(name, b, a, max, hex(INK));
    // The drawer, one line.
    const spares = TUBE_TYPES.map((t) => `${t} x${after.spares[t] ?? 0}`).join('  ');
    c.add(label(this, x, y, `SPARES  ${spares}`, { size: 15, color: INK_DIM }));
    y += gapSpares;
    c.add(label(this, x, y, 'WHO TRUSTS THE LAMP', { size: 20, color: INK }));
    y += gapTrust;
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

  /** The classifieds: chits for a spare or a record, one click each. */
  private pageNotices(c: Phaser.GameObjects.Container): void {
    markPhase('dawn-notices');
    const town = this.result.after;
    const x = PAPER.x + 20;
    let y = PAPER.y + 66;
    c.add(label(this, x, y, 'NOTICES', { size: 20, color: INK }));
    c.add(label(this, PAPER.x + PAPER.w - 20, y + 4, `chits in the jar: ${town.chits}`, { size: 16, color: INK_DIM }).setOrigin(1, 0));
    y += 26;
    c.add(label(this, x, y, 'CLASSIFIEDS', { size: 14, color: INK_DIM }));
    y += 18;
    const btnW = 112;
    for (const ad of classifiedsFor(run.night, town)) {
      const text = label(this, x, y, ad.text, { size: 16, color: INK, wrap: PAPER.w - 40 - btnW - 10 });
      const bought = alreadyBought(town, ad);
      const b = button(this, PAPER.x + PAPER.w - 20 - btnW, y, btnW, 20, bought ? 'BOUGHT' : `BUY - ${ad.cost} chits`, () => this.buyAd(ad), {
        size: 16, color: 0x5a3a20, textColor: INK, dimColor: INK_DIM,
      });
      b.setEnabled(canBuy(town, ad));
      c.add([text, b.container]);
      y += Math.max(text.height, 20) + 14;
    }
  }

  private buyAd(ad: Classified): void {
    if (!buyClassified(ad) || !run.result) return;
    this.result = run.result;
    audio.sfx('thunk');
    this.showPage(this.page);
  }

  private pageOther(c: Phaser.GameObjects.Container): void {
    markPhase('dawn-letter');
    markPhase(`dawn-letter-night-${run.night.number}`);
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
    // The night's result chose the letter (some nights have more than one to choose from).
    const chosen = this.result.letter ?? run.night.letter;
    const letter = label(this, x, y, letterText(chosen, quote), { size: 16, color: INK, wrap: PAPER.w - 40 });
    // A long letter sets smaller, to leave room for the signature and the last line.
    for (let size = 15; size >= 13 && y + letter.height > PAPER.y + PAPER.h - 84; size--) letter.setFontSize(size);
    c.add(letter);
    y += letter.height + 4;
    c.add(label(this, PAPER.x + PAPER.w - 20, y, `- ${chosen.from}`, { size: 16, color: INK_DIM, align: 'right' }).setOrigin(1, 0));
    y += 28;
    const n = NIGHT_WORDS[run.night.number] ?? String(run.night.number);
    if (hasNextNight()) {
      c.add(label(this, x, y, `End of Night ${n}. The Lamp signs on again tonight.`, { size: 16, color: TONE.eerie }));
    } else {
      c.add(label(this, x, y, `End of Night ${n}. That's the whole story.`, { size: 16, color: TONE.eerie }));
    }
  }

  /** The last page's button: on to the next night, or back to the first. */
  private again(): void {
    if (hasNextNight()) nextNight();
    else resetRun();
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
  // Every line put on and allowed to finish, so a dump-worthy caller goes out too.
  return resolveNight(run.night, run.town, {
    rundown: run.night.rundowns.demo,
    signal: [1, 0.9, 0.6, 0.8, 1, 1],
    deadAirSeconds: 6,
    calls: (eventsOf(run.night, 'switchboard')[0]?.lines ?? []).slice(0, 2).map((l) => ({ line: l.id })),
  });
}

const NIGHT_WORDS: Record<number, string> = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven' };
