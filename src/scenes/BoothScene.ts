import Phaser from 'phaser';
import { ART_SCALE, DEBUG, W } from '../config';
import { exposeDebug, markPhase } from '../debugHook';
import { BOOTH } from '../art/booth';
import { hex, P, UI } from '../art/palette';
import { applyScreenLook, glow, splitCameras } from './fx';
import { audio, type RecordHandle, type VoiceChannel } from '../audio/engine';
import { loopOther, pauseSpeech, prefetchVoices, speak, type Speech } from '../audio/voice';
import { pauseClock, type PauseTimer } from '../sim/pausable';
import type { PersonId } from '../data/people';
import { rng } from '../audio/pressings';
import { finishNight, markHint, run } from '../run';
import { pickOtherStationCard, resolveNight, segmentOfSlot } from '../sim/resolver';
import { JAM_SIGNAL, OTHER_OFFSET, bleed, carrierForSlot, climaxResult, intrusionsDue, overrideCard, overrideSeconds, type CarrierIntrusion, type TimedIntrusion } from '../sim/intrusion';
import { eventsDue } from '../sim/events';
import { gateOpen, linesOpenNow } from '../sim/nights';
import { deskCards, swapNext, type Swap } from '../sim/desk';
import { DeskPanel } from '../ui/DeskPanel';
import { TUNING, Tuning } from '../sim/tuning';
import { CALM_WIND, windForSlot } from '../sim/storm';
import { NEEDLE, armPosition, lateSkip, needleResult, sweepFor } from '../sim/needle';
import { NeedlePanel } from '../ui/NeedlePanel';
import { TUBE, TubeFault, type TubeType } from '../sim/tube';
import { TubePanel } from '../ui/TubePanel';
import { DUMP_DELAY_SECONDS, RING_SECONDS, patienceOf, turnIndex } from '../sim/calls';
import { MORSE_TIMING, MorseCopy, chartFor, keyState } from '../sim/morse';
import { MorsePanel } from '../ui/MorsePanel';
import { SwitchboardPanel, type LineState } from '../ui/Switchboard';
import {
  SHOW_SLOTS,
  type CallLine,
  type CallRecord,
  type Card,
  type MorseEvent,
  type NeedleResult,
  type NightEvent,
  type RecordCard,
  type ShowPerformance,
  type SwitchboardEvent,
  type TalkCard,
  type TubeEvent,
} from '../sim/types';
import { RundownBuilder, SEGMENT_LABEL } from '../ui/RundownBuilder';
import { resolveRecord } from '../data/records';

import { LiveHud, kindHeader, type DialIntrusion } from '../ui/LiveHud';
import { HINTS, HINT_ORDER, HINT_SECONDS, type HintId } from '../ui/hints';
import { PauseOverlay } from '../ui/PauseOverlay';

const S = ART_SCALE;
/** Records play up to this long, then fade (a 78 side runs about three minutes). */
const RECORD_SECONDS = DEBUG.fast ? 5 : 75;
/** How long a line rings when it has no patience of its own. */
const RING_DEFAULT = DEBUG.fast ? 2.5 : RING_SECONDS;
/** Seconds of handset quiet between a caller's preview and what they confide. */
const CONFIDE_GAP = 0.6;
/** ?auto listens to a line at least this long before putting it on. */
const AUTO_LISTEN = 1;
const CUE_WINDOW = 8;
const DEAD_AIR_GRACE = 1.2;
/** Where ?auto&drift holds the dial in a storm: toward the second carrier. */
const AUTO_DRIFT = -0.4;


type Phase = 'prep' | 'live' | 'other' | 'done';

/** A switchboard ringing now. */
interface ActiveBoard {
  event: SwitchboardEvent;
  /** The lines ringing on this board (tonight's gates applied when it opened). */
  lines: CallLine[];
  /** The item that begins when the board closes (slot - 1 is the one in progress or just ended). */
  slot: number;
  /** The slot whose signal a call on this board goes out on. */
  signal: number;
  /** Ringing over a record that keeps playing under the call. */
  during: boolean;
  states: LineState[];
  selected: number | null;
  onAir: number | null;
  /** Seconds each line keeps ringing before it gives up. The line on the handset holds while the handset is still talking. */
  left: number[];
  /** The handset has finished (preview and confide): the listened line counts down again. */
  listenOver: boolean;
  /** Lines that have begun to confide on the handset. */
  confided: boolean[];
  /** When the selected line was picked up off air. */
  listenedAt: number;
  /** The DJ is saying a call's `after` line on air; the board waits for it. */
  after: boolean;
  opened: number;
  dumpedAt: number | undefined;
  autoT: number;
}

/** Something playing that can be stopped, and when it's over. */
interface Playback {
  done: Promise<void>;
  cancel(): void;
}

export class BoothScene extends Phaser.Scene {
  private phase: Phase = 'prep';
  private builder: RundownBuilder | null = null;
  private hud: LiveHud | null = null;

  // Room pieces.
  private needles!: Phaser.GameObjects.Graphics;
  private glint!: Phaser.GameObjects.Image;
  private onAirSign!: Phaser.GameObjects.Container;
  private onAirLight!: Phaser.GameObjects.Light;
  private phoneLight!: Phaser.GameObjects.Light;
  private phoneGlow!: Phaser.GameObjects.Image;
  private ghostLight!: Phaser.GameObjects.Light;
  private lampLight!: Phaser.GameObjects.Light;
  private tubeLight!: Phaser.GameObjects.Light;
  private sweepLight!: Phaser.GameObjects.Light;
  private tubeGlows: Phaser.GameObjects.Image[] = [];
  private townGlows: Phaser.GameObjects.Image[] = [];
  private beamGfx!: Phaser.GameObjects.Graphics;
  private ghostTint!: Phaser.GameObjects.Rectangle;
  private vu = [0, 0];
  private recordAngle = 0;
  private sweepT = 0;

  // Show state.
  private cards: Card[] = [];
  private keys!: Record<'left' | 'right' | 'a' | 'd' | 'space' | 'q' | 'w' | 'e', Phaser.Input.Keyboard.Key>;
  private tuning = new Tuning(rng(1260));
  private quality = 1;
  private idx = -1; // -1 sign-on, 0..5 items, SHOW_SLOTS sign-off
  private playing = false;
  private itemStart = 0;
  private itemDuration = 1;
  private cued = false;
  private waitingSince: number | null = null;
  private deadAir = 0;
  private sigSum: number[] = [];
  private sigTime: number[] = [];
  private signalSlot: number | null = null;
  /** Night events already started (each fires once), and boards waiting their turn. */
  private fired = new Set<string>();
  private boardQueue: SwitchboardEvent[] = [];
  /** Card ids in the order their items began tonight (gates for callers read it). */
  private airedTonight: string[] = [];
  /** A record ended while a call was on over it; move on once the board closes. */
  private endPending = false;
  private board: ActiveBoard | null = null;
  private boardPanel: SwitchboardPanel | null = null;
  private calls: CallRecord[] = [];
  private morse: { event: MorseEvent; copy: MorseCopy; chart: string[]; t: number; left: number; panel: MorsePanel; autoT: number } | null = null;
  private morseQueue: MorseEvent[] = [];
  private morseResults: { id: string; result: 'decoded' | 'missed' }[] = [];
  private stopRing: (() => void) | null = null;
  private record: RecordHandle | null = null;
  private speech: Speech | null = null;
  /** A caller heard off air on the handset while their line is selected: the preview, then any confidence. */
  private listen: Playback | null = null;
  /** The copy of the call on air, DUMP_DELAY_SECONDS behind the handset. */
  private onAirCopy: Playback | null = null;
  /** Confidences heard off air tonight, as `t_<flag>` (tonight-gates read them). */
  private confidedTonight: string[] = [];
  private speaking = false;
  private spokenChars = 0;
  private wordEvents = false;
  private scriptLen = 1;
  /** When the current speech started and how long it should take (a call over a record has its own clock). */
  private speechStart = 0;
  private speechEstimate = 1;
  private showClock = 0;
  private recentQ = 1;
  private storm = false;
  private nextBolt = 0;
  /** The Other Station during the show: a second carrier on the dial, or an override running. */
  private carrier: CarrierIntrusion | null = null;
  private carrierVoice: { stop(): void } | null = null;
  private carrierDrone: (() => void) | null = null;
  private bleedNow = 0;
  private bleedSum: number[] = [];
  private bleedTime: number[] = [];
  private intrusionsFired = new Set<string>();
  private override: {
    def: TimedIntrusion;
    card: string | null;
    script: string;
    /** Seconds it has run, and of those, seconds the dial was held hard against it. */
    t: number;
    heldT: number;
    strength: number;
    speech: Speech | null;
    spoken: number;
    words: boolean;
    stopDrone: () => void;
    /**
     * The climax: the card the DJ can read over it, whether SPACE was pressed (for good),
     * whether the dial is held hard against it now, and the DJ's read once it's countered.
     */
    climax: {
      counter: string;
      title: string;
      script: string;
      countered: boolean;
      holding: boolean;
      speech: Speech | null;
      done: boolean;
      t: number;
      spoken: number;
      words: boolean;
    } | null;
  } | null = null;
  private overrideLog: { id: string; card: string | null; seconds: number; held: number }[] = [];
  private climaxLog: NonNullable<ShowPerformance['climax']> | null = null;
  private needlePanel: NeedlePanel | null = null;
  /** The tonearm swinging in over a record that's up next. */
  private needle: { slot: number; card: RecordCard; t: number; sweep: number } | null = null;
  private drops: (NeedleResult | null)[] = [];
  private needleRand = rng(78);
  /** The teleprompter's record credit, to put back after a call over the record. */
  private recordPrompt: { header: string; text: string } | null = null;
  /** The tube that's blown now (or the last one, fixed). */
  private tube: TubeFault | null = null;
  private tubePanel: TubePanel | null = null;
  /** Tube events due but waiting for an item to be playing (and the board to close). */
  private pendingTubes: TubeEvent[] = [];
  private tubeLog: { id: string; fault: TubeFault }[] = [];
  /** Tonight's spares drawer (the town's, less what's been seated tonight). */
  private drawer: Record<TubeType, number> = { ...run.town.spares };
  /** Program strength left by bodged tubes: 1, or less for the rest of the night. */
  private bodge = 1;
  /** The current tube's outcome (fixed or bodged) has been applied. */
  private tubeHandled = false;
  /** The desk, open live; `deskSlot` is the item it would replace. */
  private deskPanel: DeskPanel | null = null;
  private deskSlot = -1;
  private swaps: Swap[] = [];
  /** The next item is cued to be read hedged; slots that were. */
  private hedgeNext = false;
  private hedgedSlots = new Set<number>();
  private autoDeskDone = false;
  /** A card that ends the show aired: the show stopped after it, with no sign-off. */
  private endedEarly = false;
  /** The slot of a card that ends the show, once it begins: nothing after it is next. */
  private endsAt: number | null = null;
  private rainGfx!: Phaser.GameObjects.Graphics;
  private flash!: Phaser.GameObjects.Rectangle;
  /** The live show is paused (ESC or the PAUSE label): see setPaused. */
  private paused = false;
  private pausedAt = 0;
  private pauseOverlay: PauseOverlay | null = null;
  /** First-time hints waiting their turn, and whether one is on screen. */
  private hintQueue: HintId[] = [];
  private hintShowing = false;
  private ui: <T extends Phaser.GameObjects.GameObject>(o: T) => T = (o) => o;
  private fade: (out: boolean, ms: number, done?: () => void) => void = () => {};

  constructor() {
    super('Booth');
  }

  init(): void {
    // Scenes are reused on "play again"; reset everything.
    this.phase = 'prep';
    this.builder = null;
    this.hud = null;
    this.tubeGlows = [];
    this.townGlows = [];
    this.tuning = new Tuning(rng(1260));
    this.quality = 1;
    this.idx = -1;
    this.playing = false;
    this.cued = false;
    this.waitingSince = null;
    this.deadAir = 0;
    this.sigSum = Array(SHOW_SLOTS).fill(0);
    this.sigTime = Array(SHOW_SLOTS).fill(0);
    this.signalSlot = null;
    this.board = null;
    this.fired = new Set();
    this.boardQueue = [];
    this.airedTonight = [];
    this.endPending = false;
    this.boardPanel = null;
    this.calls = [];
    this.listen = null;
    this.onAirCopy = null;
    this.confidedTonight = [];
    exposeDebug('confidedTonight', this.confidedTonight);
    this.morse = null;
    this.morseQueue = [];
    this.morseResults = [];
    this.record = null;
    this.speech = null;
    this.speaking = false;
    this.showClock = 19 * 60 + 40;
    this.recentQ = 1;
    this.storm = false;
    this.nextBolt = 0;
    this.carrier = null;
    this.carrierVoice = null;
    this.carrierDrone = null;
    this.bleedNow = 0;
    this.bleedSum = Array(SHOW_SLOTS).fill(0);
    this.bleedTime = Array(SHOW_SLOTS).fill(0);
    this.intrusionsFired = new Set();
    this.override = null;
    this.overrideLog = [];
    this.climaxLog = null;
    this.needlePanel = null;
    this.needle = null;
    this.drops = Array(SHOW_SLOTS).fill(null);
    this.needleRand = rng(78);
    this.tube = null;
    this.tubePanel = null;
    this.pendingTubes = [];
    this.tubeLog = [];
    this.drawer = { ...run.town.spares };
    this.bodge = 1;
    this.tubeHandled = false;
    this.deskPanel = null;
    this.deskSlot = -1;
    this.swaps = [];
    this.hedgeNext = false;
    this.hedgedSlots = new Set();
    this.autoDeskDone = false;
    this.endedEarly = false;
    this.endsAt = null;
    // Scenes are reused: never start out paused.
    this.paused = false;
    this.pauseOverlay = null;
    this.time.paused = false;
    pauseSpeech(false);
    audio.resume();
    exposeDebug('paused', false);
    this.hintQueue = [];
    this.hintShowing = false;
    audio.setFault(0);
  }

  create(): void {
    this.buildRoom();
    applyScreenLook(this);
    const split = splitCameras(this);
    this.ui = split.ui;
    this.fade = split.fade;
    this.fade(false, 500);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT), a: kb.addKey(K.A), d: kb.addKey(K.D),
      space: kb.addKey(K.SPACE),
      q: kb.addKey(K.Q), w: kb.addKey(K.W), e: kb.addKey(K.E),
    };
    // Nothing but ESC does anything while the show is paused.
    const unpaused = (fn: () => void) => () => {
      if (!this.paused) fn();
    };
    this.keys.space.on('down', unpaused(() => this.pressCue()));
    (['q', 'w', 'e'] as const).forEach((k, i) => this.keys[k].on('down', unpaused(() => this.pickTube(i))));
    [K.ONE, K.TWO, K.THREE].forEach((code, i) => kb.addKey(code).on('down', unpaused(() => this.selectLine(i))));
    kb.addKey(K.ENTER).on('down', unpaused(() => this.putOnAir()));
    kb.addKey(K.X).on('down', unpaused(() => this.dumpCall()));
    kb.on('keydown', (e: KeyboardEvent) => !this.paused && this.typeMorse(e.key));
    // The desk: TAB opens and closes it (captured, so the browser keeps focus), 1-9 pick.
    kb.addKey(K.TAB).on('down', unpaused(() => this.toggleDesk()));
    // ESC puts the desk away if it is open; otherwise it pauses the show (and ends the pause).
    kb.addKey(K.ESC).on('down', () => {
      if (this.deskPanel && !this.paused) this.closeDesk();
      else this.setPaused(!this.paused);
    });
    [K.ONE, K.TWO, K.THREE, K.FOUR, K.FIVE, K.SIX, K.SEVEN, K.EIGHT, K.NINE].forEach((code, i) => kb.addKey(code).on('down', unpaused(() => this.pickDesk(i))));
    kb.addKey(K.H).on('down', unpaused(() => this.pressHedge()));

    // At prep nothing has aired: cards waiting on tonight's show turn up on the desk live.
    const prepNight = { ...run.night, cards: run.night.cards.filter((c) => gateOpen(c.gate, run.town.flags, { town: run.town, airedTonight: [], confidedTonight: [] })) };
    this.builder = new RundownBuilder(this, prepNight, run.town, (ids) => this.startShow(ids), (ids) => {
      // Render records in the background as soon as they're picked.
      for (const id of ids) {
        const card = id ? run.night.cards.find((c) => c.id === id) : undefined;
        if (card?.kind === 'record') audio.prepare(card.recordId, RECORD_SECONDS);
      }
    });
    this.ui(this.builder.root);
    markPhase('prep');
    markPhase(`prep-night-${run.night.number}`);
    exposeDebug('nightOnAir', run.night.number);

    if (DEBUG.auto) {
      this.time.delayedCall(500, () => {
        this.builder?.fill(run.night.rundowns.auto);
        markPhase('prep-filled');
        this.time.delayedCall(1200, () => this.startShow(run.night.rundowns.auto));
      });
    }
  }

  // ───────────────────────────── Room ─────────────────────────────

  private buildRoom(): void {
    this.add.image(0, 0, 'booth').setOrigin(0).setScale(S).setLighting(true).setSelfShadow(true, 0.5, 1 / 3);
    this.lights.enable().setAmbientColor(0x6a7294);
    this.lampLight = this.lights.addLight(BOOTH.lamp.x * S, (BOOTH.lamp.y + 16) * S, 340, hex(P.lamp), 2.6);
    this.tubeLight = this.lights.addLight(256 * S, 40 * S, 240, hex(P.tube), 1.8);
    this.lights.addLight(82 * S, 46 * S, 320, hex(P.moon), 1.0);
    this.lights.addLight(270 * S, 150 * S, 220, 0x8aa0d0, 0.7); // cool fill on the phone side
    this.onAirLight = this.lights.addLight(236 * S, 12 * S, 220, hex(P.red), 0);
    this.phoneLight = this.lights.addLight(BOOTH.phoneLamp.x * S, BOOTH.phoneLamp.y * S, 160, hex(P.red), 0);
    this.ghostLight = this.lights.addLight(BOOTH.dial.x * S, BOOTH.dial.y * S, 380, hex(P.ghost), 0);
    this.sweepLight = this.lights.addLight(-200, 60 * S, 260, 0xdde8ff, 0);

    // Window: town lights and the lighthouse beam passing over.
    for (const [x, y] of BOOTH.townLights) this.townGlows.push(glow(this, x * S, y * S, 9, hex(P.lamp), 0));
    glow(this, BOOTH.breakwaterLight.x * S, BOOTH.breakwaterLight.y * S, 10, hex(P.red), 0.8);
    this.beamGfx = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.rainGfx = this.add.graphics();

    // Platter.
    this.add.image(BOOTH.record.x * S, BOOTH.record.y * S, 'record').setScale(S);
    this.glint = this.add.image(0, 0, 'pixel').setScale(S * 2, S).setTint(0x9aa6b5).setAlpha(0);

    // Tubes, lamp, mug steam.
    for (const t of BOOTH.tubes) this.tubeGlows.push(glow(this, t.x * S, (t.y + 1) * S, 34, hex(P.tube), 0.85));
    glow(this, BOOTH.lamp.x * S, (BOOTH.lamp.y + 2) * S, 70, hex(P.lamp), 0.55);
    for (let k = 0; k < 3; k++) {
      const puff = this.add.image(BOOTH.mug.x * S, (BOOTH.mug.y - 10) * S, 'pixel').setScale(S).setAlpha(0).setTint(0xd8d8e8);
      this.tweens.add({
        targets: puff, y: (BOOTH.mug.y - 26) * S, x: `+=${(k - 1) * 4}`, alpha: { from: 0.5, to: 0 },
        duration: 2400, delay: k * 800, repeat: -1,
      });
    }

    // Needles (VU, dial, clock) are redrawn every frame.
    this.needles = this.add.graphics();

    // ON AIR sign overlay, lit when live.
    const s = BOOTH.onAir;
    const signLit = this.add.image(s.x * S, s.y * S, 'onair-lit').setOrigin(0).setScale(S);
    const signGlow = glow(this, (s.x + s.w / 2) * S, (s.y + s.h / 2) * S, 150, hex(P.red), 0.55);
    this.onAirSign = this.add.container(0, 0, [signLit, signGlow]).setAlpha(0);

    this.phoneGlow = glow(this, BOOTH.phoneLamp.x * S, BOOTH.phoneLamp.y * S, 30, hex(P.red), 0);

    // Lightning lights the whole room for an instant.
    this.flash = this.add.rectangle(0, 0, W, 360, 0xdde8ff, 1).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(40).setAlpha(0);

    // A sick green wash for the Other Station.
    this.ghostTint = this.add.rectangle(0, 0, W, 360, 0x7dff9a, 1).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(50).setAlpha(0);
  }

  private setTownLights(listeners: number, quality = 1): void {
    const lit = Math.round(Math.min(BOOTH.townLights.length, listeners / 9) * (0.4 + 0.6 * quality));
    this.townGlows.forEach((g, i) => g.setAlpha(i < lit ? 0.75 + 0.25 * Math.sin(this.time.now / 900 + i * 1.7) : 0));
  }

  private drawNeedles(dt: number): void {
    const g = this.needles;
    g.clear();
    // VU meters follow the program level (or the voice while talking).
    const level = this.phase === 'live' ? Math.max(audio.level(), this.speaking ? 0.35 + Math.random() * 0.35 : 0) : 0;
    BOOTH.meters.forEach((m, i) => {
      const target = Math.min(1, level * (i === 0 ? 1 : 0.9) + (i === 1 ? 0.02 : 0));
      this.vu[i] += (target - this.vu[i]) * Math.min(1, dt * 12);
      const a = Math.PI * (1.15 + 0.7 * this.vu[i]);
      const cx = m.x * S, cy = (m.y + 2) * S;
      g.lineStyle(2, 0x2a2420, 1);
      g.lineBetween(cx, cy, cx + Math.cos(a) * (m.r - 1) * S, cy + Math.sin(a) * (m.r - 1) * S);
    });
    // Tuning dial follows the carrier error.
    const d = BOOTH.dial;
    const da = -Math.PI / 2 + this.tuning.error * Math.PI * 0.8;
    g.lineStyle(2, 0xc0392b, 1);
    g.lineBetween(d.x * S, d.y * S, d.x * S + Math.cos(da) * (d.r - 2) * S, d.y * S + Math.sin(da) * (d.r - 2) * S);
    // Clock runs on show time.
    const c = BOOTH.clock;
    const mins = this.showClock;
    const ha = (((mins / 60) % 12) / 12) * Math.PI * 2 - Math.PI / 2;
    const ma = ((mins % 60) / 60) * Math.PI * 2 - Math.PI / 2;
    g.lineStyle(2, 0x2a2420, 1);
    g.lineBetween(c.x * S, c.y * S, c.x * S + Math.cos(ha) * 4.5 * S, c.y * S + Math.sin(ha) * 4.5 * S);
    g.lineStyle(1, 0x2a2420, 1);
    g.lineBetween(c.x * S, c.y * S, c.x * S + Math.cos(ma) * 7 * S, c.y * S + Math.sin(ma) * 7 * S);
  }

  private animateRoom(dt: number): void {
    // Tube flicker.
    const flick = 0.9 + Math.random() * 0.1;
    const cold = this.phase === 'other' || this.phase === 'done';
    this.tubeGlows.forEach((t, i) => {
      // A blown tube is dark; a fresh one flickers as it warms.
      const f = this.tube && i === this.tube.socket && !this.tube.fixed ? this.tube : null;
      const out = f ? (f.state === 'warming' ? (f.strength - 0.15) * (0.6 + 0.4 * Math.random()) : f.bodged ? 0.35 * (0.5 + 0.5 * Math.random()) : 0) : 1;
      t.setAlpha((cold ? 0.3 : 0.85) * (0.92 + 0.08 * Math.sin(this.time.now / 70 + i * 2)) * flick * out);
    });
    this.tubeLight.intensity = (cold ? 0.6 : 1.8) * flick;

    // Record glint orbits the platter at 78 rpm while a record plays.
    if (this.record) {
      this.recordAngle += dt * Math.PI * 2 * 1.3;
      const r = BOOTH.record;
      this.glint.setPosition((r.x + Math.cos(this.recordAngle) * r.rx * 0.6) * S, (r.y + Math.sin(this.recordAngle) * r.ry * 0.6) * S).setAlpha(0.8);
    } else this.glint.setAlpha(0);

    // The lighthouse beam passes over every ~9 s.
    this.sweepT = (this.sweepT + dt / 9) % 1;
    const w = BOOTH.window;
    const bx = w.x - 30 + this.sweepT * (w.w + 60);
    this.beamGfx.clear();
    for (let k = 0; k < 6; k++) {
      const x0 = Math.max(w.x, bx - 10 + k * 2), x1 = Math.min(w.x + w.w, bx + 10 - k * 2);
      if (x1 > x0) {
        this.beamGfx.fillStyle(0xdde8ff, 0.035);
        this.beamGfx.fillRect(x0 * S, w.y * S, (x1 - x0) * S, w.h * S);
      }
    }
    this.sweepLight.x = (this.sweepT * 1.4 - 0.2) * 640;
    this.sweepLight.intensity = 0.9 * Math.max(0, Math.sin(this.sweepT * Math.PI));

    // Ringing phone lamp.
    const ringing = !!this.board && this.board.onAir === null && this.board.states.includes('ringing');
    const on = ringing && Math.floor(this.time.now / 250) % 2 === 0;
    this.phoneLight.intensity = on ? 2.4 : 0;
    this.phoneGlow.setAlpha(on ? 0.9 : 0);

    this.setTownLights(run.town.listeners, this.phase === 'live' ? this.recentQ : 1);
  }

  // ───────────────────────────── Show ─────────────────────────────

  private startShow(ids: string[]): void {
    if (this.phase !== 'prep') return;
    this.phase = 'live';
    this.cards = ids.map((id) => run.night.cards.find((c) => c.id === id)!);
    for (const c of this.cards) if (c.kind === 'record') audio.prepare(c.recordId, RECORD_SECONDS);
    this.builder?.destroy();
    this.builder = null;
    this.hud = new LiveHud(this, this.cards, this.ui);
    this.hud.setOrder(-1, 0);
    this.hud.setDeskHandler(() => this.toggleDesk());
    this.hud.setPauseHandler(() => this.setPaused(true));
    this.needlePanel = new NeedlePanel(this, this.ui);
    audio.unlock();
    prefetchVoices(run.night);
    audio.sfx('thunk');
    this.hud.setOnAir(true, '[ ON AIR ]');
    this.tweens.add({ targets: this.onAirSign, alpha: 1, duration: 120 });
    this.onAirLight.intensity = 1.6;
    markPhase('live');
    exposeDebug('rundown', ids);
    exposeDebug('airedTonight', this.airedTonight);
    this.talk(-1, 'SIGN-ON', run.night.signOn).done.then(() => this.endItem());
  }

  /**
   * Speak a script on air, lighting the teleprompter as it goes. `hold` keeps the record
   * ducked when it ends (a caller's on-air copy is still playing behind the handset).
   */
  private talk(i: number, header: string, script: string, opts: { person?: PersonId; channel?: VoiceChannel; color?: string; reveal?: boolean; hold?: boolean } = {}): Speech {
    // A call over a record leaves the record's item alone; the speech keeps its own clock.
    const overRecord = !!this.board?.during;
    if (!overRecord) {
      this.idx = i;
      this.playing = true;
      this.itemStart = this.time.now;
    }
    this.speaking = true;
    this.spokenChars = 0;
    this.wordEvents = false;
    this.scriptLen = script.length;
    this.speechStart = this.time.now;
    this.hud?.setTeleprompter(header, script, opts.color, opts.reveal);
    audio.duck(true);
    const sp = speak(script, {
      person: opts.person ?? 'dj',
      channel: opts.channel ?? 'air',
      onWord: (c) => {
        this.spokenChars = c;
        this.wordEvents = true;
      },
    });
    this.speech = sp;
    this.speechEstimate = sp.estimate;
    if (!overRecord) this.itemDuration = sp.estimate;
    const done = sp.done.then(() => {
      if (this.speech !== sp) return;
      this.speaking = false;
      this.spokenChars = script.length;
      if (!opts.hold) audio.duck(false);
      this.hud?.setSpoken(script.length);
    });
    return { ...sp, done };
  }

  private beginItem(i: number): void {
    this.waitingSince = null;
    this.cued = false;
    this.closeDesk();
    // Events due before this item. Before sign-off only a late switchboard still rings.
    const due = eventsDue(run.night, this.fired, i, 0, 'between');
    this.fireEvents(i < SHOW_SLOTS ? due : due.filter((e) => e.kind === 'switchboard'));
    const board = this.boardQueue.shift();
    if (board) {
      this.openBoard(board, i, false);
      return;
    }
    if (i >= SHOW_SLOTS) {
      this.signalSlot = null;
      this.hud?.setOrder(SHOW_SLOTS, SHOW_SLOTS);
      this.talk(SHOW_SLOTS, 'SIGN-OFF', run.night.signOff).done.then(() => this.endItem());
      return;
    }
    this.idx = i;
    this.signalSlot = i;
    const card = this.cards[i];
    if (card.kind !== 'record' && card.endsShow) {
      // This one is the sign-off: the chips after it go dark as it airs.
      this.endsAt = i;
      this.hud?.setEndAt(i);
      markPhase('ends-show');
    }
    this.hud?.setOrder(i, i);
    this.airedTonight.push(card.id);
    // A hedged read: the unconfirmed script goes out instead.
    const hedged = this.hedgeNext && card.kind === 'news' && !!card.hedge;
    this.hedgeNext = false;
    if (hedged) this.hedgedSlots.add(i);
    this.hud?.setChips(this.hedgedSlots);
    if (card.kind === 'record') this.startNeedle(i, card);
    else {
      const script = hedged && card.kind === 'news' ? card.hedge! : (card as TalkCard).script;
      this.talk(i, `${kindHeader(card)}${hedged ? '*' : ''} · ${card.title}`, script).done.then(() => this.endItem());
    }
  }

  // ───────────────────────────── Needle ─────────────────────────────

  private startNeedle(slot: number, card: RecordCard): void {
    this.needle = { slot, card, t: 0, sweep: sweepFor(this.needleRand) };
    this.needlePanel?.show();
    this.hint('needle');
    this.hud?.setTeleprompter(`REC · ${card.title}`, 'The arm swings in over the record...', UI.dim);
    this.hud?.setSpoken(0);
    markPhase('needle');
  }

  private needleTick(dt: number): void {
    const n = this.needle!;
    n.t += dt;
    const pos = armPosition(n.t, n.sweep);
    this.needlePanel?.draw(pos, true);
    const centre = (NEEDLE.groove[0] + NEEDLE.groove[1]) / 2;
    if (pos >= 1 || (DEBUG.auto && pos >= centre)) this.dropNeedle();
  }

  private dropNeedle(): void {
    const n = this.needle;
    if (!n) return;
    this.needle = null;
    const pos = armPosition(n.t, n.sweep);
    const result = needleResult(pos);
    this.drops[n.slot] = result;
    this.needlePanel?.draw(pos, false);
    this.needlePanel?.result(result);
    if (result === 'scratch') audio.sfx('scratch');
    // Late drops skip into the song; scaled down for ?fast's short records.
    void this.playRecordCard(n.card, lateSkip(pos) * (RECORD_SECONDS / 75));
  }

  private async playRecordCard(card: RecordCard, offset = 0): Promise<void> {
    this.playing = true;
    this.itemStart = this.time.now;
    this.itemDuration = RECORD_SECONDS;
    const entry = resolveRecord(card.recordId);
    const credit = entry ? `${entry.performer}${entry.standIn ? '' : `, ${entry.year}`}` : '';
    const show = (standIn: boolean) => {
      const text = `${credit}${standIn ? ' (stand-in pressing)' : ''}. ${card.blurb}`;
      this.recordPrompt = { header: `REC · ${card.title}`, text };
      this.hud?.setTeleprompter(this.recordPrompt.header, text, UI.dim);
      this.hud?.setSpoken(text.length);
    };
    show(!!entry?.standIn);
    try {
      const h = await audio.playRecord(card.recordId, RECORD_SECONDS, offset);
      if (!h.real) show(true);
      this.record = h;
      markPhase(h.real ? 'record' : 'record-standin');
      this.itemStart = this.time.now;
      this.itemDuration = h.duration;
      if (DEBUG.auto && !this.autoDeskDone) {
        // ?auto never swaps, but opens the desk once so the screenshot tool can see it.
        this.autoDeskDone = true;
        this.openDesk();
        this.time.delayedCall(1500, () => this.closeDesk());
      }
      await h.ended;
    } catch {
      // A record that won't play ends at once; the show goes on.
    }
    this.record = null;
    this.recordPrompt = null;
    this.endItem();
  }

  private endItem(): void {
    this.playing = false;
    if (this.phase !== 'live') return;
    if (this.board) {
      // The record ran out under a call; move on when the board closes.
      this.endPending = true;
      return;
    }
    if (this.idx >= SHOW_SLOTS) {
      this.endShow();
      return;
    }
    const current = this.idx >= 0 ? this.cards[this.idx] : undefined;
    if (current && current.kind !== 'record' && current.endsShow) {
      // It was the sign-off. The rest of the show stays unaired, by choice.
      this.endedEarly = true;
      this.endShow();
      return;
    }
    const next = this.idx + 1;
    // Records don't need cueing: the arm swings in on its own and the player drops it.
    if (this.cued || DEBUG.auto || this.recordNext()) this.time.delayedCall(250, () => this.beginItem(next));
    else this.waitingSince = this.time.now;
  }

  /** Whether slot `n` will still air (not past a card that ends the show). */
  private stillAirs(n: number): boolean {
    return n >= 0 && n < SHOW_SLOTS && (this.endsAt === null || n <= this.endsAt);
  }

  private recordNext(): boolean {
    const n = this.idx + 1;
    return this.stillAirs(n) && this.cards[n].kind === 'record';
  }

  private remaining(): number {
    return this.itemDuration - (this.time.now - this.itemStart) / 1000;
  }

  private pressCue(): void {
    if (this.phase !== 'live') return;
    // While the climax has the frequency, SPACE talks over it (once; after that it cues as usual).
    if (!this.board && this.override?.climax && !this.override.climax.countered) {
      this.counterClimax();
      return;
    }
    if (this.board) {
      // SPACE leaves the switchboard, but not in the first second (no accidental hang-ups).
      if (this.time.now - this.board.opened > 1000) this.closeBoard();
      return;
    }
    if (this.needle) {
      this.dropNeedle();
      return;
    }
    if (this.recordNext()) return;
    if (this.waitingSince !== null) {
      audio.sfx('click');
      this.hedgeNext = false;
      this.beginItem(this.idx + 1);
    } else if (this.playing && this.remaining() <= CUE_WINDOW && (!this.cued || this.hedgeNext)) {
      // SPACE runs it straight (and takes back a hedged cue).
      this.cued = true;
      this.hedgeNext = false;
      this.hud?.setChips(this.hedgedSlots);
      audio.sfx('click');
    }
  }

  /** Whether item `slot` is news with a hedged script. */
  private hedgeable(slot: number): boolean {
    const card = this.stillAirs(slot) ? this.cards[slot] : undefined;
    return card?.kind === 'news' && !!card.hedge;
  }

  /** H: cue the next item hedged (or start it hedged, out of dead air). */
  private pressHedge(): void {
    if (this.phase !== 'live' || this.board || this.needle) return;
    // While a signal is keying, a letter on its chart is a guess, not a cue.
    if (this.morse?.chart.includes('H')) return;
    const next = this.idx + 1;
    if (!this.hedgeable(next)) return;
    if (this.waitingSince !== null) {
      audio.sfx('click');
      this.hedgeNext = true;
      this.beginItem(next);
    } else if (this.playing && this.remaining() <= CUE_WINDOW && !(this.cued && this.hedgeNext)) {
      this.cued = true;
      this.hedgeNext = true;
      this.hud?.setChips(new Set([...this.hedgedSlots, next]));
      audio.sfx('click');
    }
  }

  // ───────────────────────────── Desk ─────────────────────────────

  /**
   * The desk opens while there's a next item to replace and the moment allows: a talk
   * item's cue window, any time during a record, or dead air. Not over a call or the needle.
   */
  private deskAvailable(): boolean {
    if (this.phase !== 'live' || this.board || this.needle) return false;
    const next = this.idx + 1;
    if (!this.stillAirs(next)) return false;
    if (this.waitingSince !== null) return true;
    if (!this.playing) return false;
    if (this.idx >= 0 && this.cards[this.idx].kind === 'record') return true;
    return this.remaining() <= CUE_WINDOW;
  }

  private toggleDesk(): void {
    if (this.deskPanel) this.closeDesk();
    else this.openDesk();
  }

  private openDesk(): void {
    if (this.deskPanel || !this.deskAvailable()) return;
    const slot = this.idx + 1;
    // Re-checked every time: a card can be waiting on something that's aired since.
    const cards = deskCards(run.night, this.cards.map((c) => c.id), run.town, this.airedTonight, { confidedTonight: this.confidedTonight, slot });
    this.deskSlot = slot;
    this.deskPanel = new DeskPanel(this, cards, this.cards[slot].title, run.town, (i) => this.pickDesk(i), this.ui);
    audio.sfx('click');
    markPhase('desk');
  }

  private closeDesk(): void {
    this.deskPanel?.destroy();
    this.deskPanel = null;
    this.deskSlot = -1;
  }

  /** Put desk card `i` on next; the card it replaces goes back on the desk. */
  private pickDesk(i: number): void {
    const panel = this.deskPanel;
    const card = panel?.cards[i];
    if (!panel || !card || this.deskSlot !== this.idx + 1) return;
    const r = swapNext(this.cards.map((c) => c.id), this.deskSlot, card.id);
    if (!r) return;
    this.cards[this.deskSlot] = card;
    this.swaps.push(r.swap);
    this.hedgeNext = false;
    if (card.kind === 'record') audio.prepare(card.recordId, RECORD_SECONDS);
    this.hud?.setChips(this.hedgedSlots);
    exposeDebug('rundown', r.rundown);
    exposeDebug('swaps', this.swaps);
    audio.sfx('thunk');
    markPhase('desk-swap');
    this.closeDesk();
  }

  /** Keep the desk honest: it closes when the moment passes, and the cue box offers it. */
  private deskTick(): void {
    const available = this.deskAvailable();
    if (available) this.hint('desk');
    if (this.deskPanel && (!available || this.deskSlot !== this.idx + 1)) this.closeDesk();
    this.hud?.setDesk(available, !!this.deskPanel);
  }

  private nextTitle(): string {
    const n = this.idx + 1;
    if (this.endsAt !== null && n > this.endsAt) return 'nothing: the Lamp goes dark';
    return n >= SHOW_SLOTS ? 'sign-off' : this.cards[n].title;
  }

  // ─────────────────────────── Switchboard ───────────────────────────

  /** Start what's due: boards queue up, tubes wait for a playing item, Morse keys now (or after the one keying). */
  private fireEvents(events: NightEvent[]): void {
    for (const e of events) {
      this.fired.add(e.id);
      if (e.kind === 'switchboard') this.boardQueue.push(e);
      else if (e.kind === 'tube') this.pendingTubes.push(e);
      else if (e.kind === 'morse') {
        // A signal waits for the one keying now, and for the climax to let go of the frequency.
        if (this.morse || this.override?.climax) this.morseQueue.push(e);
        else this.startMorse(e);
      }
    }
  }

  /** Events due partway through the item on air. A board that comes due rings over the record. */
  private itemEvents(): void {
    if (this.board || !this.playing || this.idx < 0 || this.idx >= SHOW_SLOTS) return;
    const frac = (this.time.now - this.itemStart) / 1000 / Math.max(0.001, this.itemDuration);
    this.fireEvents(eventsDue(run.night, this.fired, this.idx, frac, this.cards[this.idx].kind === 'record' ? 'record' : 'talk'));
    const board = this.boardQueue.shift();
    if (board) this.openBoard(board, this.idx + 1, true);
  }

  /**
   * Ring a board. `slot` is the item that begins when it closes; `during` means it rings
   * over a record that keeps playing (ducked under any call).
   */
  private openBoard(event: SwitchboardEvent, slot: number, during: boolean): void {
    const lines = linesOpenNow(event, run.town, this.airedTonight, this.confidedTonight);
    if (!lines.length) {
      // Nobody's calling after all.
      if (!during) this.beginItem(slot);
      return;
    }
    if (!during) this.idx = slot - 1; // still between items
    this.board = {
      event, lines, slot, signal: event.at.slot, during,
      states: lines.map(() => 'ringing'), selected: null, onAir: null,
      left: lines.map((l) => patienceOf(l, RING_DEFAULT)), confided: lines.map(() => false), listenedAt: 0, listenOver: false, after: false,
      opened: this.time.now, dumpedAt: undefined, autoT: 0.5,
    };
    exposeDebug('board', { id: event.id, lines: lines.map((l) => l.id), during });
    this.boardPanel = new SwitchboardPanel(this, lines, {
      select: (i) => this.selectLine(i),
      onAir: () => this.putOnAir(),
      dump: () => this.dumpCall(),
      back: () => this.closeBoard(),
    }, this.ui);
    this.stopRing = audio.ring();
    this.hint('switchboard');
    if (!during) this.hud?.setTeleprompter('', '');
    markPhase('switchboard');
    markPhase(`switchboard:${event.id}`);
  }

  /** First press listens in off air; pressing the same line again puts it on. */
  private selectLine(i: number): void {
    const b = this.board;
    if (!b || b.onAir !== null || (b.states[i] !== 'ringing' && b.states[i] !== 'listening')) return;
    if (b.selected === i) {
      this.putOnAir();
      return;
    }
    if (b.selected !== null && b.states[b.selected] === 'listening') b.states[b.selected] = 'ringing';
    b.states[i] = 'listening';
    b.selected = i;
    b.listenedAt = this.time.now;
    b.listenOver = false;
    audio.sfx('click');
    this.listen?.cancel();
    const listen = (this.listen = this.listenIn(b, i));
    void listen.done.then(() => {
      if (this.listen === listen && this.board === b) b.listenOver = true;
    });
  }

  /**
   * The handset, off air: the caller's preview, then, if they have one and you're still
   * listening, what they won't say on air. Hearing it begin marks `t_<flag>` for tonight.
   */
  private listenIn(b: ActiveBoard, i: number): Playback {
    const line = b.lines[i];
    let cancelled = false;
    let timer: PauseTimer | undefined;
    let current = speak(line.preview, { person: line.person, channel: 'handset' });
    const done = current.done.then(() => {
      const confide = line.confide;
      if (cancelled || !confide) return;
      return new Promise<void>((resolve) => {
        timer = pauseClock.timeout(() => {
          if (cancelled) return resolve();
          b.confided[i] = true;
          const flag = `t_${confide.flag}`;
          if (!this.confidedTonight.includes(flag)) this.confidedTonight.push(flag);
          exposeDebug('confidedTonight', this.confidedTonight);
          markPhase('confide');
          current = speak(confide.text, { person: line.person, channel: 'handset' });
          void current.done.then(resolve);
        }, CONFIDE_GAP * 1000);
      });
    });
    return {
      done,
      cancel: () => {
        cancelled = true;
        timer?.clear();
        current.cancel();
      },
    };
  }

  /**
   * The town's copy of a call: the same words through the radio chain, DUMP_DELAY_SECONDS
   * behind the handset. The voice index gives both copies the same buffer. The browser
   * voice can't say two things at once, so when the handset copy is speechSynthesis there
   * is no second copy: the one voice stands for both (and the delay is only in the rules).
   */
  private delayedCopy(line: CallLine, handset: Speech): Playback {
    let cancelled = false;
    let copy: Speech | null = null;
    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    const timer = pauseClock.timeout(() => {
      if (cancelled || handset.browserVoice) return resolve();
      copy = speak(line.script, { person: line.person, channel: 'phone' });
      void copy.done.then(resolve);
    }, DUMP_DELAY_SECONDS * 1000);
    return {
      done,
      cancel: () => {
        cancelled = true;
        timer.clear();
        copy?.cancel();
        resolve();
      },
    };
  }

  private putOnAir(): void {
    const b = this.board;
    if (!b || b.onAir !== null || b.selected === null) return;
    if (b.after) {
      // Taking a call cuts the DJ's after-line short: a person would.
      b.after = false;
      this.speech?.cancel();
    }
    const i = b.selected;
    const line = b.lines[i];
    this.listen?.cancel();
    this.listen = null;
    b.onAir = i;
    b.states[i] = 'onair';
    b.dumpedAt = undefined;
    this.stopRing?.();
    this.stopRing = null;
    audio.sfx('pickup');
    if (!b.during) this.signalSlot = b.signal;
    markPhase('call');
    const header = `LINE ${['ONE', 'TWO', 'THREE'][i]} · ${line.name.toUpperCase()}`;
    // You hear them now, on the handset; the teleprompter and the dump follow this copy.
    const call = this.talk(b.slot - 1, header, line.script, { person: line.person, channel: 'handset', color: '#c9e7ff', reveal: true, hold: true });
    // The town hears them a few seconds later. The call is over when the town has heard it.
    const air = this.delayedCopy(line, this.speech!);
    this.onAirCopy = air;
    void call.done.then(() => air.done).then(() => this.callEnded(i));
  }

  private dumpCall(): void {
    const b = this.board;
    if (!b || b.onAir === null || b.dumpedAt !== undefined) return;
    b.dumpedAt = this.spokenNow();
    audio.sfx('dump');
    markPhase('dump');
    // Both copies stop at once: what was still in the delay never goes out.
    this.speech?.cancel();
    this.onAirCopy?.cancel();
  }

  private callEnded(i: number): void {
    const b = this.board;
    if (!b || b.onAir !== i) return;
    const line = b.lines[i];
    this.onAirCopy = null;
    this.calls.push(b.dumpedAt === undefined ? { line: line.id } : { line: line.id, dumpedAt: b.dumpedAt });
    b.states[i] = 'done';
    b.onAir = null;
    b.selected = null;
    this.speaking = false;
    if (b.dumpedAt === undefined) audio.sfx('hangup');
    if (b.dumpedAt !== undefined) this.hud?.setTeleprompter('DUMPED', `${line.script.slice(0, Math.round(b.dumpedAt))} --`, UI.dim);
    if (b.dumpedAt === undefined && line.after) {
      // The DJ picks the mic back up; the record stays ducked under them (talk un-ducks after).
      b.after = true;
      this.talk(b.slot - 1, 'YOU', line.after).done.then(() => {
        if (this.board !== b || !b.after || b.onAir !== null) return;
        b.after = false;
        this.boardResumes(b);
      });
      return;
    }
    audio.duck(false);
    this.boardResumes(b);
  }

  /** After a call: back to the lines still waiting, or back to the show. */
  private boardResumes(b: ActiveBoard): void {
    if (!b.during) this.playing = false;
    if (b.states.some((s) => s === 'ringing' || s === 'listening')) {
      if (b.states.includes('ringing') && !this.stopRing) this.stopRing = audio.ring();
    } else this.closeBoard();
  }

  /** Back to the show; anyone still ringing hangs up. */
  private closeBoard(): void {
    const b = this.board;
    if (!b || b.onAir !== null || b.after) return;
    this.listen?.cancel();
    this.listen = null;
    this.stopRing?.();
    this.stopRing = null;
    b.states = b.states.map((s) => (s === 'ringing' || s === 'listening' ? 'gone' : s));
    this.boardPanel?.update({ states: b.states, selected: null, onAir: null, left: b.left, confided: false, after: false });
    const panel = this.boardPanel;
    this.tweens.add({ targets: panel?.root, alpha: 0, delay: 300, duration: 300, onComplete: () => panel?.destroy() });
    this.boardPanel = null;
    this.board = null;
    if (!b.during) {
      this.beginItem(b.slot);
      return;
    }
    // Back to the record, or on to the next item if it ran out under the call.
    if (this.endPending) {
      this.endPending = false;
      this.endItem();
    } else {
      this.time.delayedCall(1200, () => {
        const p = this.recordPrompt;
        if (p && !this.board && !this.speaking) {
          this.hud?.setTeleprompter(p.header, p.text, UI.dim);
          this.hud?.setSpoken(p.text.length);
        }
      });
    }
  }

  private boardTick(dt: number): void {
    const b = this.board!;
    // Each line rings on its own clock, on air or not; the one on the handset holds.
    b.states.forEach((s, i) => {
      if (s !== 'ringing' && !(s === 'listening' && b.listenOver)) return;
      b.left[i] -= dt;
      if (b.left[i] <= 0) b.states[i] = 'gone';
    });
    const waiting = b.states.some((s) => s === 'ringing' || s === 'listening');
    if (!waiting && b.onAir === null && !b.after) {
      this.closeBoard();
      return;
    }
    if (!b.states.includes('ringing') && this.stopRing) {
      this.stopRing();
      this.stopRing = null;
    }
    const confided = b.selected !== null && b.confided[b.selected];
    this.boardPanel?.update({ states: b.states, selected: b.selected, onAir: b.onAir, left: b.left, confided, after: b.after });
    if (b.onAir !== null) {
      const line = b.lines[b.onAir];
      const turn = turnIndex(line);
      if (turn >= 0 && this.spokenNow() >= turn) markPhase('call-turn');
      if (DEBUG.auto && turn >= 0 && this.spokenNow() >= turn + 4) this.dumpCall();
    } else if (DEBUG.auto) this.autoBoard(dt);
  }

  /**
   * ?auto: take line one, then line two (and dump him when he turns), then back to the
   * show. Each is listened to first: a second, and until they confide if they will.
   */
  private autoBoard(dt: number): void {
    const b = this.board!;
    b.autoT -= dt;
    if (b.autoT > 0 || b.after) return;
    b.autoT = DEBUG.fast ? 0.4 : 1.2;
    const want = [0, 1].find((i) => b.states[i] === 'ringing' || b.states[i] === 'listening');
    if (want === undefined) this.closeBoard();
    else if (b.selected !== want) this.selectLine(want);
    else if ((this.time.now - b.listenedAt) / 1000 >= AUTO_LISTEN && (!b.lines[want].confide || b.confided[want])) this.putOnAir();
  }

  /** Characters of the current script spoken so far. */
  private spokenNow(): number {
    if (this.wordEvents) return this.spokenChars;
    const frac = (this.time.now - this.speechStart) / 1000 / Math.max(0.5, this.speechEstimate);
    return Math.min(1, frac) * this.scriptLen;
  }

  // ───────────────────────────── Tube ─────────────────────────────

  /** Blow the next due tube while an item plays, the board is closed and the last tube is dealt with. */
  private tubeCheck(): void {
    const def = this.pendingTubes[0];
    if (!def || this.board || !this.playing || (this.tube && !this.tubeHandled)) return;
    this.pendingTubes.shift();
    this.tube = new TubeFault(def.socket, this.drawer, rng(1260 + def.socket));
    this.tubeHandled = false;
    this.tubeLog.push({ id: def.id, fault: this.tube });
    this.tubePanel = new TubePanel(this, this.tube, (i) => this.pickTube(i), this.ui);
    this.hint('tube');
    audio.sfx('pop');
    const t = BOOTH.tubes[def.socket];
    const spark = glow(this, t.x * S, t.y * S, 40, 0xfff1c2, 1);
    this.tweens.add({ targets: spark, alpha: 0, scale: 1.8, duration: 350, onComplete: () => spark.destroy() });
    markPhase('tube');
    if (DEBUG.auto) {
      const fault = this.tube;
      // The right spare if the drawer has one; otherwise whatever's there.
      this.time.delayedCall(DEBUG.fast ? 800 : 2500, () => this.pickTube(fault.inStock ? fault.spares.indexOf(fault.need) : 0));
    }
  }

  private pickTube(i: number): void {
    if (this.phase !== 'live' || !this.tube) return;
    const r = this.tube.pick(i);
    if (r === 'right' || r === 'bodged') audio.sfx('thunk');
    else if (r === 'wrong') audio.sfx('pop');
  }

  /**
   * Advance a blown tube; returns the program strength (1 when healthy, less while a tube
   * is out, and less for the rest of the night after a bodge).
   */
  private tubeTick(dt: number): number {
    const f = this.tube;
    if (!f || this.tubeHandled) return this.bodge;
    f.step(dt);
    this.tubePanel?.update();
    // A pick can settle the tube (a bodge) between frames, so this checks every frame until handled.
    if (f.settled) {
      this.tubeHandled = true;
      // The seated spare is out of tonight's drawer (the resolver takes it from the town's).
      if (f.used) this.drawer[f.used] = Math.max(0, this.drawer[f.used] - 1);
      if (f.bodged) {
        this.bodge *= TUBE.bodgedStrength;
        markPhase('tube-bodged');
      }
      this.tubePanel?.close();
      this.tubePanel = null;
      return this.bodge;
    }
    return f.strength * this.bodge;
  }

  // ───────────────────────────── Morse ─────────────────────────────

  private startMorse(def: MorseEvent): void {
    const copy = new MorseCopy(def.word);
    const chart = chartFor(copy.word, rng(def.word.length * 31));
    const panel = new MorsePanel(this, copy.word.length, chart, this.ui);
    this.morse = { event: def, copy, chart, t: 0, left: DEBUG.fast ? 14 : def.seconds, panel, autoT: 1.5 };
    this.hint('morse');
    markPhase('morse');
  }

  private typeMorse(key: string): void {
    const m = this.morse;
    // Only letters on the chart are guesses; other keys (tuning, tubes) pass through.
    if (this.phase !== 'live' || !m || key.length !== 1 || !m.chart.includes(key.toUpperCase())) return;
    const r = m.copy.type(key);
    if (r === 'wrong') {
      m.left -= MORSE_TIMING.wrongPenalty;
      m.panel.wrong(key);
    } else if (r === 'done') this.finishMorse(true);
  }

  private morseTick(dt: number): void {
    const m = this.morse!;
    m.t += dt;
    m.left -= dt;
    const k = keyState(m.copy.word, m.t);
    audio.morseKey(k.on);
    m.panel.update(k.on, k.tape, m.copy.typed, m.left);
    if (DEBUG.auto && (m.autoT -= dt) <= 0) {
      m.autoT = 0.8;
      this.typeMorse(m.copy.word[m.copy.typed.length]);
    }
    if (this.morse && m.left <= 0) this.finishMorse(false);
  }

  private finishMorse(decoded: boolean): void {
    const m = this.morse;
    if (!m) return;
    this.morse = null;
    this.morseResults.push({ id: m.event.id, result: decoded ? 'decoded' : 'missed' });
    audio.morseKey(false);
    m.panel.finish(decoded, m.copy.word);
    markPhase(decoded ? 'morse-copied' : 'morse-faded');
    // The next signal waits for this one's panel to clear.
    if (this.morseQueue.length) {
      this.time.delayedCall(2000, () => {
        const next = this.morseQueue.shift();
        if (next && this.phase === 'live' && !this.morse) this.startMorse(next);
      });
    }
  }

  // ─────────────────────── The Other Station, live ───────────────────────

  /** A second carrier comes onto the dial (or goes). It reads what the sign-off would. */
  private setCarrier(c: CarrierIntrusion | null): void {
    this.carrierVoice?.stop();
    this.carrierVoice = null;
    this.carrierDrone?.();
    this.carrierDrone = null;
    this.carrier = c;
    this.bleedNow = 0;
    if (!c) {
      audio.setCarrier(0, 1);
      audio.setOtherGain(1);
      if (!this.override) this.ghostLight.intensity = 0;
      return;
    }
    audio.setOtherGain(0);
    this.carrierDrone = audio.otherStationDrone();
    if (!this.override) this.startCarrierVoice();
    markPhase('carrier');
  }

  private startCarrierVoice(): void {
    const id = pickOtherStationCard(run.night, this.cards.map((c) => c.id));
    const card = id ? run.night.cards.find((c) => c.id === id) : undefined;
    if (card && card.kind !== 'record') this.carrierVoice = loopOther(card.script, 4);
  }

  /** Overrides (and the climax) that come due: between items, or partway through the one on air. */
  private intrusionCheck(): void {
    const i = this.idx;
    if (this.override || i < 0 || i >= SHOW_SLOTS) return;
    const due = this.playing
      ? intrusionsDue(run.night, this.intrusionsFired, i, (this.time.now - this.itemStart) / 1000 / Math.max(0.001, this.itemDuration), this.cards[i].kind === 'record' ? 'record' : 'talk')
      : intrusionsDue(run.night, this.intrusionsFired, this.needle ? i : i + 1, 0, 'between');
    if (due[0]) this.startOverride(due[0]);
  }

  /** It takes the frequency. Whatever the station has on keeps running under it. */
  private startOverride(def: TimedIntrusion): void {
    this.intrusionsFired.add(def.id);
    const card = overrideCard(run.night, this.airedTonight, def.card);
    const c = card ? run.night.cards.find((k) => k.id === card) : undefined;
    const script = c && c.kind !== 'record' ? c.script : '';
    this.carrierVoice?.stop();
    this.carrierVoice = null;
    audio.override(true);
    audio.setOtherGain(1);
    const counter = def.kind === 'climax' ? run.night.cards.find((k) => k.id === def.counter) : undefined;
    const o: NonNullable<BoothScene['override']> = {
      def, card, script, t: 0, heldT: 0, strength: 1, speech: null, spoken: 0, words: false, stopDrone: audio.otherStationDrone(),
      climax: counter && counter.kind !== 'record'
        ? { counter: counter.id, title: counter.title, script: counter.script, countered: false, holding: false, speech: null, done: false, t: 0, spoken: 0, words: false }
        : null,
    };
    if (script) {
      o.speech = speak(script, {
        person: 'dj',
        channel: 'other',
        onWord: (ch) => {
          o.spoken = ch;
          o.words = true;
        },
      });
    }
    this.override = o;
    this.tweens.killTweensOf([this.ghostLight, this.ghostTint]);
    this.tweens.add({ targets: this.ghostLight, intensity: 1.1, duration: 1200 });
    this.tweens.add({ targets: this.ghostTint, alpha: 0.09, duration: 1200 });
    this.hud?.showOverride('1260 · ' + run.night.otherStation.stamp, script);
    if (o.climax) this.hud?.showClimax(o.climax.title, () => this.counterClimax());
    markPhase(def.kind === 'climax' ? 'climax' : 'override');
  }

  /** SPACE (or COUNTER) during the climax: the DJ reads the counter card over it, both voices at once. */
  private counterClimax(): void {
    const o = this.override;
    const c = o?.climax;
    if (!o || !c || c.countered || this.phase !== 'live') return;
    c.countered = true;
    c.holding = false;
    audio.sfx('click');
    audio.setOtherGain(1);
    // Past the override duck: the station's own item stays down under both of them.
    c.speech = speak(c.script, {
      person: 'dj',
      channel: 'over',
      onWord: (ch) => {
        c.spoken = ch;
        c.words = true;
      },
    });
    c.speech.done.then(() => (c.done = true));
    this.hud?.showCounter('COUNTER · ' + c.title, c.script);
    markPhase('climax-counter');
  }

  /** The second carrier's bleed and an override's clock, every frame. `input` is the player's hand on the dial. */
  private otherTick(dt: number, input: number, strength: number): void {
    if (this.carrier) {
      this.bleedNow = bleed(this.tuning.error, strength);
      audio.setCarrier(this.bleedNow, this.tuning.error - OTHER_OFFSET);
      if (!this.override) {
        audio.setOtherGain(this.bleedNow);
        this.ghostLight.intensity = 0.9 * this.bleedNow;
      }
      if (this.idx >= 0 && this.idx < SHOW_SLOTS) {
        this.bleedSum[this.idx] += this.bleedNow * dt;
        this.bleedTime[this.idx] += dt;
      }
    }
    const o = this.override;
    if (!o) return;
    o.t += dt;
    o.strength = strength;
    // ?fast runs it at a third of the time; the dawn still counts its full seconds.
    const scale = DEBUG.fast ? 1 / 3 : 1;
    const c = o.climax;
    if (c) {
      // ?auto&counter talks over it a second in.
      if (DEBUG.auto && DEBUG.counter && !c.countered && o.t >= 1) this.counterClimax();
      // Holding it hard (until SPACE commits the counter): its voice drops and the town hears static.
      c.holding = !c.countered && Math.abs(input) >= 1;
      if (c.holding) o.heldT += dt;
      if (!c.countered) audio.setOtherGain(c.holding ? 0.15 : 1);
      if (c.countered) {
        c.t += dt;
        this.hud?.overrideSpoken(c.words || !c.speech ? c.spoken : Math.min(1, c.t / Math.max(0.5, c.speech.estimate)) * c.script.length);
      } else {
        this.hud?.overrideSpoken(o.words || !o.speech ? o.spoken : Math.min(1, o.t / Math.max(0.5, o.speech.estimate)) * o.script.length);
      }
      this.hud?.climaxState(c.countered ? 'counter' : c.holding ? 'hold' : 'carry', o.heldT / o.t, c.countered);
      // It runs its full length (holding doesn't shorten it); talked over, until the DJ is done too.
      if (o.t >= o.def.seconds * scale && (!c.countered || c.done)) this.endOverride();
      return;
    }
    if (Math.abs(input) >= 1) o.heldT += dt;
    const spoken = o.words || !o.speech ? o.spoken : Math.min(1, o.t / Math.max(0.5, o.speech.estimate)) * o.script.length;
    this.hud?.overrideSpoken(spoken);
    if (o.t >= overrideSeconds(o.def.seconds, o.heldT / o.t, strength) * scale) this.endOverride();
  }

  /** Whether the dial is being held hard against the climax right now (the town hears static). */
  private jamming(): boolean {
    return !!this.override?.climax?.holding;
  }

  /** It lets go of the frequency (its time ran out, or the show ended under it). */
  private endOverride(): void {
    const o = this.override;
    if (!o) return;
    this.override = null;
    o.speech?.cancel();
    o.stopDrone();
    audio.override(false);
    const held = o.t > 0 ? o.heldT / o.t : 0;
    const c = o.climax;
    if (c) {
      c.speech?.cancel();
      audio.setOtherGain(this.carrier ? this.bleedNow : 1);
      const result = climaxResult(held, c.countered);
      this.climaxLog = { id: o.def.id, result, held, card: o.card, ...(c.countered ? { counter: c.counter } : {}) };
      exposeDebug('climax', this.climaxLog);
      this.hud?.endClimax();
      markPhase(`climax-${result}`);
      // A signal that came due under it keys now.
      if (!this.morse && this.morseQueue.length) {
        this.time.delayedCall(1500, () => {
          const next = this.morseQueue.shift();
          if (next && this.phase === 'live' && !this.morse) this.startMorse(next);
        });
      }
    } else this.overrideLog.push({ id: o.def.id, card: o.card, seconds: overrideSeconds(o.def.seconds, held, o.strength), held });
    this.tweens.killTweensOf([this.ghostLight, this.ghostTint]);
    this.tweens.add({ targets: this.ghostLight, intensity: 0, duration: 1500 });
    this.tweens.add({ targets: this.ghostTint, alpha: 0, duration: 1500 });
    this.hud?.endOverride();
    if (this.carrier) this.startCarrierVoice();
    if (!c) markPhase('override-end');
  }

  /** What the gauge shows besides your own carrier. */
  private dialIntrusion(): DialIntrusion {
    return this.override ? (this.override.climax ? 'climax' : 'override') : this.carrier ? 'carrier' : null;
  }

  // ───────────────────────────── Storm ─────────────────────────────

  private setStorm(on: boolean): void {
    this.storm = on;
    audio.setRain(on ? 1 : 0);
    if (on) {
      this.hint('storm');
      markPhase('storm');
      // The first strike knocks the carrier off frequency.
      this.bolt(Math.random() < 0.5 ? -0.4 : 0.4);
    } else this.rainGfx.clear();
  }

  private stormTick(): void {
    if (this.time.now >= this.nextBolt) this.bolt((Math.random() * 2 - 1) * 0.25);
    // Rain streaks on the window glass.
    const w = BOOTH.window;
    const g = this.rainGfx;
    g.clear();
    g.lineStyle(1, 0x9fb4d6, 0.35);
    for (let k = 0; k < 46; k++) {
      const seed = k * 7919;
      const x = w.x + (seed % w.w);
      const y = w.y + ((this.time.now / (3 + (k % 4)) + seed) % w.h);
      g.lineBetween(x * S, y * S, (x - 1.5) * S, Math.min(w.y + w.h, y + 5) * S);
    }
  }

  /** A lightning strike: flash, a kick to the dial, thunder a moment later. */
  private bolt(kick: number): void {
    this.nextBolt = this.time.now + 5000 + Math.random() * 6000;
    this.tuning.error = Math.max(-1, Math.min(1, this.tuning.error + kick));
    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0);
    this.tweens.chain({
      targets: this.flash,
      tweens: [
        { alpha: 0.45, duration: 40 },
        { alpha: 0.05, duration: 90 },
        { alpha: 0.3, duration: 40 },
        { alpha: 0, duration: 500, ease: 'Quad.easeOut' },
      ],
    });
    this.time.delayedCall(250 + Math.random() * 900, () => audio.sfx('thunder'));
  }

  private endShow(): void {
    if (this.phase !== 'live') return;
    this.closeDesk();
    this.hud?.setDesk(false);
    this.hintQueue = [];
    this.hud?.setHint('');
    if (this.storm) this.setStorm(false);
    this.endOverride();
    if (this.carrier) this.setCarrier(null);
    // Sign-off ends whatever was still coming through.
    this.morseQueue = [];
    if (this.morse) this.finishMorse(false);
    this.phase = 'other';
    this.hud?.setOnAir(false, 'OFF AIR');
    this.hud?.setCue('hidden', '');
    audio.sfx('thunk');
    this.onAirSign.setAlpha(0);
    this.onAirLight.intensity = 0;
    this.tweens.add({ targets: this.lampLight, intensity: 1.2, duration: 1500 });

    const signal = this.sigSum.map((s, i) => (this.sigTime[i] > 0 ? s / this.sigTime[i] : 1));
    // The running order as it aired, swaps and all (up to the card that ended it, if one did).
    const aired = this.endedEarly ? this.cards.slice(0, this.idx + 1) : this.cards;
    const result = resolveNight(run.night, run.town, {
      rundown: aired.map((c) => c.id),
      ...(this.endedEarly ? { endedEarly: true } : {}),
      signal,
      deadAirSeconds: this.deadAir,
      calls: this.calls,
      needles: this.drops,
      tubes: this.tubeLog.map(({ id, fault }) => ({
        id,
        seconds: fault.down,
        ...(fault.used ? { used: fault.used } : {}),
        ...(fault.bodged ? { bodged: true } : {}),
      })),
      morse: this.morseResults,
      bleed: this.bleedSum.map((s, i) => (this.bleedTime[i] > 0 ? s / this.bleedTime[i] : 0)),
      overrides: this.overrideLog,
      ...(this.climaxLog ? { climax: this.climaxLog } : {}),
      confided: this.confidedTonight,
      hedged: [...this.hedgedSlots].filter((i) => i < aired.length).map((i) => this.cards[i].id),
      swaps: this.swaps,
    });
    finishNight(result);
    exposeDebug('result', result);
    exposeDebug('signal', signal);
    markPhase('signoff');

    // The dial slips, then finds 1260 on its own.
    this.hud?.setTeleprompter('', '');
    audio.setStatic(0.9);
    this.tweens.add({ targets: this.tuning, error: 0.7, duration: 900, ease: 'Sine.easeOut', yoyo: true, hold: 300 });
    this.time.delayedCall(DEBUG.fast ? 1200 : 3200, () => this.otherStation(result.otherStation.script));
  }

  private otherStation(script: string): void {
    markPhase('other-station');
    audio.setStatic(0.12);
    const stopDrone = audio.otherStationDrone();
    this.tweens.add({ targets: this.ghostLight, intensity: 2.2, duration: 2500 });
    this.tweens.add({ targets: this.ghostTint, alpha: 0.18, duration: 2500 });
    this.hud?.setOnAir(false, '1260 kc');
    this.hud?.setClock('?? · 2:14 AM');
    this.talk(-1, 'UNKNOWN STATION · 1260', script, { person: 'dj', channel: 'other', color: UI.eerie }).done.then(() => {
      audio.duck(false);
      audio.setStatic(0.7);
      stopDrone();
      this.time.delayedCall(1500, () => {
        audio.setStatic(0.05);
        this.phase = 'done';
        this.fade(true, 1800, () => {
          this.hud?.destroy();
          this.needlePanel?.destroy();
          this.tubePanel?.destroy();
          this.scene.start('Dawn');
        });
      });
    });
  }

  // ───────────────────────────── Pause ─────────────────────────────

  /**
   * Pause or go on. Everything that keeps time stops: the audio graph (suspend freezes
   * every buffer source), the browser voice, the pause-aware timers (sim/pausable.ts),
   * Phaser's clock and tweens, and `update`. Only the live show pauses (not prep or dawn).
   * Phaser's `time.now` keeps running, so the timestamps the show compares it with are
   * moved forward by the time spent paused when it goes on.
   */
  private setPaused(on: boolean): void {
    if (on === this.paused) return;
    if (on && this.phase !== 'live' && this.phase !== 'other') return;
    this.paused = on;
    if (on) {
      this.pausedAt = this.time.now;
      if (this.hud) this.hud.pointerTune = 0;
      this.time.paused = true;
      this.tweens.pauseAll();
      audio.suspend();
      pauseSpeech(true);
      this.pauseOverlay = new PauseOverlay(this, this.ui, () => this.setPaused(false));
    } else {
      const gap = this.time.now - this.pausedAt;
      this.itemStart += gap;
      this.speechStart += gap;
      this.nextBolt += gap;
      if (this.waitingSince !== null) this.waitingSince += gap;
      if (this.board) {
        this.board.opened += gap;
        this.board.listenedAt += gap;
      }
      this.pauseOverlay?.destroy();
      this.pauseOverlay = null;
      this.time.paused = false;
      this.tweens.resumeAll();
      audio.resume();
      pauseSpeech(false);
    }
    exposeDebug('paused', on);
    markPhase(on ? 'paused' : 'resumed');
  }

  // ───────────────────────────── Hints ─────────────────────────────

  /** A booth task has turned up: say how it works the first time it does this run. */
  private hint(id: HintId): void {
    if (run.hints.includes(id) || this.hintQueue.includes(id)) return;
    this.hintQueue.push(id);
  }

  /** Whether a waiting hint still fits the moment: one that has gone stale is dropped, unseen, and shows the next time. */
  private hintFits(id: HintId): boolean {
    switch (id) {
      case 'needle': return !!this.needle;
      case 'tube': return !!this.tube && !this.tubeHandled;
      case 'switchboard': return !!this.board;
      case 'morse': return !!this.morse;
      case 'storm': return this.storm;
      case 'override': return !!this.override;
      case 'desk': return this.deskAvailable() && !this.recordNext() && !(this.tube && !this.tubeHandled) && !this.morse;
      case 'hedge': return this.hedgeable(this.idx + 1) && !this.board && !this.needle;
    }
  }

  /** One hint at a time, six seconds each (a pause holds the clock), the most urgent first. */
  private hintTick(): void {
    if (this.hintShowing || !this.hintQueue.length) return;
    this.hintQueue.sort((a, b) => HINT_ORDER.indexOf(a) - HINT_ORDER.indexOf(b));
    const id = this.hintQueue.shift()!;
    if (!this.hintFits(id) || !markHint(id)) return;
    this.hintShowing = true;
    this.hud?.setHint(HINTS[id]);
    markPhase(`hint:${id}`);
    this.time.delayedCall(HINT_SECONDS * 1000, () => {
      this.hud?.setHint('');
      this.hintShowing = false;
    });
  }

  // ───────────────────────────── Frame ─────────────────────────────

  update(_t: number, dtMs: number): void {
    if (this.paused) return;
    const dt = Math.min(0.1, dtMs / 1000);

    if (this.phase === 'live') {
      const seg = segmentOfSlot(Math.max(0, Math.min(SHOW_SLOTS - 1, this.idx)));
      const wind = this.idx >= 0 && this.idx < SHOW_SLOTS ? windForSlot(run.night, this.idx) : CALM_WIND;
      if ((wind > CALM_WIND) !== this.storm) this.setStorm(wind > CALM_WIND);
      if (this.storm) this.stormTick();
      let input = 0;
      if (this.keys.left.isDown || this.keys.a.isDown) input -= 1;
      if (this.keys.right.isDown || this.keys.d.isDown) input += 1;
      if (this.hud?.pointerTune) input = this.hud.pointerTune;
      const carrier = this.idx >= 0 && this.idx < SHOW_SLOTS ? carrierForSlot(run.night, this.idx) : null;
      if (carrier !== this.carrier) this.setCarrier(carrier);
      // ?auto holds 1260 (?drift: toward 1250 in storms) and leans on the dial through an override
      // and the climax (?counter: it talks over the climax instead, hands off the dial).
      if (DEBUG.auto) input = Math.max(-1, Math.min(1, ((DEBUG.drift && this.storm ? AUTO_DRIFT : 0) - this.tuning.error) * 12));
      if (DEBUG.auto && this.override) input = DEBUG.counter && this.override.climax ? 0 : 1;
      this.itemEvents();
      this.intrusionCheck();
      this.tubeCheck();
      const strength = this.tubeTick(dt);
      audio.setFault(1 - strength);
      // While it has the frequency the dial won't turn; pushing on it is holding against it.
      this.quality = this.tuning.step(dt, this.override ? 0 : input, wind) * strength;
      this.otherTick(dt, input, strength);
      // Held against the climax: neither station gets through, and the slot's signal pays for it.
      if (this.jamming()) this.quality *= JAM_SIGNAL;
      this.hud?.setTransmitter(this.storm || !!this.dialIntrusion() || Math.abs(this.tuning.error) > TUNING.deadZone * 1.5, this.storm, this.dialIntrusion());
      // Jamming it, the static comes up as if the dial were far off.
      audio.setTuning(this.jamming() ? Math.max(Math.abs(this.tuning.error), 0.85) : this.tuning.error);
      this.recentQ += (this.quality - this.recentQ) * Math.min(1, dt * 0.8);
      if (this.signalSlot !== null && this.signalSlot < SHOW_SLOTS) {
        this.sigSum[this.signalSlot] += this.quality * dt;
        this.sigTime[this.signalSlot] += dt;
      }

      if (this.morse) this.morseTick(dt);

      // Cueing and dead air; the desk.
      this.deskTick();
      const hedge = this.hedgeable(this.idx + 1);
      if (hedge && !this.board && !this.needle && (this.waitingSince !== null || (this.playing && this.remaining() <= CUE_WINDOW))) this.hint('hedge');
      if (this.override) this.hint('override');
      this.hintTick();
      if (this.board) {
        this.boardTick(dt);
        this.hud?.setCue('hidden', '');
      } else if (this.needle) {
        this.needleTick(dt);
        this.hud?.setCue('needle', this.cards[this.idx]?.title ?? '');
      } else if (this.waitingSince !== null) {
        const silent = (this.time.now - this.waitingSince) / 1000;
        if (silent > DEAD_AIR_GRACE) this.deadAir += dt;
        this.hud?.setCue(silent > DEAD_AIR_GRACE ? 'dead' : 'open', this.nextTitle(), Math.max(0, silent - DEAD_AIR_GRACE), hedge);
      } else if (this.playing && this.endsAt !== null && this.idx >= this.endsAt) {
        // The card that ends the show is on: nothing to cue.
        this.hud?.setCue('last', this.nextTitle());
      } else if (this.playing) {
        const rem = this.remaining();
        if (this.recordNext()) this.hud?.setCue('needleNext', this.nextTitle());
        else this.hud?.setCue(this.cued ? (this.hedgeNext ? 'cuedHedged' : 'cued') : rem <= CUE_WINDOW ? 'open' : 'waiting', this.nextTitle(), 0, hedge);
        if (DEBUG.auto && rem <= CUE_WINDOW) this.cued = true;
      } else this.hud?.setCue('hidden', '');

      // Show clock: 8 PM to 3 AM across the six slots.
      if (this.idx >= 0 && this.idx < SHOW_SLOTS) {
        const frac = this.playing ? Math.min(1, (this.time.now - this.itemStart) / 1000 / Math.max(1, this.itemDuration)) : 1;
        this.showClock = 20 * 60 + (this.idx + frac) * 70;
      }
      const segName = this.idx < 0 ? 'DUSK' : this.idx >= SHOW_SLOTS ? 'SMALL HOURS' : SEGMENT_LABEL[seg].split(/\s{2,}/)[0];
      this.hud?.setClock(`${segName} · ${formatClock(this.showClock)}`, this.deadAir);
      this.hud?.drawTuning(this.tuning.error, this.quality, true, this.dialIntrusion());
    } else if (this.phase === 'other') {
      this.hud?.drawTuning(this.tuning.error, 1, false);
    }

    // Teleprompter: word events when the voice provides them, otherwise reading pace.
    if (this.speaking && this.hud) this.hud.setSpoken(this.spokenNow());

    this.animateRoom(dt);
    this.drawNeedles(dt);
  }
}

function formatClock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}
