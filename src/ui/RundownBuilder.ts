// Prep phase: pick six cards off the desk into three segments. What's left stays on the
// desk, and can still be swapped in live.
import Phaser from 'phaser';
import { UI } from '../art/palette';
import { AUDIENCE, reachHint, validateRundown } from '../sim/resolver';
import { FACTIONS, FACTION_NAMES, SEGMENTS, SHOW_SLOTS, type Card, type FactionId, type NightDef, type TownState } from '../sim/types';
import { bar, button, label, panel, toNum, type Button } from './widgets';
import { audio } from '../audio/engine';
import { resolveRecord } from '../data/records';

export const KIND_TAG: Record<Card['kind'], { tag: string; color: string }> = {
  record: { tag: 'REC', color: '#e8bd52' },
  news: { tag: 'NEWS', color: '#9fc6ff' },
  warning: { tag: 'WARN', color: '#ff8a6b' },
  ad: { tag: 'AD', color: '#9be37a' },
};

export const SEGMENT_LABEL = { dusk: 'DUSK   8 PM', late: 'LATE  11 PM', small: 'SMALL HOURS  2 AM' } as const;


export function describeCard(card: Card, town?: TownState): string {
  // A card that ends the show says so first thing.
  const base = describeKind(card, town);
  return card.kind !== 'record' && card.endsShow ? `${base} · ENDS THE SHOW` : base;
}

function describeKind(card: Card, town?: TownState): string {
  switch (card.kind) {
    case 'record': {
      const loves = card.loves.map((f) => FACTION_NAMES[f]).join(' & ');
      const hates = card.dislikes?.length ? ` · the ${card.dislikes.map((f) => FACTION_NAMES[f]).join(' & ')} can't stand it` : '';
      const r = resolveRecord(card.recordId);
      const who = r ? ` · ${r.performer}${r.standIn ? '' : `, ${r.year}`}` : '';
      return `RECORD${who} · loved by the ${loves}${hates}`;
    }
    case 'news':
      return `NEWS · from ${card.source}${card.grim ? ' · hard news' : ''}`;
    case 'warning':
      return `WARNING · the ${card.reach ? FACTION_NAMES[card.reach.faction] : 'town'} need to hear this${card.reach && town ? ` · ${reachHint(card.reach, town)}` : ''}${card.grim ? ' · hard news' : ''}`;
    case 'ad':
      return `AD · ${card.sponsor} · pays ${card.effects.chits ?? 0} chits`;
  }
}

/** Factions a card cares about, for highlighting the audience bars. */
function focusOf(card: Card): FactionId[] {
  if (card.kind === 'record') return card.loves;
  if (card.reach) return [card.reach.faction];
  if (card.helps) return [card.helps];
  return [];
}

const L = {
  crate: { x: 12, y: 40, w: 236, rowH: 16, bottom: 286 },
  show: { x: 392, y: 40, w: 236 },
  detail: { x: 12, y: 292, w: 616, h: 60 },
};

export class RundownBuilder {
  readonly root: Phaser.GameObjects.Container;
  readonly slots: (string | null)[] = Array(SHOW_SLOTS).fill(null);
  private selectedSlot: number | null = null;
  private crateRows: { card: Card; bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; tag: Phaser.GameObjects.Text }[] = [];
  private slotRows: { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; tag: Phaser.GameObjects.Text; y: number }[] = [];
  private audienceGfx: Phaser.GameObjects.Graphics;
  private detailTitle: Phaser.GameObjects.Text;
  private detailTag: Phaser.GameObjects.Text;
  private detailBody: Phaser.GameObjects.Text;
  private goLive: Button;
  private status: Phaser.GameObjects.Text;
  private focus: FactionId[] = [];
  private rowH = L.crate.rowH;

  constructor(
    scene: Phaser.Scene,
    private night: NightDef,
    private town: TownState,
    private onGoLive: (rundown: string[]) => void,
    private onChange: (rundown: (string | null)[]) => void = () => {},
  ) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (parts.push(o), o);

    // Header.
    add(label(scene, 12, 6, `NIGHT ${['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'][night.number] ?? night.number}  ·  PREP`, { size: 26, color: UI.amber }));
    add(label(scene, 14, 26, 'Pick six. When it airs matters.', { size: 14, color: UI.dim }));
    const t = town.trust;
    add(label(scene, 628, 8, `MORALE ${town.morale}   SAFETY ${town.safety}   CREDIBILITY ${town.credibility}`, { size: 14, color: UI.dim }).setOrigin(1, 0));
    add(label(scene, 628, 22, `LISTENERS ${town.listeners}   CHITS ${town.chits}   TRUST: NETTERS ${t.netters}  CHAPEL ${t.chapel}  LINEMEN ${t.linemen}`, { size: 14, color: UI.dim }).setOrigin(1, 0));

    // Crate. Rows tighten when a night opens more cards than fit at full height.
    const c = L.crate;
    this.rowH = Math.min(c.rowH, Math.floor((c.bottom - c.y - 30) / night.cards.length));
    add(panel(scene, c.x, c.y, c.w, 24 + night.cards.length * this.rowH + 6));
    add(label(scene, c.x + 8, c.y + 3, 'THE DESK', { size: 18, color: UI.amber }));
    night.cards.forEach((card, i) => {
      const y = c.y + 24 + i * this.rowH;
      const bg = add(scene.add.graphics());
      const tag = add(label(scene, c.x + 8, y, KIND_TAG[card.kind].tag, { size: 15, color: KIND_TAG[card.kind].color }));
      const text = add(label(scene, c.x + 46, y, truncate(card.title, 27), { size: 15 }));
      const zone = add(scene.add.zone(c.x + c.w / 2, y + this.rowH / 2, c.w - 8, this.rowH).setInteractive({ useHandCursor: true }));
      zone.on('pointerover', () => this.showDetail(card));
      zone.on('pointerdown', () => this.toggleCard(card.id));
      this.crateRows.push({ card, bg, text, tag });
    });

    // Rundown.
    const s = L.show;
    add(panel(scene, s.x, s.y, s.w, 214));
    add(label(scene, s.x + 8, s.y + 3, "TONIGHT'S SHOW", { size: 18, color: UI.amber }));
    this.audienceGfx = add(scene.add.graphics());
    SEGMENTS.forEach((seg, k) => {
      const y0 = s.y + 26 + k * 62;
      add(label(scene, s.x + 8, y0 - 1, SEGMENT_LABEL[seg], { size: 14, color: UI.dim }));
      for (let j = 0; j < 2; j++) {
        const idx = k * 2 + j;
        const y = y0 + 17 + j * 20;
        const bg = add(scene.add.graphics());
        const tag = add(label(scene, s.x + 12, y + 1, '', { size: 16 }));
        const text = add(label(scene, s.x + 50, y + 1, '', { size: 16 }));
        const zone = add(scene.add.zone(s.x + s.w / 2, y + 9, s.w - 16, 18).setInteractive({ useHandCursor: true }));
        zone.on('pointerdown', () => this.clickSlot(idx));
        zone.on('pointerover', () => {
          const id = this.slots[idx];
          const card = id ? this.cardById(id) : null;
          if (card) this.showDetail(card);
          else this.showSegmentHelp(seg);
        });
        this.slotRows.push({ bg, text, tag, y });
      }
    });
    this.goLive = button(scene, s.x, s.y + 220, s.w, 26, 'GO LIVE', () => this.tryGoLive());
    add(this.goLive.container);
    this.status = add(label(scene, s.x + s.w / 2, s.y + 250, '', { size: 14, color: UI.bad, align: 'center' }).setOrigin(0.5, 0));

    // Detail panel.
    const d = L.detail;
    add(panel(scene, d.x, d.y, d.w, d.h));
    this.detailTitle = add(label(scene, d.x + 10, d.y + 4, 'Hover a card to read it.', { size: 18, color: UI.hot }));
    this.detailTag = add(label(scene, d.x + 10, d.y + 22, 'Click a card to add it to the show. Click a slot to take it back out.', { size: 14, color: UI.dim }));
    this.detailBody = add(label(scene, d.x + 10, d.y + 36, '', { size: 14, wrap: d.w - 20 }));

    this.root = scene.add.container(0, 0, parts).setDepth(100);
    this.refresh();
  }

  private cardById(id: string): Card {
    return this.night.cards.find((c) => c.id === id)!;
  }

  rundown(): (string | null)[] {
    return [...this.slots];
  }

  /** Fill the show directly (auto mode, or a saved draft). */
  fill(ids: string[]): void {
    ids.forEach((id, i) => (this.slots[i] = id));
    this.refresh();
  }

  /** The group a card belongs to (only talk cards have one). */
  private groupOf(id: string): string | undefined {
    const c = this.cardById(id);
    return c.kind !== 'record' ? c.group : undefined;
  }

  /** Another card of this card's group is already in the show. */
  private siblingPlaced(id: string): boolean {
    const g = this.groupOf(id);
    return !!g && this.slots.some((s) => !!s && s !== id && this.groupOf(s) === g);
  }

  private toggleCard(id: string): void {
    const at = this.slots.indexOf(id);
    if (at >= 0) {
      this.slots[at] = null;
      audio.sfx('click');
    } else if (this.siblingPlaced(id)) {
      this.status.setText('Only one of those can air.');
      return;
    } else {
      const target = this.selectedSlot !== null && this.slots[this.selectedSlot] === null ? this.selectedSlot : this.slots.indexOf(null);
      if (target < 0) {
        this.status.setText('The show is full. Click a slot to free it.');
        return;
      }
      this.slots[target] = id;
      this.selectedSlot = null;
      audio.sfx('click');
    }
    this.status.setText('');
    this.refresh();
  }

  private clickSlot(idx: number): void {
    if (this.slots[idx]) {
      this.slots[idx] = null;
      this.selectedSlot = idx;
    } else {
      this.selectedSlot = this.selectedSlot === idx ? null : idx;
    }
    audio.sfx('click');
    this.refresh();
  }

  private tryGoLive(): void {
    const ids = this.slots.filter((s): s is string => !!s);
    const problem = ids.length < SHOW_SLOTS ? `Fill all ${SHOW_SLOTS} slots first (${ids.length}/${SHOW_SLOTS}).` : validateRundown(this.night, ids);
    if (problem) {
      this.status.setText(problem);
      this.goLive.flash();
      return;
    }
    this.onGoLive(ids);
  }

  private showDetail(card: Card): void {
    this.detailTitle.setText(card.title);
    this.detailTag.setText(describeCard(card, this.town)).setColor(KIND_TAG[card.kind].color);
    this.detailBody.setText(card.blurb);
    this.focus = focusOf(card);
    this.drawAudience();
  }

  private showSegmentHelp(seg: (typeof SEGMENTS)[number]): void {
    const a = AUDIENCE[seg];
    const who = FACTIONS.map((f) => `${FACTION_NAMES[f]} ${Math.round(a.share[f] * 100)}%`).join(' · ');
    this.detailTitle.setText(SEGMENT_LABEL[seg]);
    this.detailTag.setText(`Listening: ${who}`).setColor(UI.dim);
    this.detailBody.setText(
      seg === 'dusk'
        ? 'Suppertime. The whole town has the radio on. Your biggest audience.'
        : seg === 'late'
          ? 'The Chapel keeps early hours. The Linemen are up on the pylons, stringing line with a radio clipped to the belt.'
          : 'Almost nobody. Except the Netters, getting the boats ready in the dark.',
    );
    this.focus = [];
    this.drawAudience();
  }

  private drawAudience(): void {
    const g = this.audienceGfx;
    g.clear();
    const s = L.show;
    SEGMENTS.forEach((seg, k) => {
      const y0 = s.y + 26 + k * 62 + 4;
      FACTIONS.forEach((f, i) => {
        const x = s.x + 132 + i * 34;
        const col = toNum(UI.faction[f]);
        const lit = this.focus.length === 0 || this.focus.includes(f);
        g.fillStyle(col, lit ? 1 : 0.25);
        g.fillRect(x, y0, 3, 7);
        g.setAlpha(1);
        bar(g, x + 5, y0 + 1, 24, 5, AUDIENCE[seg].share[f], lit ? col : 0x444444);
      });
    });
  }

  private refresh(): void {
    const used = new Set(this.slots.filter(Boolean));
    const c = L.crate;
    this.crateRows.forEach((row, i) => {
      const y = c.y + 24 + i * this.rowH;
      const placed = used.has(row.card.id);
      // A sibling of a placed group card can't go in: greyed out further.
      const blocked = !placed && this.siblingPlaced(row.card.id);
      row.bg.clear();
      if (placed) {
        row.bg.fillStyle(0xffb347, 0.1);
        row.bg.fillRect(c.x + 4, y, c.w - 8, this.rowH - 1);
      }
      row.text.setColor(placed || blocked ? UI.dim : UI.text).setAlpha(blocked ? 0.45 : 1);
      row.tag.setAlpha(placed ? 0.4 : blocked ? 0.25 : 1);
    });
    this.slotRows.forEach((row, i) => {
      const id = this.slots[i];
      const s = L.show;
      row.bg.clear();
      const selected = this.selectedSlot === i;
      row.bg.lineStyle(1, 0xffb347, selected ? 1 : id ? 0.5 : 0.25);
      row.bg.fillStyle(0xffb347, selected ? 0.18 : id ? 0.08 : 0.02);
      row.bg.fillRect(s.x + 8, row.y, s.w - 16, 18);
      row.bg.strokeRect(s.x + 8.5, row.y + 0.5, s.w - 17, 17);
      if (id) {
        const card = this.cardById(id);
        row.tag.setText(KIND_TAG[card.kind].tag).setColor(KIND_TAG[card.kind].color);
        row.text.setText(truncate(card.title, 24)).setColor(UI.text);
      } else {
        row.tag.setText('');
        row.text.setText(selected ? '< pick a card >' : '- empty -').setColor(UI.dim);
      }
    });
    const filled = this.slots.filter(Boolean).length;
    this.goLive.setLabel(filled === SHOW_SLOTS ? 'GO LIVE' : `GO LIVE  (${filled}/${SHOW_SLOTS})`);
    this.goLive.setEnabled(filled === SHOW_SLOTS);
    this.drawAudience();
    this.onChange(this.rundown());
  }

  destroy(): void {
    this.root.destroy(true);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 2) + '..' : s;
}
