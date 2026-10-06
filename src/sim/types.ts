// Core types for the broadcast simulation. Pure data: no Phaser, no DOM.

import type { PersonId } from '../data/people';
import type { TubeType } from './tube';

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
  rule?: 'breather' | 'panic' | 'adFatigue' | 'dedication' | 'needles' | 'tube' | 'swap';
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

/** Town numbers a gate can read. */
export const STAT_NAMES = [
  'morale', 'safety', 'credibility', 'listeners', 'chits', 'trust.netters', 'trust.chapel', 'trust.linemen',
] as const;
export type StatName = (typeof STAT_NAMES)[number];

/**
 * When a card or caller is in play. Every clause must hold: all of `requires` set, none of
 * `unless`, every `when` threshold (inclusive), and for switchboard lines and desk cards, `tonight`.
 */
export interface Gate {
  requires?: string[];
  unless?: string[];
  /** Simple stat thresholds, all must hold. Stat names: morale | safety | credibility | listeners | chits | trust.netters | trust.chapel | trust.linemen */
  when?: { stat: StatName; min?: number; max?: number }[];
  /**
   * For switchboard lines and desk cards: evaluated against the card ids aired so far tonight
   * when the board rings or the desk opens. At prep nothing has aired yet.
   */
  tonight?: { aired?: string[]; notAired?: string[] };
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
  /** Who or where the story came from, shown at prep instead of whether it's true. */
  source: string;
  /** An alternate script that reads the story as unconfirmed: half the effects, a harder reach, no unravel. */
  hedge?: string;
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
  person: PersonId;
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

/** A call that went on air. `dumpedAt` is how many characters had been said when it was dumped. */
export interface CallRecord {
  line: string;
  dumpedAt?: number;
}

export type CallResult = 'aired' | 'caught' | 'late' | 'cut' | 'notTaken';

/**
 * When an event happens: before item `slot` begins (`frac` 0 or absent), or once `frac`
 * (0..1) of item `slot` has played. See src/sim/events.ts for the exact rules.
 */
export interface EventTrigger {
  slot: number;
  /** 0..1 into the item; 0 = before the item starts (today's behavior). */
  frac?: number;
}

/** Lines ring at once; the player picks who goes on air. During a record, the record plays under the call. */
export interface SwitchboardEvent {
  kind: 'switchboard';
  id: string;
  at: EventTrigger;
  lines: CallLine[];
}

/** A transmitter tube blows. */
export interface TubeEvent {
  kind: 'tube';
  id: string;
  at: EventTrigger;
  /** Which socket (0..4, V1..V5). */
  socket: number;
}

/** A faint signal keyed under the static, to be copied before it fades. */
export interface MorseEvent {
  kind: 'morse';
  id: string;
  at: EventTrigger;
  word: string;
  /** How long it keys before fading out. */
  seconds: number;
  /** Who is keying, if the station could know (src/data/people.ts). */
  sender?: PersonId;
  decoded: Outcome;
  missed: Outcome;
}

/** A squall off the lake. The transmitter only drifts while one is blowing. */
export interface StormEvent {
  kind: 'storm';
  id: string;
  /** Slots the storm covers (0-based). */
  slots: number[];
  /** Dawn report when the signal held through it, or didn't. */
  held: { line: string; effects: Effects };
  lost: { line: string; effects: Effects };
}

/** Something that happens to the show. A night can have any number of each. */
export type NightEvent = SwitchboardEvent | TubeEvent | MorseEvent | StormEvent;

export interface NightDef {
  id: string;
  number: number;
  cards: Card[];
  /** The booth tasks, in the order they're listed for the dawn report within each kind. */
  events: NightEvent[];
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
  /** Small ads in the morning paper: what the station's chits can buy at dawn. */
  classifieds?: Classified[];
}

/** A small ad on the dawn NOTICES page: chits for a spare tube or a record. */
export interface Classified {
  id: string;
  text: string;
  cost: number;
  /** A spare for the drawer, or a record (sets flag `owns_<recordId>`; later crates gate on it). */
  gives: { spare?: TubeType; record?: string };
  /** Checked against the town after the night. */
  gate?: Gate;
}

export interface TownState {
  morale: number;
  safety: number;
  credibility: number;
  listeners: number;
  chits: number;
  trust: Record<FactionId, number>;
  flags: string[];
  /** What the station has done to each caller, across the run. The resolver also sets flags from these. */
  people: Partial<Record<PersonId, PersonRecord>>;
  /** The spares drawer: tubes on hand by type, carried from night to night. */
  spares: Record<TubeType, number>;
}

/** Counts of how a person's calls went: put on and heard, cut off, dumped, left ringing. */
export interface PersonRecord {
  aired: number;
  cut: number;
  dumped: number;
  ignored: number;
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
  /**
   * Per tube event that blew: seconds the program was down, the spare seated from the drawer
   * (the resolver takes it out of the drawer), and whether it was the wrong type (bodged).
   * Events not listed never blew.
   */
  tubes?: { id: string; seconds: number; used?: TubeType; bodged?: boolean }[];
  /** Per Morse event that keyed: whether it was copied. Events not listed never keyed. */
  morse?: { id: string; result: 'decoded' | 'missed' }[];
  /** Card ids read with their hedged script. */
  hedged?: string[];
  /** Live swaps off the desk, in order: at `slot`, card `in` went on instead of `out`. */
  swaps?: { slot: number; out: string; in: string }[];
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
