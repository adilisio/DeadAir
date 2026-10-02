import { describe, it, expect } from 'vitest';
import { DUMP_DELAY_CHARS, callResult, turnIndex } from '../src/sim/calls';
import { STARTING_STATE, resolveNight } from '../src/sim/resolver';
import { NIGHT_1, NIGHT_1_AUTO_RUNDOWN } from '../src/data/night1';
import type { CallRecord, ShowPerformance } from '../src/sim/types';

const line = (id: string) => NIGHT_1.switchboard.lines.find((l) => l.id === id)!;
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
    const slot = NIGHT_1.switchboard.slot;
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
