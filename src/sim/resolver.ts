// The broadcast resolver: turns a night's rundown and live performance into
// the town's new state and the dawn report. Rules are described in DESIGN.md.

import {
  FACTIONS,
  FACTION_NAMES,
  SHOW_SLOTS,
  SLOTS_PER_SEGMENT,
  SEGMENTS,
  type CallResult,
  type Card,
  type DawnLine,
  type Effects,
  type FactionId,
  type Intrusion,
  type NightDef,
  type NightResult,
  type Outcome,
  type PersonRecord,
  type ReachCheck,
  type SegmentId,
  type ShowPerformance,
  type TownState,
} from './types';
import { STORM_HELD, STORM_LOST, stormSignal } from './storm';
import { TUBE, TUBE_TYPES, fullDrawer, type TubeType } from './tube';
import { callResult, dumpedSentence, isReachCheck, requestResult } from './calls';
import { airedWhenBoardOpens, eventsOf } from './events';
import { gateOpen, linesOpenNow } from './nights';
import { HARD_HOLD, OTHER_HEARD, clockText, intrusionsOf } from './intrusion';
import type { PersonId } from '../data/people';

/** Who listens when. `total` scales town-wide effects; `share` scales each faction's. */
export const AUDIENCE: Record<SegmentId, { total: number; share: Record<FactionId, number> }> = {
  dusk: { total: 1.0, share: { netters: 0.6, chapel: 0.8, linemen: 0.4 } },
  late: { total: 0.7, share: { netters: 0.2, chapel: 0.3, linemen: 0.9 } },
  small: { total: 0.5, share: { netters: 0.9, chapel: 0.1, linemen: 0.3 } },
};

export const RULES = {
  recordLoveTrust: 4,
  recordDislikeTrust: -3,
  moodMorale: { bright: 3, blue: 1, stirring: 2 },
  panicMorale: -4,
  adFatigueListeners: -15,
  dedicationTrust: 5,
  deadAirListenersPerSec: -2,
  deadAirCredibilityPerSec: -0.5,
  /** Listeners gained or lost from overall signal quality: (avg - pivot) × scale. */
  signalListenerPivot: 0.7,
  signalListenerScale: 60,
  /** A needle skating across a record on air. */
  needleScratch: { listeners: -4, credibility: -1 },
  /** A needle dropped into the song, intro gone. */
  needleLate: { listeners: -1 },
  /** A blown tube swapped fast, or slow. */
  tubeQuick: { credibility: 2 },
  tubeSlow: { listeners: -6, credibility: -2 },
  /** A blown tube with no spare of its type: the rest of the night at bodged strength. */
  tubeBodged: { listeners: -8 },
  /** A hedged read needs this much more audience to land. */
  hedgeThreshold: 1.25,
} as const;

const SCRATCH_LINES = [
  (t: string) => `The needle skated across "${t}" on the air. Old Kowalczyk swears his dog hasn't stopped howling.`,
  (t: string) => `That scratch at the top of "${t}" went out to the whole town. Somebody on Dock Street dropped a teacup.`,
];

const BREATHER_LINES = [
  (t: string) => `You followed "${t}" with music. People took the news, and then they breathed.`,
  (t: string) => `After "${t}" you let a record play. Somebody on Dock Street said it was the kindest thing they'd heard all week.`,
  (t: string) => `"${t}" was hard to hear. The song after it made it easier to sleep.`,
];

const DEDICATION_LINES = [
  (rec: string, item: string, f: string) => `"${rec}" right after "${item}". The ${f} took it as a dedication.`,
  (rec: string, item: string, f: string) => `The ${f} noticed you played "${rec}" for them after "${item}". They won't say so. They noticed.`,
  (rec: string, _item: string, f: string) => `Somebody heard "${rec}" and said, "That one's for us." The ${f} are telling it that way, anyhow.`,
];

export const STARTING_STATE: TownState = {
  morale: 50,
  safety: 50,
  credibility: 50,
  listeners: 140,
  chits: 10,
  trust: { netters: 50, chapel: 50, linemen: 50 },
  flags: [],
  people: {},
  spares: fullDrawer(),
};

export function segmentOfSlot(slot: number): SegmentId {
  return SEGMENTS[Math.min(SEGMENTS.length - 1, Math.floor(slot / SLOTS_PER_SEGMENT))];
}

export function cloneState(s: TownState): TownState {
  const people: TownState['people'] = {};
  for (const [id, rec] of Object.entries(s.people ?? {})) if (rec) people[id as PersonId] = { ...rec };
  return { ...s, trust: { ...s.trust }, flags: [...s.flags], people, spares: { ...fullDrawer(), ...s.spares } };
}

/** Which of a person's counters a call result adds to. A late dump went out and was dumped. */
const PERSON_COUNTS: Record<CallResult, (keyof PersonRecord)[]> = {
  aired: ['aired'],
  late: ['aired', 'dumped'],
  caught: ['dumped'],
  cut: ['cut'],
  notTaken: ['ignored'],
};

/**
 * Remember what the station did to a caller: bump their counters and set flags
 * `<person>_<counter>`, plus `<person>_<counter>_2` once it has happened twice.
 */
export function notePerson(state: TownState, person: PersonId, result: CallResult): void {
  const rec = (state.people[person] ??= { aired: 0, cut: 0, dumped: 0, ignored: 0 });
  for (const k of PERSON_COUNTS[result]) rec[k] += 1;
  for (const k of ['aired', 'cut', 'dumped', 'ignored'] as const) {
    if (rec[k] >= 1) addFlag(state, `${person}_${k}`);
    if (rec[k] >= 2) addFlag(state, `${person}_${k}_2`);
  }
}

function addFlag(state: TownState, flag: string): void {
  if (!state.flags.includes(flag)) state.flags.push(flag);
}

function isTalk(card: Card): card is Exclude<Card, { kind: 'record' }> {
  return card.kind !== 'record';
}

/** Add effects, multiplying audience-dependent parts by the given factors. */
export function applyEffects(
  state: TownState,
  fx: Effects,
  scale: { town: number; faction: Record<FactionId, number> } = {
    town: 1,
    faction: { netters: 1, chapel: 1, linemen: 1 },
  },
): void {
  state.morale += (fx.morale ?? 0) * scale.town;
  state.safety += (fx.safety ?? 0) * scale.town;
  state.listeners += (fx.listeners ?? 0) * scale.town;
  state.credibility += fx.credibility ?? 0;
  state.chits += fx.chits ?? 0;
  for (const f of FACTIONS) state.trust[f] += (fx.trust?.[f] ?? 0) * scale.faction[f];
}

function clampState(s: TownState): void {
  const c = (v: number) => Math.round(Math.max(0, Math.min(100, v)));
  s.morale = c(s.morale);
  s.safety = c(s.safety);
  s.credibility = c(s.credibility);
  s.listeners = Math.max(0, Math.round(s.listeners));
  s.chits = Math.max(0, Math.round(s.chits));
  for (const f of FACTIONS) s.trust[f] = c(s.trust[f]);
}

/**
 * How big tonight's audience is next to a normal one: listeners / 140, kept between half
 * and one and a half. Computed once from the town as the night starts.
 */
export function audienceFactor(listeners: number): number {
  return Math.max(0.5, Math.min(1.5, listeners / STARTING_STATE.listeners));
}

/**
 * A reach threshold shifted by how much the faction trusts the station:
 * threshold × (1.3 − 0.6 × trust / 100). Trust 50 changes nothing, trust 100 asks for
 * 30% less (they act on a whisper), trust 0 asks for 30% more.
 */
export function effectiveThreshold(threshold: number, trust: number): number {
  return threshold * (1.3 - (0.6 * trust) / 100);
}

function audienceScale(segment: SegmentId, signal: number, factor = 1) {
  const a = AUDIENCE[segment];
  return {
    town: a.total * signal * factor,
    faction: {
      netters: a.share.netters * signal * factor,
      chapel: a.share.chapel * signal * factor,
      linemen: a.share.linemen * signal * factor,
    },
  };
}

/**
 * Does this check pass for an item aired in `segment` at `signal`? `factor` is the night's
 * audienceFactor and `trust` the faction's trust; both default to a neutral town.
 */
export function reachPasses(check: ReachCheck, segment: SegmentId, signal: number, factor = 1, trust = 50): boolean {
  return AUDIENCE[segment].share[check.faction] * signal * factor >= effectiveThreshold(check.threshold, trust) - 1e-9;
}

/** A plain-language read on how hard a warning is to land, for the prep screen. */
export function reachHint(check: ReachCheck, town: TownState): string {
  const need = effectiveThreshold(check.threshold, town.trust[check.faction]) / audienceFactor(town.listeners);
  if (need <= 0.45) return "they'll act on a whisper";
  if (need <= 0.7) return "they'll need a clear signal";
  return "they'll need the whole town listening";
}

/** A hedged read's effects: every number halved, rounding toward zero, trust included. */
export function hedgeEffects(fx: Effects): Effects {
  const half = (v: number) => Math.trunc(v / 2) || 0; // no -0
  const out: Effects = {};
  for (const k of ['morale', 'safety', 'listeners', 'credibility', 'chits'] as const) {
    const v = fx[k];
    if (v !== undefined) out[k] = half(v);
  }
  if (fx.trust) {
    const trust: Partial<Record<FactionId, number>> = {};
    for (const f of FACTIONS) {
      const v = fx.trust[f];
      if (v !== undefined) trust[f] = half(v);
    }
    out.trust = trust;
  }
  return out;
}

/** The show clock when item `slot` begins: 8 PM, then 70 minutes a slot. */
export function slotClock(slot: number): string {
  const mins = 20 * 60 + slot * 70;
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** "a 5U4", "an 807". */
function withArticle(t: TubeType): string {
  return `${t.startsWith('8') ? 'an' : 'a'} ${t}`;
}

/** A dawn line, unless it has no words (an outcome can be silent and still count). */
function pushLine(lines: DawnLine[], text: string, tone: DawnLine['tone']): void {
  if (text) lines.push({ text, tone });
}

function applyOutcome(state: TownState, o: Outcome, lines: DawnLine[]): void {
  applyEffects(state, o.effects);
  addFlag(state, o.flag);
  pushLine(lines, o.line, o.tone);
}

/**
 * Whether a running order can air: six known cards, each once, one per group. A show that
 * `endedEarly` is what aired before a card that ends the show: one to six items, ending on it.
 */
export function validateRundown(night: NightDef, rundown: string[], endedEarly = false): string | null {
  const sized = endedEarly ? rundown.length >= 1 && rundown.length <= SHOW_SLOTS : rundown.length === SHOW_SLOTS;
  if (!sized) return `The show needs ${SHOW_SLOTS} items.`;
  const byId = new Map(night.cards.map((c) => [c.id, c] as const));
  for (const id of rundown) if (!byId.has(id)) return `Unknown card: ${id}`;
  if (new Set(rundown).size !== rundown.length) return 'A card can only air once.';
  const groups = rundown.flatMap((id) => {
    const c = byId.get(id)!;
    return isTalk(c) && c.group ? [c.group] : [];
  });
  if (new Set(groups).size !== groups.length) return 'Only one of those can air.';
  if (endedEarly) {
    const last = byId.get(rundown[rundown.length - 1])!;
    if (!isTalk(last) || !last.endsShow) return 'A show that ended early ends on the card that ends the show.';
  }
  return null;
}

/** Most cards the Other Station reads after sign-off: three filling a silence, four when it reads all (else one). */
export const OTHER_READS = { fillsSilence: 3, readsAll: 4 } as const;

/**
 * Every card the Other Station reads after sign-off, in order: the unaired cards of its
 * group (`readsGroup`), then the preferred cards left out of the show (the first one; up
 * to three when it `fillsSilence` and the show ended early; up to four when it `readsAll`),
 * or, with none of those left, any talk card left out. Empty when nothing was left unsaid.
 */
export function otherStationReads(night: NightDef, rundown: readonly string[], endedEarly = false): string[] {
  const aired = new Set(rundown);
  const os = night.otherStation;
  const byId = new Map(night.cards.map((c) => [c.id, c] as const));
  const out: string[] = [];
  if (os.readsGroup) for (const c of night.cards) if (isTalk(c) && c.group === os.readsGroup && !aired.has(c.id)) out.push(c.id);
  const left = (id: string) => !aired.has(id) && !out.includes(id);
  const preferred = os.prefer.filter((id) => {
    const c = byId.get(id);
    return left(id) && !!c && isTalk(c);
  });
  const many = os.readsAll ? OTHER_READS.readsAll : os.fillsSilence && endedEarly ? OTHER_READS.fillsSilence : 1;
  if (preferred.length) out.push(...preferred.slice(0, many));
  else {
    const anyTalk = night.cards.find((c) => isTalk(c) && left(c.id));
    if (anyTalk) out.push(anyTalk.id);
  }
  return out;
}

/** The card the Other Station reads back first (the letter quotes it): see `otherStationReads`. */
export function pickOtherStationCard(night: NightDef, rundown: readonly string[], endedEarly = false): string | null {
  return otherStationReads(night, rundown, endedEarly)[0] ?? null;
}

/**
 * Whether a board rang in a show that ended early after `aired` items: due before the last
 * item began, or during an earlier one. One due during the last item (talk) would have
 * waited for it to end, and the show ended instead.
 */
function rangBeforeTheEnd(at: { slot: number; frac?: number }, aired: number): boolean {
  return at.slot < aired - 1 || (at.slot === aired - 1 && !((at.frac ?? 0) > 0));
}

/** Something the Other Station read on 1260 while the show was on. */
export interface LiveRead {
  id: string;
  kind: Intrusion['kind'];
  /** The card it read (one of tonight's talk cards), or null for the drone alone. */
  card: string | null;
  /** The slot whose audience heard it. */
  slot: number;
  /** How much of the town it reached, 0..1: a carrier's average bleed, an override's 1. */
  signal: number;
  /** Overrides: when it came, how long it was meant to run, how long it ran, how much of it the dial was held. */
  override?: { frac: number; planned: number; seconds: number; held: number };
}

/**
 * What the Other Station read during the show, in the night's order. A carrier counts
 * when its average bleed reached OTHER_HEARD, and reads what the sign-off would; an
 * override (or climax) that ran reads the card the scene says it read.
 */
export function otherStationLive(night: NightDef, perf: ShowPerformance): LiveRead[] {
  const talk = new Set(night.cards.filter(isTalk).map((c) => c.id));
  const out: LiveRead[] = [];
  for (const i of intrusionsOf(night)) {
    if (i.kind === 'carrier') {
      if (!i.slots.length) continue;
      const avg = i.slots.reduce((s, slot) => s + Math.max(0, Math.min(1, perf.bleed?.[slot] ?? 0)), 0) / i.slots.length;
      if (avg >= OTHER_HEARD) out.push({ id: i.id, kind: i.kind, card: pickOtherStationCard(night, perf.rundown), slot: i.slots[0], signal: avg });
      continue;
    }
    const ran = perf.overrides?.find((o) => o.id === i.id);
    if (!ran) continue;
    out.push({
      id: i.id, kind: i.kind, card: ran.card && talk.has(ran.card) ? ran.card : null, slot: i.at.slot, signal: 1,
      override: { frac: i.at.frac ?? 0, planned: i.seconds, seconds: ran.seconds, held: ran.held },
    });
  }
  return out;
}

export function resolveNight(night: NightDef, start: TownState, perf: ShowPerformance): NightResult {
  const endedEarly = !!perf.endedEarly;
  const problem = validateRundown(night, perf.rundown, endedEarly);
  if (problem) throw new Error(problem);

  const byId = new Map(night.cards.map((c) => [c.id, c] as const));
  const state = cloneState(start);
  const factor = audienceFactor(start.listeners);
  const reaches = (check: ReachCheck, segment: SegmentId, signal: number) =>
    reachPasses(check, segment, signal, factor, start.trust[check.faction]);
  // Hedged reads: only news with a hedged script can be read that way.
  const hedged = new Set((perf.hedged ?? []).filter((id) => {
    const c = byId.get(id);
    return c?.kind === 'news' && !!c.hedge;
  }));
  const lines: DawnLine[] = [];
  const show = perf.rundown.map((id) => byId.get(id)!);
  const signalAt = (i: number) => Math.max(0, Math.min(1, perf.signal[i] ?? 1));

  show.forEach((card, i) => {
    const segment = segmentOfSlot(i);
    const signal = signalAt(i);
    const scale = audienceScale(segment, signal, factor);
    const next = show[i + 1];

    if (card.kind === 'record') {
      const trust: Partial<Record<FactionId, number>> = {};
      for (const f of card.loves) trust[f] = RULES.recordLoveTrust;
      for (const f of card.dislikes ?? []) trust[f] = (trust[f] ?? 0) + RULES.recordDislikeTrust;
      applyEffects(state, { morale: RULES.moodMorale[card.mood], trust }, scale);
      return;
    }

    // Talk cards. A hedged read takes half the effect.
    const isHedged = hedged.has(card.id);
    let fx: Effects = isHedged ? hedgeEffects(card.effects) : card.effects;
    if (card.grim && next?.kind === 'record') {
      // Breather: a record right after hard news lets people take it in.
      fx = { ...fx, morale: Math.max(0, fx.morale ?? 0) };
      lines.push({ text: BREATHER_LINES[i % BREATHER_LINES.length](card.title), tone: 'good', rule: 'breather' });
    } else if (card.grim && next && isTalk(next) && next.grim) {
      applyEffects(state, { morale: RULES.panicMorale }, scale);
      lines.push({ text: `"${card.title}" and then "${next.title}", back to back. Some folks sat up all night with the lamps lit.`, tone: 'bad', rule: 'panic' });
    }
    applyEffects(state, fx, scale);

    if (card.kind === 'ad' && next?.kind === 'ad') {
      applyEffects(state, { listeners: RULES.adFatigueListeners }, scale);
      lines.push({ text: 'Two ads in a row. Somewhere, a radio clicked off.', tone: 'bad', rule: 'adFatigue' });
    }

    if (card.helps && next?.kind === 'record' && next.loves.includes(card.helps)) {
      applyEffects(state, { trust: { [card.helps]: RULES.dedicationTrust } }, scale);
      lines.push({ text: DEDICATION_LINES[i % DEDICATION_LINES.length](next.title, card.title, FACTION_NAMES[card.helps]), tone: 'good', rule: 'dedication' });
    }

    if (card.reach) {
      const check = isHedged ? { ...card.reach, threshold: card.reach.threshold * RULES.hedgeThreshold } : card.reach;
      const passed = reaches(check, segment, signal);
      applyOutcome(state, passed ? card.reach.success : card.reach.fail, lines);
    }
  });

  // Every card that went out, and how: later nights (and tonight's dawn lines) gate on these.
  for (const card of show) {
    addFlag(state, `aired_${card.id}`);
    if (hedged.has(card.id)) addFlag(state, `hedged_${card.id}`);
  }

  // What the Other Station read during the show (applied below). The town heard those.
  const live = otherStationLive(night, perf);
  const otherAired = [...new Set(live.flatMap((r) => (r.card ? [r.card] : [])))];

  // Cards with a reach check that never aired.
  const aired = new Set(perf.rundown);
  for (const card of night.cards) {
    if (!aired.has(card.id) && !otherAired.includes(card.id) && isTalk(card) && card.reach) {
      applyOutcome(state, card.reach.unaired ?? card.reach.fail, lines);
    }
  }

  // The running order torn up live. The paper notices the first time.
  const swap = perf.swaps?.[0];
  if (swap) {
    const title = (id: string) => byId.get(id)?.title ?? id;
    lines.push({
      text: `You tore up the running order at ${slotClock(swap.slot)} and put "${title(swap.in)}" on instead of "${title(swap.out)}". The paper noticed.`,
      tone: 'neutral',
      rule: 'swap',
    });
  }

  // The switchboards. Only lines that rang count: tonight-gated ones are checked against
  // what had aired by the time their board opened, and the confidences heard tonight.
  const confided = perf.confided ?? [];
  for (const board of eventsOf(night, 'switchboard')) {
    const slot = board.at.slot;
    // After a show that ended early, the boards due later never rang.
    if (endedEarly && !rangBeforeTheEnd(board.at, show.length)) continue;
    for (const line of linesOpenNow(board, start, airedWhenBoardOpens(board, perf.rundown), confided)) {
      const result = callResult(line, perf.calls.find((c) => c.line === line.id));
      let outcome: Outcome | undefined;
      if (result === 'aired' || result === 'late') {
        outcome = isReachCheck(line.aired)
          ? reaches(line.aired, segmentOfSlot(slot), signalAt(slot)) ? line.aired.success : line.aired.fail
          : line.aired;
      } else if (result === 'caught') outcome = line.turn?.caught;
      else if (result === 'cut') outcome = line.cut ?? line.notTaken;
      else outcome = line.notTaken;
      if (outcome) applyOutcome(state, outcome, lines);
      // A record asked for on the air: did it come on later tonight?
      if (result === 'aired' || result === 'late') {
        const req = requestResult(board, line, perf.rundown, night.cards);
        if (req) applyOutcome(state, req, lines);
      }
      notePerson(state, line.person, result);
      // What they told you off air, the station remembers.
      if (line.confide && confided.includes(`t_${line.confide.flag}`)) addFlag(state, line.confide.flag);
    }
  }

  // What was dumped, in the order it was dumped: the Other Station may read it back.
  const callers = new Map(eventsOf(night, 'switchboard').flatMap((b) => b.lines.map((l) => [l.id, l] as const)));
  const dumped = perf.calls.flatMap((c) => {
    const line = callers.get(c.line);
    return line && c.dumpedAt !== undefined ? [{ person: line.person, text: dumpedSentence(line, c.dumpedAt) }] : [];
  });

  // The needle.
  if (perf.needles) {
    const drops = show.map((card, i) => (card.kind === 'record' ? perf.needles?.[i] ?? null : null));
    const scratched = show.filter((_c, i) => drops[i] === 'scratch');
    for (const d of drops) {
      if (d === 'scratch') applyEffects(state, RULES.needleScratch);
      else if (d === 'late') applyEffects(state, RULES.needleLate);
    }
    const records = drops.filter((d) => d !== null);
    if (scratched.length) {
      const text = scratched.length > 1
        ? `The needle scratched ${scratched.length} records on the air tonight. People are asking if the DJ's hands are all right.`
        : SCRATCH_LINES[show.indexOf(scratched[0]) % SCRATCH_LINES.length](scratched[0].title);
      lines.push({ text, tone: 'bad', rule: 'needles' });
    } else if (records.length >= 2 && records.every((d) => d === 'clean')) {
      lines.push({ text: "Every record went down clean tonight. Somebody's grandmother says you've got gentle hands.", tone: 'good', rule: 'needles' });
    }
  }

  // Blown tubes. The lost signal already cost listeners; this is what people say about it.
  // A seated spare leaves the drawer; a bodge is its own story.
  for (const tube of eventsOf(night, 'tube')) {
    const blew = perf.tubes?.find((t) => t.id === tube.id);
    if (!blew) continue;
    const { seconds, used, bodged } = blew;
    if (used && TUBE_TYPES.includes(used)) state.spares[used] = Math.max(0, (state.spares[used] ?? 0) - 1);
    const secs = Math.round(seconds);
    const during = show[tube.at.slot]?.title ?? 'the show';
    const need = TUBE_TYPES[tube.socket];
    if (bodged) {
      applyEffects(state, RULES.tubeBodged);
      const text = used
        ? `The ${need} went and there wasn't another in the drawer. You ran the rest of the night on ${withArticle(used)} and a prayer. Past the breakwater they heard about half of it.`
        : `The ${need} went and the drawer was empty. You ran the rest of the night on a jumper wire and a prayer. Past the breakwater they heard about half of it.`;
      lines.push({ text, tone: 'bad', rule: 'tube' });
    } else if (seconds <= TUBE.quickSeconds) {
      applyEffects(state, RULES.tubeQuick);
      lines.push({ text: `A tube blew in the middle of "${during}". You had a spare seated before most people noticed.`, tone: 'good', rule: 'tube' });
    } else if (seconds >= TUBE.slowSeconds) {
      applyEffects(state, RULES.tubeSlow);
      lines.push({ text: `The Lamp went quiet for ${secs} seconds in the middle of "${during}". A blown tube, they say. Some folks thought that was the end of the station.`, tone: 'bad', rule: 'tube' });
    } else {
      lines.push({ text: `A tube blew during "${during}" and the Lamp sputtered for ${secs} seconds. Most people just thumped their radios.`, tone: 'neutral', rule: 'tube' });
    }
  }

  // Signals under the static.
  for (const morse of eventsOf(night, 'morse')) {
    const result = perf.morse?.find((m) => m.id === morse.id)?.result;
    if (result) applyOutcome(state, result === 'decoded' ? morse.decoded : morse.missed, lines);
  }

  // Dead air and signal quality.
  const dead = Math.max(0, perf.deadAirSeconds);
  if (dead > 0) {
    applyEffects(state, {
      listeners: dead * RULES.deadAirListenersPerSec,
      credibility: dead * RULES.deadAirCredibilityPerSec,
    });
    if (dead >= 3) lines.push({ text: `${Math.round(dead)} seconds of dead air. People shook their radios.`, tone: 'bad' });
  }
  const avgSignal = show.reduce((sum, _c, i) => sum + signalAt(i), 0) / show.length;
  applyEffects(state, { listeners: (avgSignal - RULES.signalListenerPivot) * RULES.signalListenerScale });
  // Storms over the slots that aired (a show that ended early was dark for the rest).
  const storms = eventsOf(night, 'storm')
    .map((s) => (endedEarly ? { ...s, slots: s.slots.filter((slot) => slot < show.length) } : s))
    .filter((s) => s.slots.length);
  for (const storm of storms) {
    const held = stormSignal(storm, show.map((_c, i) => signalAt(i)));
    const report = held >= STORM_HELD ? storm.held : held < STORM_LOST ? storm.lost : null;
    if (report) {
      applyEffects(state, report.effects);
      pushLine(lines, report.line, report === storm.held ? 'good' : 'bad');
    }
  }
  if (avgSignal < 0.6) lines.push({ text: 'Half the town heard more static than show.', tone: 'bad' });
  else if (avgSignal > 0.9 && !storms.length) lines.push({ text: 'Clear signal all night. They heard you all the way up in the Chapel bell tower.', tone: 'good' });

  // Lies come apart at dawn, unless the station said it couldn't vouch for them.
  for (const card of show) {
    if (card.kind === 'news' && card.truth === 'false' && card.unravel && !hedged.has(card.id)) {
      applyEffects(state, { credibility: card.unravel.credibility });
      pushLine(lines, card.unravel.line, 'bad');
    }
  }

  // The Other Station, live: what it read, the town took as yours (nobody paid for it).
  // These lines lead the ledger: it's what the town is talking about.
  const liveLines: DawnLine[] = [];
  const readLive = new Set<string>();
  for (const r of live) {
    if (r.kind === 'carrier') addFlag(state, 'other_heard');
    const card = r.card ? byId.get(r.card) : undefined;
    if (card && isTalk(card)) {
      if (r.override) {
        const on = show[r.slot];
        const what = on ? `${on.kind === 'record' ? 'playing' : 'reading'} "${on.title}"` : 'signing off';
        liveLines.push({ text: `At ${clockText(r.slot, r.override.frac)} the Lamp read "${card.title}". You were ${what} at the time.`, tone: 'eerie' });
      } else {
        liveLines.push({ text: `Half of Dock Street heard you read "${card.title}" in the storm. You didn't read it.`, tone: 'eerie' });
      }
      if (!readLive.has(card.id)) {
        readLive.add(card.id);
        const segment = segmentOfSlot(r.slot);
        const { chits: _unpaid, ...fx } = card.effects;
        applyEffects(state, fx, audienceScale(segment, r.signal, factor));
        if (card.reach && !aired.has(card.id)) applyOutcome(state, reaches(card.reach, segment, r.signal) ? card.reach.success : card.reach.fail, liveLines);
        addFlag(state, `other_aired_${card.id}`);
      }
    }
    if (r.override && r.override.held >= HARD_HOLD) {
      const early = Math.round(r.override.planned - r.override.seconds);
      if (early >= 1) liveLines.push({ text: `You leaned on the dial through it and it let go ${early} seconds early.`, tone: 'neutral' });
    }
  }
  lines.unshift(...liveLines);

  // After sign-off: what it reads, in the DJ's voice. With nothing left unsaid, only who and when.
  const os = night.otherStation;
  const reads = otherStationReads(night, perf.rundown, endedEarly);
  const reread = os.readsDumped ? dumped.map((d) => d.text) : [];
  const bodies = reads.map((id) => byId.get(id)).flatMap((c) => (c && isTalk(c) ? [c.script] : []));
  const silent = !reads.length && !reread.length;
  if (silent) addFlag(state, `${night.id}_other_silent`);
  const script = (silent ? [os.intro, os.stamp] : [os.intro, os.stamp, ...reread, ...bodies, os.outro]).filter(Boolean).join(' ');

  // The night's own dawn lines, last, in order, against the town as it now stands.
  for (const d of night.dawnLines ?? []) {
    if (!gateOpen(d.gate, state.flags, { town: state })) continue;
    if (d.effects) applyEffects(state, d.effects);
    if (d.flag) addFlag(state, d.flag);
    pushLine(lines, d.line, d.tone);
  }

  clampState(state);

  const after = { town: state };
  const letter = (night.letters ?? []).find((l) => gateOpen(l.gate, state.flags, after));
  const headline = (night.headlines ?? []).find((h) => gateOpen(h.gate, state.flags, after));

  return {
    before: cloneState(start),
    after: state,
    lines,
    otherStation: { cardId: reads[0] ?? null, script, dumped, cards: reads },
    otherAired,
    letter: letter ? { body: letter.body, from: letter.from } : { ...night.letter },
    ...(headline ? { headline: { text: headline.text, sub: headline.sub } } : {}),
  };
}
