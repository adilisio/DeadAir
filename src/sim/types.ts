// Core types for the broadcast simulation. Pure data: no Phaser, no DOM.

export const FACTIONS = ['netters', 'chapel', 'linemen'] as const;
export type FactionId = (typeof FACTIONS)[number];

export const SEGMENTS = ['dusk', 'late', 'small'] as const;
export type SegmentId = (typeof SEGMENTS)[number];

/** Slots per segment and in the whole show. */
export const SLOTS_PER_SEGMENT = 2;
export const SHOW_SLOTS = SEGMENTS.length * SLOTS_PER_SEGMENT;

export type Mood = 'bright' | 'blue' | 'stirring';

/** Changes to the town. Faction trust and town stats are scaled by audience; the rest are not. */
export interface Effects {
  morale?: number;
  safety?: number;
  listeners?: number;
  credibility?: number;
  chits?: number;
  trust?: Partial<Record<FactionId, number>>;
}

export type Tone = 'good' | 'bad' | 'neutral' | 'eerie';

export interface DawnLine {
  text: string;
  tone: Tone;
  /** Which sequence rule produced this line, if any. */
  rule?: 'breather' | 'panic' | 'adFatigue' | 'dedication';
}

/** What happens when a reach check resolves. `effects` are applied unscaled. */
export interface Outcome {
  flag: string;
  effects: Effects;
  line: string;
  tone: Tone;
}

/** "Did the right people hear this?" — passes if faction share × signal ≥ threshold. */
export interface ReachCheck {
  faction: FactionId;
  threshold: number;
  success: Outcome;
  fail: Outcome;
  /** Applied when the card never airs. Defaults to `fail`. */
  unaired?: Outcome;
}

interface CardBase {
  id: string;
  title: string;
  /** One line for the prep screen. */
  blurb: string;
}

export interface RecordCard extends CardBase {
  kind: 'record';
  recordId: string;
  mood: Mood;
  loves: FactionId[];
  dislikes?: FactionId[];
}

interface TalkCardBase extends CardBase {
  /** What the DJ reads on air. */
  script: string;
  effects: Effects;
  /** Hard news: costs Morale unless the next item is a record (the breather rule). */
  grim?: boolean;
  /** The faction this item serves, for the dedication rule. */
  helps?: FactionId;
  reach?: ReachCheck;
}

export interface NewsCard extends TalkCardBase {
  kind: 'news';
  truth: 'true' | 'rumor' | 'false';
  /** For false news: what happens at dawn when the lie comes apart. */
  unravel?: { credibility: number; line: string };
}

export interface WarningCard extends TalkCardBase {
  kind: 'warning';
}

export interface AdCard extends TalkCardBase {
  kind: 'ad';
  sponsor: string;
}

export type Card = RecordCard | NewsCard | WarningCard | AdCard;
export type TalkCard = NewsCard | WarningCard | AdCard;

export interface CallerDef {
  /** The caller rings when this slot starts (0-based). */
  slot: number;
  name: string;
  /** What the caller says when put on air. */
  script: string;
  /** Shown on the phone while it rings. */
  prompt: string;
  onAir: ReachCheck;
  declined: Outcome;
  missed: Outcome;
}

export interface NightDef {
  id: string;
  number: number;
  cards: Card[];
  caller: CallerDef;
  signOn: string;
  signOff: string;
  otherStation: {
    /** Card ids in priority order; the first one left out of the rundown is read back. */
    prefer: string[];
    stamp: string;
    intro: string;
    outro: string;
  };
}

export interface TownState {
  morale: number;
  safety: number;
  credibility: number;
  listeners: number;
  chits: number;
  trust: Record<FactionId, number>;
  flags: string[];
}

export type CallerDecision = 'onair' | 'declined' | 'missed';

/** What the live show produced. Signal is 0..1 per slot (1 = perfectly tuned). */
export interface ShowPerformance {
  rundown: string[];
  signal: number[];
  deadAirSeconds: number;
  caller: CallerDecision;
}

export interface NightResult {
  before: TownState;
  after: TownState;
  lines: DawnLine[];
  otherStation: { cardId: string | null; script: string };
}

/** Display names (placeholders, see DESIGN.md). */
export const FACTION_NAMES: Record<FactionId, string> = {
  netters: 'Netters',
  chapel: 'Chapel',
  linemen: 'Linemen',
};
