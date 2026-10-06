// Real-pace smoke: plays Night 1 like a person would (no ?auto), logging phases, decisions
// and the dawn result. `npm run play` with the dev server up at :5173. Headless Chromium
// runs a few frames a second, so game time is slower than the clock here; the driver waits
// on game state, not timers, wherever it matters.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const t0 = Date.now();
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', ...a);
page.on('pageerror', (e) => log('PAGEERROR', String(e)));
page.on('console', (m) => m.type() === 'error' && log('CONSOLE', m.text()));
await page.goto('http://localhost:5173/?scene=booth&mute&reset');
await page.waitForFunction(() => window.__deadair?.phasesSeen.includes('prep'));
await page.waitForTimeout(1500);
const S = () => `window.__deadair.data.game.scene.getScene('Booth')`;
const ev = (js) => page.evaluate(js);
await ev(`${S()}.builder.fill(['news_wiring','rec_hymn','warn_dogs','rec_harris','warn_ice','rec_deep'])`);
await page.waitForTimeout(800);
await ev(`${S()}.startShow(['news_wiring','rec_hymn','warn_dogs','rec_harris','warn_ice','rec_deep'])`);
log('went live');
let last = '';
let board = null; // state machine for the switchboard
let needleAt = 0, tubeDone = new Set(), morseTyped = 0, hedged = false, swapped = false, held = null;
while (Date.now() - t0 < 15 * 60 * 1000) {
  let s; try { s = await ev(`(() => { const sc = ${S()}; const h = window.__deadair; return {
    phase: h.phase, seen: h.phasesSeen.slice(-1)[0], idx: sc.idx, playing: sc.playing, cued: sc.cued,
    waiting: sc.waitingSince !== null, remaining: sc.playing ? sc.itemDuration - (sc.time.now - sc.itemStart) / 1000 : null,
    needle: !!sc.needle, tube: sc.tube ? { id: sc.tube.state, need: sc.tube.need, spares: sc.tube.spares, fixed: sc.tube.fixed } : null,
    board: sc.board ? { states: sc.board.states, onAir: sc.board.onAir, selected: sc.board.selected } : null,
    morse: sc.morse ? { word: sc.morse.copy.word, typed: sc.morse.copy.typed } : null,
    storm: sc.storm, err: sc.tuning.error, desk: !!sc.desk, phaseDone: sc.phase, nextKind: sc.cards[sc.idx + 1]?.kind, nextId: sc.cards[sc.idx + 1]?.id,
  } })()`); } catch (e) { log('evaluate failed', String(e).slice(0, 120)); await page.waitForTimeout(1000); continue; }
  if (s.phase !== last) { last = s.phase; log('phase', s.phase); }
  if (s.phaseDone === 'other' || s.phaseDone === 'done') { log('loop exit: scene phase', s.phaseDone); break; }
  // Needle: drop about a second after the arm starts.
  if (s.needle) { if (!needleAt) needleAt = Date.now(); if (Date.now() - needleAt > 950) { await page.keyboard.press('Space'); log('needle dropped'); needleAt = -1; } }
  else needleAt = 0;
  // Tube: a wrong pick first; then the right one as soon as the drawer takes a pick again.
  if (s.tube && !s.tube.fixed && s.tube.id === 'blown') {
    const key = ['q', 'w', 'e']; const right = s.tube.spares.indexOf(s.tube.need);
    if (!tubeDone.has('wrong')) { const wrong = (right + 1) % s.tube.spares.length; await page.keyboard.press(key[wrong]); log('tube: wrong pick', s.tube.spares[wrong]); tubeDone.add('wrong'); }
    else if (!tubeDone.has('right')) { await page.keyboard.press(key[right]); log('tube: right pick', s.tube.need); tubeDone.add('right'); }
  }
  // Switchboard: listen to Grace long enough to hear the confide, put her on; then the anonymous man, dump him after he turns.
  if (s.board) {
    if (!board) { board = 'grace'; await page.keyboard.press('1'); log('board: listening to line 1'); await page.waitForTimeout(9000); await page.keyboard.press('Enter'); log('board: line 1 on air'); }
    else if (board === 'grace' && s.board.onAir === null && s.board.states[0] === 'done') { board = 'anon'; await page.keyboard.press('2'); await page.waitForTimeout(1500); await page.keyboard.press('Enter'); log('board: line 2 on air'); }
    else if (board === 'anon' && s.board.onAir === 1 && s.phase === 'call-turn') { await page.waitForTimeout(1200); await page.keyboard.press('x'); log('board: dumped line 2'); board = 'dumped'; }
    else if (board === 'dumped' && s.board.onAir === null) { await page.waitForTimeout(500); await page.keyboard.press('Space'); log('board: back to the show'); board = 'closed'; }
  }
  // Morse: type a letter every 1.4 s.
  if (s.morse && s.morse.typed.length < s.morse.word.length && Date.now() - morseTyped > 1400) { const ch = s.morse.word[s.morse.typed.length]; await page.keyboard.press(ch.toLowerCase()); log('morse typed', ch); morseTyped = Date.now(); }
  // Storm: ride the dial.
  if (s.storm) {
    const want = s.err > 0.08 ? 'a' : s.err < -0.08 ? 'd' : null;
    if (want !== held) { if (held) await page.keyboard.up(held); if (want) await page.keyboard.down(want); held = want; }
  } else if (held) { await page.keyboard.up(held); held = null; }
  // The desk: during the second record, swap the next item (warn_ice → whatever is first on the desk).
  if (!swapped && s.idx === 3 && s.playing && !s.board && !s.desk) { await page.keyboard.press('Tab'); await page.waitForTimeout(600); await page.keyboard.press('1'); log('desk: swapped the next item'); swapped = true; }
  // Cue: hedge the first news card, otherwise cue straight.
  if (!s.board && !s.needle && !s.desk) {
    if (s.waiting) { await page.keyboard.press('Space'); log('cued (late, dead air)'); }
    else if (s.playing && s.remaining !== null && s.remaining <= 7 && !s.cued && s.nextKind && s.nextKind !== 'record') {
      if (!hedged && s.nextId === 'news_wiring') { await page.keyboard.press('h'); hedged = true; log('cued HEDGED', s.nextId); }
      else { await page.keyboard.press('Space'); log('cued', s.nextId); }
    }
  }
  await page.waitForTimeout(400);
}
log('loop over; waiting for dawn'); const seen0 = await ev(`window.__deadair.phasesSeen.join(",")`); log('seen', seen0);
await page.waitForFunction(() => window.__deadair?.phasesSeen.includes('dawn'), null, { timeout: 240000 });
const r = await ev(`(() => { const r = window.__deadair.data.result; return { after: r.after, lines: r.lines.map(l => '[' + l.tone + '] ' + l.text), other: r.otherStation.script, dumped: r.otherStation.dumped, flags: r.after.flags } })()`);
log('DAWN');
console.log(JSON.stringify(r, null, 1));
await browser.close();
