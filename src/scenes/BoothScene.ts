import Phaser from 'phaser';
import { ART_SCALE, DEBUG, W } from '../config';
import { exposeDebug, markPhase } from '../debugHook';
import { BOOTH } from '../art/booth';
import { hex, P, UI } from '../art/palette';
import { applyScreenLook, glow, splitCameras } from './fx';
import { audio, type RecordHandle } from '../audio/engine';
import { speak, type Speech } from '../audio/voice';
import { rng } from '../audio/pressings';
import { run } from '../run';
import { resolveNight, segmentOfSlot } from '../sim/resolver';
import { TUNING, Tuning } from '../sim/tuning';
import { CALM_WIND, windForSlot } from '../sim/storm';
import { SHOW_SLOTS, type Card, type CallerDecision, type TalkCard } from '../sim/types';
import { RundownBuilder, SEGMENT_LABEL } from '../ui/RundownBuilder';
import { resolveRecord } from '../data/records';
import { NIGHT_1_AUTO_RUNDOWN } from '../data/night1';
import { LiveHud, kindHeader } from '../ui/LiveHud';

const S = ART_SCALE;
/** Records play up to this long, then fade (a 78 side runs about three minutes). */
const RECORD_SECONDS = DEBUG.fast ? 5 : 75;
const RING_SECONDS = DEBUG.fast ? 2.5 : 14;
const CUE_WINDOW = 8;
const DEAD_AIR_GRACE = 1.2;


type Phase = 'prep' | 'live' | 'other' | 'done';

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
  private keys!: Record<'left' | 'right' | 'a' | 'd' | 'space' | 'one' | 'two', Phaser.Input.Keyboard.Key>;
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
  private callerState: 'pending' | 'ringing' | 'done' = 'pending';
  private callerDecision: CallerDecision = 'missed';
  private stopRing: (() => void) | null = null;
  private record: RecordHandle | null = null;
  private speech: Speech | null = null;
  private speaking = false;
  private spokenChars = 0;
  private wordEvents = false;
  private scriptLen = 1;
  private showClock = 0;
  private recentQ = 1;
  private storm = false;
  private nextBolt = 0;
  private rainGfx!: Phaser.GameObjects.Graphics;
  private flash!: Phaser.GameObjects.Rectangle;
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
    this.callerState = 'pending';
    this.callerDecision = 'missed';
    this.record = null;
    this.speech = null;
    this.speaking = false;
    this.showClock = 19 * 60 + 40;
    this.recentQ = 1;
    this.storm = false;
    this.nextBolt = 0;
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
      space: kb.addKey(K.SPACE), one: kb.addKey(K.ONE), two: kb.addKey(K.TWO),
    };
    this.keys.space.on('down', () => this.pressCue());

    this.builder = new RundownBuilder(this, run.night, run.town, (ids) => this.startShow(ids), (ids) => {
      // Render records in the background as soon as they're picked.
      for (const id of ids) {
        const card = id ? run.night.cards.find((c) => c.id === id) : undefined;
        if (card?.kind === 'record') audio.prepare(card.recordId, RECORD_SECONDS);
      }
    });
    this.ui(this.builder.root);
    markPhase('prep');

    if (DEBUG.auto) {
      this.time.delayedCall(500, () => {
        this.builder?.fill(NIGHT_1_AUTO_RUNDOWN);
        markPhase('prep-filled');
        this.time.delayedCall(1200, () => this.startShow(NIGHT_1_AUTO_RUNDOWN));
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
    this.tubeGlows.forEach((t, i) => t.setAlpha((cold ? 0.3 : 0.85) * (0.92 + 0.08 * Math.sin(this.time.now / 70 + i * 2)) * flick));
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
    const on = this.callerState === 'ringing' && Math.floor(this.time.now / 250) % 2 === 0;
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
    audio.unlock();
    audio.sfx('thunk');
    this.hud.setOnAir(true, '[ ON AIR ]');
    this.tweens.add({ targets: this.onAirSign, alpha: 1, duration: 120 });
    this.onAirLight.intensity = 1.6;
    markPhase('live');
    exposeDebug('rundown', ids);
    this.talk(-1, 'SIGN-ON', run.night.signOn).done.then(() => this.endItem());
  }

  /** Speak a script on air, lighting the teleprompter as it goes. */
  private talk(i: number, header: string, script: string, opts: { pitch?: number; rate?: number; color?: string } = {}): Speech {
    this.idx = i;
    this.playing = true;
    this.speaking = true;
    this.spokenChars = 0;
    this.wordEvents = false;
    this.scriptLen = script.length;
    this.itemStart = this.time.now;
    this.hud?.setTeleprompter(header, script, opts.color);
    audio.duck(true);
    const sp = speak(script, {
      pitch: opts.pitch,
      rate: opts.rate,
      onWord: (c) => {
        this.spokenChars = c;
        this.wordEvents = true;
      },
    });
    this.speech = sp;
    this.itemDuration = sp.estimate;
    const done = sp.done.then(() => {
      if (this.speech !== sp) return;
      this.speaking = false;
      audio.duck(false);
      this.hud?.setSpoken(script.length);
    });
    return { ...sp, done };
  }

  private beginItem(i: number): void {
    this.waitingSince = null;
    this.cued = false;
    if (i >= SHOW_SLOTS) {
      this.signalSlot = null;
      this.hud?.setOrder(SHOW_SLOTS, SHOW_SLOTS);
      this.talk(SHOW_SLOTS, 'SIGN-OFF', run.night.signOff).done.then(() => this.endItem());
      return;
    }
    if (i === run.night.caller.slot && this.callerState === 'pending') {
      this.ring(i);
      return;
    }
    this.idx = i;
    this.signalSlot = i;
    this.hud?.setOrder(i, i);
    const card = this.cards[i];
    if (card.kind === 'record') void this.playRecordCard(card);
    else this.talk(i, `${kindHeader(card)} · ${card.title}`, (card as TalkCard).script).done.then(() => this.endItem());
  }

  private async playRecordCard(card: Extract<Card, { kind: 'record' }>): Promise<void> {
    this.playing = true;
    this.itemStart = this.time.now;
    this.itemDuration = RECORD_SECONDS;
    const entry = resolveRecord(card.recordId);
    const credit = entry ? `${entry.performer}${entry.standIn ? '' : `, ${entry.year}`}` : '';
    const show = (standIn: boolean) => {
      const text = `${credit}${standIn ? ' (stand-in pressing)' : ''}. ${card.blurb}`;
      this.hud?.setTeleprompter(`REC · ${card.title}`, text, UI.dim);
      this.hud?.setSpoken(text.length);
    };
    show(!!entry?.standIn);
    try {
      const h = await audio.playRecord(card.recordId, RECORD_SECONDS);
      if (!h.real) show(true);
      this.record = h;
      markPhase(h.real ? 'record' : 'record-standin');
      this.itemStart = this.time.now;
      this.itemDuration = h.duration;
      await h.ended;
    } catch {
      // A record that won't play ends at once; the show goes on.
    }
    this.record = null;
    this.endItem();
  }

  private endItem(): void {
    this.playing = false;
    if (this.phase !== 'live') return;
    if (this.idx >= SHOW_SLOTS) {
      this.endShow();
      return;
    }
    const next = this.idx + 1;
    if (this.cued || DEBUG.auto) this.time.delayedCall(250, () => this.beginItem(next));
    else this.waitingSince = this.time.now;
  }

  private remaining(): number {
    return this.itemDuration - (this.time.now - this.itemStart) / 1000;
  }

  private pressCue(): void {
    if (this.phase !== 'live' || this.callerState === 'ringing') return;
    if (this.waitingSince !== null) {
      audio.sfx('click');
      this.beginItem(this.idx + 1);
    } else if (this.playing && this.remaining() <= CUE_WINDOW && !this.cued) {
      this.cued = true;
      audio.sfx('click');
    }
  }

  private nextTitle(): string {
    const n = this.idx + 1;
    return n >= SHOW_SLOTS ? 'sign-off' : this.cards[n].title;
  }

  private ring(slot: number): void {
    this.callerState = 'ringing';
    this.idx = slot - 1; // still between items
    this.stopRing = audio.ring();
    markPhase('caller');
    const c = run.night.caller;
    const decide = (d: CallerDecision) => {
      if (this.callerState !== 'ringing') return;
      this.callerState = 'done';
      this.callerDecision = d;
      this.stopRing?.();
      this.hud?.hideCaller();
      if (d === 'onair') {
        audio.sfx('pickup');
        this.signalSlot = slot;
        audio.setStatic(0.25);
        this.talk(slot - 1, `LINE ONE · ${c.name.toUpperCase()}`, c.script, { pitch: 1.35, rate: 1.05, color: '#c9e7ff' }).done.then(() => {
          audio.sfx('hangup');
          this.beginItem(slot);
        });
      } else {
        if (d === 'declined') audio.sfx('hangup');
        this.beginItem(slot);
      }
    };
    this.hud?.showCaller(c.prompt, () => decide('onair'), () => decide('declined'));
    this.keys.one.once('down', () => decide('onair'));
    this.keys.two.once('down', () => decide('declined'));
    this.time.delayedCall(RING_SECONDS * 1000, () => decide('missed'));
    if (DEBUG.auto) this.time.delayedCall(DEBUG.fast ? 900 : 2500, () => decide('onair'));
  }

  // ───────────────────────────── Storm ─────────────────────────────

  private setStorm(on: boolean): void {
    this.storm = on;
    audio.setRain(on ? 1 : 0);
    if (on) {
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
    if (this.storm) this.setStorm(false);
    this.phase = 'other';
    this.hud?.setOnAir(false, 'OFF AIR');
    this.hud?.setCue('hidden', '');
    audio.sfx('thunk');
    this.onAirSign.setAlpha(0);
    this.onAirLight.intensity = 0;
    this.tweens.add({ targets: this.lampLight, intensity: 1.2, duration: 1500 });

    const signal = this.sigSum.map((s, i) => (this.sigTime[i] > 0 ? s / this.sigTime[i] : 1));
    const result = resolveNight(run.night, run.town, {
      rundown: this.cards.map((c) => c.id),
      signal,
      deadAirSeconds: this.deadAir,
      caller: this.callerDecision,
    });
    run.result = result;
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
    this.talk(-1, 'UNKNOWN STATION · 1260', script, { pitch: 0.4, rate: 0.82, color: UI.eerie }).done.then(() => {
      audio.duck(false);
      audio.setStatic(0.7);
      stopDrone();
      this.time.delayedCall(1500, () => {
        audio.setStatic(0.05);
        this.phase = 'done';
        this.fade(true, 1800, () => {
          this.hud?.destroy();
          this.scene.start('Dawn');
        });
      });
    });
  }

  // ───────────────────────────── Frame ─────────────────────────────

  update(_t: number, dtMs: number): void {
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
      if (DEBUG.auto) input = Math.max(-1, Math.min(1, -this.tuning.error * 12));
      this.quality = this.tuning.step(dt, input, wind);
      this.hud?.setTransmitter(this.storm || Math.abs(this.tuning.error) > TUNING.deadZone * 1.5, this.storm);
      audio.setTuning(this.tuning.error);
      this.recentQ += (this.quality - this.recentQ) * Math.min(1, dt * 0.8);
      if (this.signalSlot !== null && this.signalSlot < SHOW_SLOTS) {
        this.sigSum[this.signalSlot] += this.quality * dt;
        this.sigTime[this.signalSlot] += dt;
      }

      // Cueing and dead air.
      if (this.waitingSince !== null && this.callerState !== 'ringing') {
        const silent = (this.time.now - this.waitingSince) / 1000;
        if (silent > DEAD_AIR_GRACE) this.deadAir += dt;
        this.hud?.setCue(silent > DEAD_AIR_GRACE ? 'dead' : 'open', this.nextTitle(), Math.max(0, silent - DEAD_AIR_GRACE));
      } else if (this.playing && this.callerState !== 'ringing') {
        const rem = this.remaining();
        this.hud?.setCue(this.cued ? 'cued' : rem <= CUE_WINDOW ? 'open' : 'waiting', this.nextTitle());
        if (DEBUG.auto && rem <= CUE_WINDOW) this.cued = true;
      } else this.hud?.setCue('hidden', '');

      // Show clock: 8 PM to 3 AM across the six slots.
      if (this.idx >= 0 && this.idx < SHOW_SLOTS) {
        const frac = this.playing ? Math.min(1, (this.time.now - this.itemStart) / 1000 / Math.max(1, this.itemDuration)) : 1;
        this.showClock = 20 * 60 + (this.idx + frac) * 70;
      }
      const segName = this.idx < 0 ? 'DUSK' : this.idx >= SHOW_SLOTS ? 'SMALL HOURS' : SEGMENT_LABEL[seg].split(/\s{2,}/)[0];
      this.hud?.setClock(`${segName} · ${formatClock(this.showClock)}`, this.deadAir);
      this.hud?.drawTuning(this.tuning.error, this.quality, true);
    } else if (this.phase === 'other') {
      this.hud?.drawTuning(this.tuning.error, 1, false);
    }

    // Teleprompter: word events when the voice provides them, otherwise reading pace.
    if (this.speaking && this.hud) {
      const frac = (this.time.now - this.itemStart) / 1000 / Math.max(0.5, this.itemDuration);
      this.hud.setSpoken(this.wordEvents ? this.spokenChars : frac * this.scriptLen);
    }

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
