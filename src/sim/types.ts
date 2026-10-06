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
  rule?: 'breather' | 'panic' | 'adFatigue' | 'dedication' | 'needles' | 'tube';
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

/** Story flags a card or caller depends on: all of `requires` set, none of `unless`. */
export interface Gate {
  requires?: string[];
  unless?: string[];
}

interface CardBase {
  id: string;
  /** Only in the crate when the town's flags allow it. */
  gate?: Gate;
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

/** One caller on the switchboard. */
export interface CallLine {
  id: string;
  /** Only rings when the town's flags allow it. */
  gate?: Gate;
  /** Who is calling (src/data/people.ts). Voice and person flags come from here. */
  person: import('../data/people').PersonId;
  /** For the teleprompter header while they're on air (may differ from the person's name: "No name"). */
  name: string;
  /** One short line on the board while it rings. */
  prompt: string;
  /** What you hear when you pick up off air to listen first. */
  preview: string;
  /** What they say on air. */
  script: string;
  voice?: { pitch: number; rate: number };
  /** Put on air and allowed to finish. A reach check when it matters who hears it. */
  aired: ReachCheck | Outcome;
  /** Never put on air. */
  notTaken?: Outcome;
  /** Dumped mid-call though they said nothing wrong. */
  cut?: Outcome;
  /** Where this caller turns: `at` is the first words that mustn't go out. */
  turn?: { at: string; caught: Outcome };
}

/** Several lines ring at once when a slot starts; the player picks who goes on air. */
export interface SwitchboardDef {
  slot: number;
  lines: CallLine[];
}

/** A call that went on air. `dumpedAt` is how many characters had been said when it was dumped. */
export interface CallRecord {
  line: string;
  dumpedAt?: number;
}

export type CallResult = 'aired' | 'caught' | 'late' | 'cut' | 'notTaken';

/** A squall off the lake. The transmitter only drifts while one is blowing. */
export interface StormDef {
  /** Slots the storm covers (0-based). */
  slots: number[];
  /** Dawn report when the signal held through it, or didn't. */
  held: { line: string; effects: Effects };
  lost: { line: string; effects: Effects };
}

/** A transmitter tube that blows partway through an item. */
export interface TubeDef {
  slot: number;
  /** When it blows, as a fraction of the item's length. */
  at: number;
  /** Which socket (0..4, V1..V5). */
  socket: number;
}

/** A faint signal keyed under the static, to be copied before it fades. */
export interface MorseDef {
  /** It starts when this slot starts. */
  slot: number;
  word: string;
  /** How long it keys before fading out. */
  seconds: number;
  decoded: Outcome;
  missed: Outcome;
}

export interface NightDef {
  id: string;
  number: number;
  cards: Card[];
  switchboard: SwitchboardDef;
  storm?: StormDef;
  tube?: TubeDef;
  morse?: MorseDef;
  signOn: string;
  signOff: string;
  otherStation: {
    /** Card ids in priority order; the first one left out of the rundown is read back. */
    prefer: string[];
    stamp: string;
    intro: string;
    outro: string;
  };
  /** The listener's letter on the ledger's last page. `{quote}` is what the Other Station said. */
  letter: { body: string; from: string };
  /** Rundowns for ?auto (a sensible show) and ?scene=dawn (a messy one). Must use ungated cards. */
  rundowns: { auto: string[]; demo: string[] };
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

/** How a record's needle went down: on the lead-in, late into the song, or skating across. */
export type NeedleResult = 'clean' | 'late' | 'scratch';

/** What the live show produced. Signal is 0..1 per slot (1 = perfectly tuned). */
export interface ShowPerformance {
  rundown: string[];
  signal: number[];
  deadAirSeconds: number;
  /** Calls put on air, in order. Lines not listed were never taken. */
  calls: CallRecord[];
  /** Per slot: how the needle dropped (records only; null or missing for talk). */
  needles?: (NeedleResult | null)[];
  /** Seconds the program was down to a blown tube (undefined if none blew). */
  tubeSeconds?: number;
  /** Whether the Morse signal was copied (undefined if it never keyed). */
  morse?: 'decoded' | 'missed';
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
