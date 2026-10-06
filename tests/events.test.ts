import { describe, it, expect } from 'vitest';
import { airedWhenBoardOpens, eventsDue, eventsOf } from '../src/sim/events';
import { NIGHT_1 } from '../src/data/night1';
import { NIGHT_2 } from '../src/data/night2';
import type { NightDef, NightEvent, Outcome } from '../src/sim/types';

const o: Outcome = { flag: 'x', effects: {}, line: 'x', tone: 'neutral' };
const night = (events: NightEvent[]): NightDef => ({ ...NIGHT_1, events });
const ids = (es: NightEvent[]) => es.map((e) => e.id);
const none = new Set<string>();

const EVENTS: NightEvent[] = [
  { kind: 'switchboard', id: 'board_dusk', at: { slot: 1 }, lines: [] },
  { kind: 'switchboard', id: 'board_in_rec', at: { slot: 2, frac: 0.5 }, lines: [] },
  { kind: 'tube', id: 'tube_a', at: { slot: 2, frac: 0.3 }, socket: 1 },
  { kind: 'tube', id: 'tube_b', at: { slot: 4, frac: 0.6 }, socket: 3 },
  { kind: 'morse', id: 'morse_a', at: { slot: 3 }, word: 'SOS', seconds: 30, decoded: o, missed: o },
  { kind: 'morse', id: 'morse_b', at: { slot: 3, frac: 0.5 }, word: 'TEN', seconds: 30, decoded: o, missed: o },
  { kind: 'storm', id: 'storm', slots: [4, 5], held: { line: 'h', effects: {} }, lost: { line: 'l', effects: {} } },
];
const N = night(EVENTS);

describe('eventsDue', () => {
  it('fires frac-0 events between items, just before their slot begins', () => {
    expect(ids(eventsDue(N, none, 1, 0, 'between'))).toEqual(['board_dusk']);
    expect(ids(eventsDue(N, none, 0, 0, 'between'))).toEqual([]);
    expect(ids(eventsDue(N, new Set(['board_dusk']), 1, 0, 'between'))).toEqual([]);
  });

  it('fires mid-item events once their fraction has played', () => {
    expect(ids(eventsDue(N, none, 2, 0.2, 'record'))).toEqual([]);
    expect(ids(eventsDue(N, none, 2, 0.3, 'record'))).toEqual(['tube_a']);
    expect(ids(eventsDue(N, none, 2, 0.6, 'record'))).toEqual(['board_in_rec', 'tube_a']);
    expect(ids(eventsDue(N, new Set(['tube_a']), 2, 0.6, 'record'))).toEqual(['board_in_rec']);
  });

  it('never fires a frac-0 event during an item, nor a later slot\'s event', () => {
    expect(ids(eventsDue(N, none, 1, 0.9, 'record'))).toEqual([]);
    expect(ids(eventsDue(N, none, 3, 0.2, 'talk'))).toEqual([]);
  });

  it('holds a switchboard due during talk until the talk ends', () => {
    expect(ids(eventsDue(N, none, 2, 0.9, 'talk'))).toEqual(['tube_a']);
    expect(ids(eventsDue(N, new Set(['board_dusk', 'tube_a']), 3, 0, 'between'))).toEqual(['board_in_rec', 'morse_a']);
  });

  it('starts Morse mid-item when its fraction is reached, in talk or a record', () => {
    expect(ids(eventsDue(N, new Set(['morse_a']), 3, 0.5, 'talk'))).toEqual(['morse_b']);
    expect(ids(eventsDue(N, new Set(['morse_a']), 3, 0.5, 'record'))).toEqual(['morse_b']);
  });

  it('fires anything whose item ended before its moment between items, before the next one', () => {
    const fired = new Set(['board_dusk', 'board_in_rec', 'tube_a', 'morse_a', 'morse_b']);
    expect(ids(eventsDue(N, fired, 5, 0, 'between'))).toEqual(['tube_b']);
    expect(ids(eventsDue(N, fired, 6, 0, 'between'))).toEqual(['tube_b']); // before sign-off
  });

  it('never schedules storms (they are wind over whole slots)', () => {
    for (let s = 0; s <= 6; s++) for (const k of ['between', 'record', 'talk'] as const) {
      expect(eventsDue(N, none, s, 1, k).some((e) => e.kind === 'storm')).toBe(false);
    }
  });
});

describe('when a board opens', () => {
  it('counts the items that have begun by then', () => {
    const rundown = ['a', 'b', 'c', 'd', 'e', 'f'];
    const [dusk, inRec] = eventsOf(N, 'switchboard');
    expect(airedWhenBoardOpens(dusk, rundown)).toEqual(['a']);
    expect(airedWhenBoardOpens(inRec, rundown)).toEqual(['a', 'b', 'c']);
  });
});

describe('nights 1 and 2 keep their schedule', () => {
  it('night 1: tube 35% into slot 1, the board before slot 2, storm over 3-4, Morse before slot 5', () => {
    expect(NIGHT_1.events.map((e) => e.id)).toEqual(['n1_board', 'n1_tube', 'n1_morse', 'n1_storm']);
    expect(ids(eventsDue(NIGHT_1, none, 1, 0.34, 'record'))).toEqual([]);
    expect(ids(eventsDue(NIGHT_1, none, 1, 0.35, 'record'))).toEqual(['n1_tube']);
    expect(ids(eventsDue(NIGHT_1, new Set(['n1_tube']), 2, 0, 'between'))).toEqual(['n1_board']);
    expect(ids(eventsDue(NIGHT_1, new Set(['n1_tube', 'n1_board']), 5, 0, 'between'))).toEqual(['n1_morse']);
    expect(eventsOf(NIGHT_1, 'storm')[0].slots).toEqual([3, 4]);
    expect(eventsOf(NIGHT_1, 'morse')[0].sender).toBeUndefined();
  });

  it('night 2: the board before slot 1, tube 40% into slot 2, Morse from Teddy before slot 3, squall over 4-5', () => {
    expect(ids(eventsDue(NIGHT_2, none, 1, 0, 'between'))).toEqual(['n2_board']);
    expect(ids(eventsDue(NIGHT_2, new Set(['n2_board']), 2, 0.4, 'talk'))).toEqual(['n2_tube']);
    expect(ids(eventsDue(NIGHT_2, new Set(['n2_board', 'n2_tube']), 3, 0, 'between'))).toEqual(['n2_morse']);
    expect(eventsOf(NIGHT_2, 'morse')[0]).toMatchObject({ word: 'SPOOL', seconds: 50, sender: 'teddy' });
    expect(eventsOf(NIGHT_2, 'tube')[0].socket).toBe(4);
    expect(eventsOf(NIGHT_2, 'storm')[0].slots).toEqual([4, 5]);
  });
});
