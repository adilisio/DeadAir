import { describe, it, expect } from 'vitest';
import {
  STARTING_STATE,
  audienceFactor,
  cloneState,
  effectiveThreshold,
  reachHint,
  reachPasses,
  resolveNight,
} from '../src/sim/resolver';
import { NIGHT_1 } from '../src/data/night1';
import { SHOW_SLOTS, type Card, type ReachCheck, type TownState } from '../src/sim/types';

const iceCheck = (): ReachCheck => {
  const card = NIGHT_1.cards.find((c) => c.id === 'warn_ice')!;
  if (card.kind !== 'warning' || !card.reach) throw new Error('fixture');
  return card.reach;
};

function town(over: Partial<TownState> = {}, trust: Partial<TownState['trust']> = {}): TownState {
  const s = cloneState(STARTING_STATE);
  return { ...s, ...over, trust: { ...s.trust, ...trust } };
}

describe('audienceFactor', () => {
  it('is 1 at the starting 140 listeners and clamps at half and one and a half', () => {
    expect(audienceFactor(140)).toBe(1);
    expect(audienceFactor(70)).toBe(0.5);
    expect(audienceFactor(10)).toBe(0.5);
    expect(audienceFactor(0)).toBe(0.5);
    expect(audienceFactor(210)).toBe(1.5);
    expect(audienceFactor(500)).toBe(1.5);
    expect(audienceFactor(105)).toBeCloseTo(0.75);
  });
});

/** A bare night: one news item with a big town-wide effect (listeners -20, safety +20) and five blanks. */
function showWith(start: TownState) {
  const news = (id: string, effects: ReachCheck['success']['effects']) =>
    ({ id, kind: 'news', title: id, blurb: '', script: '', truth: 'true', effects }) as unknown as Card;
  const cards = [news('big', { safety: 20, listeners: -20 }), ...['a', 'b', 'c', 'd', 'e'].map((id) => news(id, {}))];
  const night = { ...NIGHT_1, cards, events: [] };
  const rundown = cards.map((c) => c.id);
  return resolveNight(night, start, { rundown, signal: rundown.map(() => 1), calls: [], deadAirSeconds: 0 });
}

describe('listeners scale the audience', () => {
  it('halves town-wide effects at 70 listeners and gives 1.5x at 280', () => {
    const safety = (listeners: number) => {
      const r = showWith(town({ listeners }));
      return r.after.safety - r.before.safety;
    };
    expect(safety(140)).toBe(20); // dusk total 1.0 x signal 1 x factor 1
    expect(safety(70)).toBe(10);
    expect(safety(280)).toBe(30);
  });
});

describe('effectiveThreshold', () => {
  it('is x1.3 at trust 0, x1 at 50, x0.7 at 100', () => {
    expect(effectiveThreshold(0.6, 0)).toBeCloseTo(0.78);
    expect(effectiveThreshold(0.6, 50)).toBeCloseTo(0.6);
    expect(effectiveThreshold(0.6, 100)).toBeCloseTo(0.42);
  });
});

describe('reachPasses with trust and audience', () => {
  const check = iceCheck();
  it('passes at neutral trust and full signal (unchanged)', () => {
    expect(reachPasses(check, 'small', 1)).toBe(true);
    expect(reachPasses(check, 'small', 1, 1, 50)).toBe(true);
  });
  it('fails at netters trust 10 and signal 0.75, passes at trust 90', () => {
    expect(reachPasses(check, 'small', 0.75, 1, 10)).toBe(false);
    expect(reachPasses(check, 'small', 0.75, 1, 90)).toBe(true);
  });
  it('a thin audience makes the same warning harder to land', () => {
    expect(reachPasses(check, 'small', 0.75, 1, 50)).toBe(true);
    expect(reachPasses(check, 'small', 0.75, 0.5, 50)).toBe(false);
  });
  it('the resolver reads starting trust and listeners', () => {
    const run = (start: TownState, signal: number) => {
      const rundown = ['warn_ice', ...NIGHT_1.cards.map((c) => c.id).filter((id) => id !== 'warn_ice').slice(0, SHOW_SLOTS - 1)];
      // Put the warning in the last slot (small hours).
      rundown.push(rundown.shift()!);
      const sig = rundown.map((_id, i) => (i === SHOW_SLOTS - 1 ? signal : 1));
      return resolveNight(NIGHT_1, start, { rundown, signal: sig, calls: [], deadAirSeconds: 0 });
    };
    expect(run(town(), 1).after.flags).not.toContain('n1_boat_lost');
    expect(run(town({}, { netters: 10 }), 0.75).after.flags).toContain('n1_boat_lost');
    expect(run(town({}, { netters: 90 }), 0.75).after.flags).not.toContain('n1_boat_lost');
  });
});

describe('reachHint', () => {
  const mk = (threshold: number): ReachCheck => ({ ...iceCheck(), threshold });
  it('reads whisper, clear signal, whole town at the boundaries', () => {
    const t = town();
    expect(reachHint(mk(0.45), t)).toBe("they'll act on a whisper");
    expect(reachHint(mk(0.46), t)).toBe("they'll need a clear signal");
    expect(reachHint(mk(0.7), t)).toBe("they'll need a clear signal");
    expect(reachHint(mk(0.71), t)).toBe("they'll need the whole town listening");
  });
  it('shifts with trust and listeners', () => {
    expect(reachHint(mk(0.6), town())).toBe("they'll need a clear signal");
    expect(reachHint(mk(0.6), town({}, { netters: 100 }))).toBe("they'll act on a whisper"); // 0.42
    expect(reachHint(mk(0.6), town({}, { netters: 0 }))).toBe("they'll need the whole town listening"); // 0.78
    expect(reachHint(mk(0.6), town({ listeners: 280 }))).toBe("they'll act on a whisper"); // 0.6 / 1.5 = 0.4
    expect(reachHint(mk(0.6), town({ listeners: 70 }))).toBe("they'll need the whole town listening"); // 0.6 / 0.5
  });
});
