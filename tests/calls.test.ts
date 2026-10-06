import { describe, it, expect } from 'vitest';
import {
  DUMP_DELAY_CHARS, DUMP_DELAY_SECONDS, RING_SECONDS, callResult, dumpedSentence, patienceOf, requestResult, sentencesOf, turnIndex,
} from '../src/sim/calls';
import { STARTING_STATE, cloneState, resolveNight } from '../src/sim/resolver';
import { gateOpen, linesOpenNow, openNight } from '../src/sim/nights';
import { NIGHT_1, NIGHT_1_AUTO_RUNDOWN } from '../src/data/night1';
import { NIGHT_2 } from '../src/data/night2';
import { eventsOf } from '../src/sim/events';
import type { CallLine, CallRecord, Gate, ShowPerformance } from '../src/sim/types';

const board = eventsOf(NIGHT_1, 'switchboard')[0];
const line = (id: string) => board.lines.find((l) => l.id === id)!;
const chalk = line('call_chalk');
const okafor = line('call_okafor');

function run(calls: CallRecord[], signal = [1, 1, 1, 1, 1, 1]) {
  const p: ShowPerformance = { rundown: NIGHT_1_AUTO_RUNDOWN, signal, deadAirSeconds: 0, calls };
  return resolveNight(NIGHT_1, STARTING_STATE, p);
}

describe('call results', () => {
  it('a call nobody took', () => {
    expect(callResult(okafor, undefined)).toBe('notTaken');
  });

  it('a call allowed to finish', () => {
    expect(callResult(okafor, { line: okafor.id })).toBe('aired');
    expect(callResult(chalk, { line: chalk.id })).toBe('aired');
  });

  it('dumping an honest caller cuts them off', () => {
    expect(callResult(okafor, { line: okafor.id, dumpedAt: 30 })).toBe('cut');
  });

  it('the delay catches a dump made just after the caller turns', () => {
    const at = turnIndex(chalk);
    expect(at).toBeGreaterThan(0);
    expect(callResult(chalk, { line: chalk.id, dumpedAt: 5 })).toBe('caught');
    expect(callResult(chalk, { line: chalk.id, dumpedAt: at })).toBe('caught');
    expect(callResult(chalk, { line: chalk.id, dumpedAt: at + DUMP_DELAY_CHARS })).toBe('caught');
    expect(callResult(chalk, { line: chalk.id, dumpedAt: at + DUMP_DELAY_CHARS + 1 })).toBe('late');
  });
});

describe('the switchboard at dawn', () => {
  it('finds Teddy when Mrs. Okafor goes on air with a clear signal', () => {
    expect(run([{ line: 'call_okafor' }]).after.flags).toContain('n1_teddy_found');
  });

  it('loses Teddy to static when the signal is poor at the switchboard slot', () => {
    const slot = board.at.slot;
    const signal = [1, 1, 1, 1, 1, 1];
    signal[slot] = 0.5;
    expect(run([{ line: 'call_okafor' }], signal).after.flags).toContain('n1_teddy_cold');
  });

  it('a line left ringing has its own consequence', () => {
    expect(run([]).after.flags).toContain('n1_okafor_missed');
  });

  it('cutting off Mrs. Okafor is worse than never taking her call', () => {
    const cut = run([{ line: 'call_okafor', dumpedAt: 40 }]);
    const missed = run([]);
    expect(cut.after.flags).toContain('n1_okafor_cut');
    expect(cut.after.credibility).toBeLessThan(missed.after.credibility);
  });

  it('dumping the slanderer in time protects the Chapel and your name', () => {
    const caught = run([{ line: 'call_chalk', dumpedAt: turnIndex(chalk) + 10 }]);
    const aired = run([{ line: 'call_chalk' }]);
    const late = run([{ line: 'call_chalk', dumpedAt: turnIndex(chalk) + DUMP_DELAY_CHARS + 20 }]);
    expect(caught.after.flags).toContain('n1_slander_dumped');
    expect(aired.after.flags).toContain('n1_slander_aired');
    expect(late.after.flags).toContain('n1_slander_aired');
    expect(caught.after.trust.chapel).toBeGreaterThan(aired.after.trust.chapel);
    expect(caught.after.credibility).toBeGreaterThan(aired.after.credibility);
  });

  it('never taking the slanderer is neutral; taking him is the gamble', () => {
    const none = run([]);
    expect(none.after.flags.some((f) => f.startsWith('n1_slander'))).toBe(false);
  });

  it('several calls can air in one night', () => {
    const r = run([{ line: 'call_okafor' }, { line: 'call_lottie' }, { line: 'call_chalk', dumpedAt: turnIndex(chalk) }]);
    expect(r.after.flags).toEqual(expect.arrayContaining(['n1_teddy_found', 'n1_lottie_aired', 'n1_slander_dumped']));
  });
});

// ─────────────────────────── Switchboard v2 ───────────────────────────

const n2Late = eventsOf(NIGHT_2, 'switchboard').find((b) => b.id === 'n2_board_late')!;
const lottieReq = n2Late.lines.find((l) => l.id === 'call_lottie_request')!;
const n2Board = eventsOf(NIGHT_2, 'switchboard').find((b) => b.id === 'n2_board')!;
const sparky = n2Board.lines.find((l) => l.id === 'call_sparky')!;
const plainLine: CallLine = { id: 'x', person: 'bill', name: 'x', prompt: 'x', preview: 'x', script: '', aired: { flag: 'x', effects: {}, line: 'x', tone: 'neutral' } };
const withScript = (script: string): CallLine => ({ ...plainLine, script });

/** Night 2's auto rundown with `rec_dreamland` moved to `slot` (or swapped for another record). */
function n2Rundown(slot: number | null): string[] {
  const out = NIGHT_2.rundowns.auto.filter((id) => id !== 'rec_dreamland');
  if (slot === null) out.splice(1, 0, 'rec_millstream');
  else out.splice(slot, 0, 'rec_dreamland');
  return out;
}

function runN2(calls: CallRecord[], rundown = NIGHT_2.rundowns.auto, extra: Partial<ShowPerformance> = {}) {
  return resolveNight(NIGHT_2, STARTING_STATE, { rundown, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls, ...extra });
}

describe('the delay', () => {
  it('is three seconds, and about forty characters of speech', () => {
    expect(DUMP_DELAY_SECONDS).toBe(3);
    // 40 chars in 3 s is reading pace (about 13 a second): the two must agree.
    expect(DUMP_DELAY_CHARS / DUMP_DELAY_SECONDS).toBeGreaterThan(11);
    expect(DUMP_DELAY_CHARS / DUMP_DELAY_SECONDS).toBeLessThan(16);
  });
});

describe('patience', () => {
  it('defaults to the ring time and can be set per line', () => {
    expect(RING_SECONDS).toBe(18);
    expect(patienceOf(plainLine)).toBe(RING_SECONDS);
    expect(patienceOf(plainLine, 2.5)).toBe(2.5);
    expect(patienceOf({ ...plainLine, patience: 40 }, 2.5)).toBe(40);
  });
});

describe('sentences', () => {
  it('splits on terminal punctuation, keeping it, and covers every word', () => {
    expect(sentencesOf("Hello? Is this on? It's Grace.")).toEqual(['Hello?', 'Is this on?', "It's Grace."]);
    expect(sentencesOf('W.L.M.P is on. Trailing words')).toEqual(['W.L.M.P is on.', 'Trailing words']);
    expect(sentencesOf('  Spaced out!  Very.  ')).toEqual(['Spaced out!', 'Very.']);
    for (const l of [chalk, okafor, sparky, lottieReq]) {
      expect(sentencesOf(l.script).join(' ').replace(/\s+/g, ' ')).toBe(l.script.replace(/\s+/g, ' '));
    }
  });
});

describe('dumpedSentence', () => {
  const turn = turnIndex(chalk);

  it('is the sentence the caller turns in, when dumped at or after the turn', () => {
    expect(dumpedSentence(chalk, turn)).toBe("It's chalk.");
    expect(dumpedSentence(chalk, turn + 10)).toBe("It's chalk.");
    // Too late: it went out, and it's still the turn that's remembered.
    expect(dumpedSentence(chalk, turn + DUMP_DELAY_CHARS + 60)).toBe("It's chalk.");
    expect(dumpedSentence(sparky, turnIndex(sparky) + 5)).toBe('So everybody come on up to pylon six and see the lights!');
  });

  it('is the sentence being said when dumped before the turn, or from a caller who never turns', () => {
    expect(dumpedSentence(chalk, 3)).toBe('Evening, Lamp.');
    expect(dumpedSentence(chalk, turn - 2)).toBe('That sulfa powder Sister Agnes is handing out?');
    const second = okafor.script.indexOf('Is this on?');
    expect(dumpedSentence(okafor, second + 3)).toBe('Is this on?');
    expect(dumpedSentence(okafor, 0)).toBe('Hello?');
  });

  it('takes the next sentence at a gap, the last past the end, and whole sentences only', () => {
    const l = withScript('One two. Three four. Five.');
    expect(dumpedSentence(l, 8)).toBe('Three four.'); // the space after "two."
    expect(dumpedSentence(l, 7)).toBe('One two.');
    expect(dumpedSentence(l, 999)).toBe('Five.');
    expect(dumpedSentence(withScript('Never stops'), 4)).toBe('Never stops');
    for (const line of [chalk, okafor, sparky, lottieReq]) {
      for (let at = 0; at <= line.script.length; at += 7) {
        const s = dumpedSentence(line, at);
        expect(line.script).toContain(s);
        expect(s).toMatch(/[.!?]$/);
      }
    }
  });
});

describe('requests', () => {
  const cards = NIGHT_2.cards;

  it('is played when the record airs in a later slot than the one the board rang in', () => {
    expect(n2Late.at.slot).toBe(3);
    expect(requestResult(n2Late, lottieReq, n2Rundown(4), cards)).toBe(lottieReq.request!.played);
    expect(requestResult(n2Late, lottieReq, n2Rundown(5), cards)).toBe(lottieReq.request!.played);
  });

  it('is missed when the record aired before, during the ring, or never', () => {
    expect(requestResult(n2Late, lottieReq, n2Rundown(1), cards)).toBe(lottieReq.request!.missed);
    expect(requestResult(n2Late, lottieReq, n2Rundown(3), cards)).toBe(lottieReq.request!.missed);
    expect(requestResult(n2Late, lottieReq, n2Rundown(null), cards)).toBe(lottieReq.request!.missed);
  });

  it('counts the slot itself for a board that rings before its item begins', () => {
    const before = { ...n2Late, at: { slot: 3 } };
    expect(requestResult(before, lottieReq, n2Rundown(3), cards)).toBe(lottieReq.request!.played);
    expect(requestResult(before, lottieReq, n2Rundown(2), cards)).toBe(lottieReq.request!.missed);
  });

  it('is nothing for a line that asks for nothing', () => {
    expect(requestResult(n2Late, sparky, n2Rundown(4), cards)).toBeNull();
  });

  it('comes to dawn only when the call aired', () => {
    const played = runN2([{ line: 'call_lottie_request' }], n2Rundown(5));
    expect(played.after.flags).toContain('n2_lottie_request_played');
    expect(played.lines.map((l) => l.text)).toContain(lottieReq.request!.played.line);
    const missed = runN2([{ line: 'call_lottie_request' }], n2Rundown(1));
    expect(missed.after.flags).toContain('n2_lottie_request_missed');
    const notAired: CallRecord[][] = [[], [{ line: 'call_lottie_request', dumpedAt: 20 }]];
    for (const calls of notAired) {
      const r = runN2(calls, n2Rundown(5));
      expect(r.after.flags.some((f) => f.startsWith('n2_lottie_request')), JSON.stringify(calls)).toBe(false);
    }
  });
});

describe('what was dumped', () => {
  it('is kept in call order, with who said it', () => {
    const r = run([{ line: 'call_okafor', dumpedAt: 30 }, { line: 'call_lottie' }, { line: 'call_chalk', dumpedAt: turnIndex(chalk) + 8 }]);
    expect(r.otherStation.dumped).toEqual([
      { person: 'grace', text: dumpedSentence(okafor, 30) },
      { person: 'anon', text: "It's chalk." },
    ]);
    expect(run([]).otherStation.dumped).toEqual([]);
  });

  it('is not read back on Night 1', () => {
    expect(NIGHT_1.otherStation.readsDumped).toBeFalsy();
    const r = run([{ line: 'call_chalk', dumpedAt: turnIndex(chalk) + 8 }]);
    expect(r.otherStation.script).not.toContain("It's chalk.");
  });

  it('is read back on Night 2, after the stamp and before the card', () => {
    expect(NIGHT_2.otherStation.readsDumped).toBe(true);
    const turned = 'So everybody come on up to pylon six and see the lights!';
    const r = runN2([{ line: 'call_sparky', dumpedAt: turnIndex(sparky) + 3 }]);
    const { script } = r.otherStation;
    const card = NIGHT_2.cards.find((c) => c.id === r.otherStation.cardId)!;
    const body = card.kind === 'record' ? '' : card.script;
    expect(script.startsWith(`${NIGHT_2.otherStation.intro} ${NIGHT_2.otherStation.stamp} ${turned} ${body}`)).toBe(true);
    expect(script.endsWith(NIGHT_2.otherStation.outro)).toBe(true);
    // Nothing dumped: the broadcast is as before.
    expect(runN2([{ line: 'call_sparky' }]).otherStation.script).toBe(
      [NIGHT_2.otherStation.intro, NIGHT_2.otherStation.stamp, body, NIGHT_2.otherStation.outro].join(' '),
    );
  });
});

describe('confidences', () => {
  const gate: Gate = { tonight: { flags: ['t_grace_ridge'] } };

  it('gate tonight on what was confided off air', () => {
    expect(gateOpen(gate, [], { confidedTonight: [] })).toBe(false);
    expect(gateOpen(gate, [], { confidedTonight: ['t_grace_ridge'] })).toBe(true);
    expect(gateOpen({ tonight: { flags: ['t_a', 't_b'] } }, [], { confidedTonight: ['t_a'] })).toBe(false);
    // No context (prep): open.
    expect(gateOpen(gate, [])).toBe(true);
  });

  it('decide which lines ring, and are left for the board at prep', () => {
    const extra: CallLine = { ...board.lines[2], id: 'call_extra', gate };
    const b = { ...board, lines: [...board.lines, extra] };
    const town = cloneState(STARTING_STATE);
    expect(linesOpenNow(b, town, [], []).map((l) => l.id)).not.toContain('call_extra');
    expect(linesOpenNow(b, town, [], ['t_grace_ridge']).map((l) => l.id)).toContain('call_extra');
    const night = { ...NIGHT_1, events: [b] };
    expect(eventsOf(openNight(night, town), 'switchboard')[0].lines.map((l) => l.id)).toContain('call_extra');
  });

  it('are remembered by the town when heard', () => {
    expect(okafor.confide?.flag).toBe('grace_ridge');
    const heard = resolveNight(NIGHT_1, STARTING_STATE, { rundown: NIGHT_1_AUTO_RUNDOWN, signal: [1, 1, 1, 1, 1, 1], deadAirSeconds: 0, calls: [], confided: ['t_grace_ridge'] });
    expect(heard.after.flags).toContain('grace_ridge');
    expect(run([]).after.flags).not.toContain('grace_ridge');
  });
});
