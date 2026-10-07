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

/** `rumor`: what people are saying that may be wrong (dim ink at dawn). */
export type Tone = 'good' | 'bad' | 'neutral' | 'eerie' | 'rumor';

export interface DawnLine {
  text: string;
  tone: Tone;
  /** Which sequence rule produced this line, if any. */
  rule?: 'breather' | 'panic' | 'adFatigue' | 'dedication' | 'needles' | 'tube' | 'swap';
}

/** What happens when a reach check resolves. `effects` are applied unscaled. An empty `line` adds nothing to the dawn. */
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
   * when the board rings or the desk opens (at prep nothing has aired yet), and `flags`, the
   * confidences heard off air tonight (`t_<confide flag>`; all must have been heard).
   */
  tonight?: { aired?: string[]; notAired?: string[]; flags?: string[] };
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
  /** Cards sharing a group are alternatives: only one of them can air in a show. */
  group?: string;
  /** The show ends when this card finishes: it is the sign-off, and the slots after it go unaired. */
  endsShow?: boolean;
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
  /** A red lamp on the board row (not in the preview). */
  urgent?: boolean;
  /** Seconds this line rings before giving up (default RING_SECONDS in calls.ts). Paused while you listen to it. */
  patience?: number;
  /**
   * Said off air after the preview, only if you keep listening: something they won't say on
   * air. Hearing it marks `t_<flag>` for tonight's gates, and the town remembers `flag`.
   */
  confide?: { text: string; flag: string };
  /** The caller asks for a record. If the call airs: `played` when it airs later tonight, else `missed`. */
  request?: { recordId: string; played: Outcome; missed: Outcome };
  /** What the DJ says on air right after the call, when it ends without a dump. */
  after?: string;
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
  /** Only happens when the town's flags and stats allow it (checked when the night opens). */
  gate?: Gate;
  at: EventTrigger;
  lines: CallLine[];
}

/** A transmitter tube blows. */
export interface TubeEvent {
  kind: 'tube';
  id: string;
  gate?: Gate;
  at: EventTrigger;
  /** Which socket (0..4, V1..V5). */
  socket: number;
}

/** A faint signal keyed under the static, to be copied before it fades. */
export interface MorseEvent {
  kind: 'morse';
  id: string;
  gate?: Gate;
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
  gate?: Gate;
  /** Slots the storm covers (0-based). */
  slots: number[];
  /** How hard it blows: a multiple of STORM_WIND (default 1). */
  wind?: number;
  /** Dawn report when the signal held through it, or didn't. */
  held: { line: string; effects: Effects };
  lost: { line: string; effects: Effects };
}

/** Something that happens to the show. A night can have any number of each. */
export type NightEvent = SwitchboardEvent | TubeEvent | MorseEvent | StormEvent;

/**
 * The Other Station during the show. A `carrier` sits on the dial during its slots; an
 * `override` takes the frequency for `seconds` from `at`; a `climax` is the last night's: it
 * takes the frequency for `seconds` (no shorter for holding) and the player holds the dial
 * (jam it), lets it through, or talks over it with `counter` (with no `card`, it reads the
 * first unaired preferred card).
 * Ids share the night's event id space. A `gate` is checked when the night opens.
 * See src/sim/intrusion.ts.
 */
export type Intrusion =
  | { kind: 'carrier'; id: string; gate?: Gate; slots: number[] } // a second carrier on the dial during these slots
  | { kind: 'override'; id: string; gate?: Gate; at: EventTrigger; seconds: number; card?: string } // it takes the frequency for a while
  | { kind: 'climax'; id: string; gate?: Gate; at: EventTrigger; seconds: number; card?: string; counter: string }; // the last night's: hold, carry or counter

/** A line the dawn adds after everything else, when its gate is open against the town after the night. */
export interface DawnLineDef {
  gate: Gate;
  line: string;
  tone: Tone;
  effects?: Effects;
  /** Set when the line is added (later dawn lines, and later nights, can gate on it). */
  flag?: string;
}

/** A letter on the ledger's last page. `{quote}` is what the Other Station said. */
export interface Letter {
  body: string;
  from: string;
}

/** The morning paper's headline. */
export interface Headline {
  text: string;
  sub: string;
}

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
    /** During the show, not after it. */
    intrusions?: Intrusion[];
    /** It also reads back, finished, every sentence you dumped tonight (before the card). */
    readsDumped?: boolean;
    /** It reads the unaired cards of this group (the answers you didn't give), before the preferred card. */
    readsGroup?: string;
    /** If the show ended early, it fills the silence: up to three unaired preferred cards. */
    fillsSilence?: boolean;
    /** It reads every unaired preferred card (up to four). */
    readsAll?: boolean;
  };
  /** The listener's letter on the ledger's last page. `{quote}` is what the Other Station said. */
  letter: Letter;
  /** Letters that replace `letter` when their gate is open after the night (the first open one wins). */
  letters?: (Letter & { gate: Gate })[];
  /** The morning paper's headline: the first whose gate is open after the night. */
  headlines?: (Headline & { gate: Gate })[];
  /** Lines added at dawn, in order, after everything else, gated on the town after the night. */
  dawnLines?: DawnLineDef[];
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

/**
 * How the climax went: the dial held through at least CLIMAX_HOLD of it (jammed), held some
 * and let go (failed: it got through), left alone (carried), or talked over (countered).
 */
export type ClimaxResult = 'jammed' | 'carried' | 'countered' | 'failed';

/** What the live show produced. Signal is 0..1 per slot (1 = perfectly tuned). */
export interface ShowPerformance {
  rundown: string[];
  signal: number[];
  /** Signal per slot before the climax jam (what the dial and the tubes did). Storms read this. */
  tuned?: number[];
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
  /** Per slot: average bleed of the second carrier through yours, 0..1 (0 where there was none). */
  bleed?: number[];
  /** Per override that ran: the card it read (null: drone only), its seconds after the hold, and the fraction held. */
  overrides?: { id: string; card: string | null; seconds: number; held: number }[];
  /**
   * The climax, if it ran: what the player did, the fraction of it the dial was held, the
   * card it read (null: drone only), and the counter card the DJ read over it (countered).
   */
  climax?: { id: string; result: ClimaxResult; held: number; card: string | null; counter?: string };
  /** Confidences heard off air tonight, as `t_<flag>` (the scene's confidedTonight). */
  confided?: string[];
  /** Card ids read with their hedged script. */
  hedged?: string[];
  /** Live swaps off the desk, in order: at `slot`, card `in` went on instead of `out`. */
  swaps?: { slot: number; out: string; in: string }[];
  /**
   * A card that ends the show aired: `rundown` is what aired (it ends with that card) and
   * may be shorter than the show. The slots after it went unaired, by choice.
   */
  endedEarly?: boolean;
}

export interface NightResult {
  before: TownState;
  after: TownState;
  lines: DawnLine[];
  /** Cards the town heard read on 1260 during the show though the station never aired them. */
  otherAired: string[];
  otherStation: {
    cardId: string | null;
    script: string;
    /** The sentence of every dumped call, in call order (read back when the night `readsDumped`). */
    dumped: { person: PersonId; text: string }[];
    /** Every card it read after sign-off, in order (`cardId` is the first, or null). */
    cards: string[];
  };
  /** The letter on the ledger's last page. */
  letter: Letter;
  /** The morning paper's headline, if the night has one open. */
  headline?: Headline;
}

/** Display names (placeholders, see DESIGN.md). */
export const FACTION_NAMES: Record<FactionId, string> = {
  netters: 'Netters',
  chapel: 'Chapel',
  linemen: 'Linemen',
};
