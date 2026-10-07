// Screenshot and smoke-run tool.
//
//   npm run shots            -> every shot below, PNGs in shots/
//   npm run shots -- booth   -> only shots whose name matches the regex "booth"
//
// Starts a Vite dev server, drives the game in headless Chromium, and fails
// (exit code 1) if the page logs any error. The game exposes window.__deadair
// so this script can wait for a phase instead of guessing at timings.
//
// Chromium: uses Playwright's browser. In environments with a preinstalled
// Chromium set CHROMIUM_PATH (e.g. /opt/pw-browsers/chromium-1194/chrome-linux/chrome).
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const filter = process.argv[2] ?? '';

/** Wait until the game has reported `phase` at least once. */
const seen = (page, phase, timeout) =>
  page.waitForFunction((p) => window.__deadair && window.__deadair.phasesSeen.includes(p), phase, { timeout, polling: 100 });

/** Click the dawn ledger's last-page button (SIGN ON: NIGHT N / START OVER), in game coordinates 432,326. */
async function clickAgain(page) {
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + (432 / 640) * box.width, box.y + (326 / 360) * box.height);
}

/** The whole campaign on ?auto: Night 1 through Night 6, pressing on at each dawn. */
async function campaign(page) {
  for (let n = 1; n <= 5; n++) {
    await seen(page, `dawn-letter-night-${n}`, 900000);
    await page.waitForTimeout(1200);
    await clickAgain(page);
    await page.waitForFunction((k) => window.__deadair?.data.nightOnAir === k, n + 1, { timeout: 30000, polling: 100 });
    console.log(`     night ${n} done`);
  }
}

/** After the last dawn's numbers page: the headline it printed, then the letter and START OVER. */
async function campaignEnd(page) {
  const head = await page.evaluate(() => window.__deadair?.data.result?.headline);
  if (!head?.text) throw new Error('no headline on the Night 6 dawn');
  console.log(`     headline: ${head.text} / ${head.sub}`);
  await seen(page, 'dawn-letter-night-6', 60000);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/16a-campaign-letter.png' });
  await clickAgain(page);
  await page.waitForFunction(() => window.__deadair?.data.nightOnAir === 1, null, { timeout: 30000, polling: 100 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/16b-campaign-start-over.png' });
  console.log('     START OVER: back to Night 1');
}

/** After a climax shot: wait for the climax to end, and check how it went. */
const climaxEnds = (result) => async (page) => {
  await seen(page, `climax-${result}`, 120000);
  const got = await page.evaluate(() => window.__deadair?.data.climax?.result);
  if (got !== result) throw new Error(`the climax ended ${got}, not ${result}`);
  console.log(`     climax: ${got}`);
};
/** ESC pauses the show; nothing may happen for a few seconds; the shot is of the overlay. */
async function pauseSteps(page) {
  await page.keyboard.press('Escape');
  await seen(page, 'paused', 5000);
  await page.waitForTimeout(400);
  const count = () => page.evaluate(() => window.__deadair.phasesSeen.length);
  const before = await count();
  await page.waitForTimeout(3000);
  if ((await count()) !== before) throw new Error('the show moved on while paused');
  if (!(await page.evaluate(() => window.__deadair.data.paused))) throw new Error('not paused');
}

/** ESC again: the show goes on and still reaches dawn. */
async function pauseAfter(page) {
  await page.keyboard.press('Escape');
  await seen(page, 'resumed', 5000);
  await seen(page, 'dawn', 240000);
  console.log('     resumed, and reached dawn');
}

/**
 * Each shot: open url (after putting `storage` in localStorage), run `drive` if any, wait until
 * the game reports `phase`, settle, run `steps` if any (it may press keys; the shot is taken
 * after it), then capture (and run `after`, which may take more shots).
 */
const SHOTS = [
  { name: '00-boot', query: '?mute', phase: 'boot', settle: 800 },
  { name: '01-title', query: '?mute', phase: 'title', settle: 1500 },
  { name: '02-booth-prep', query: '?mute&scene=booth', phase: 'prep', settle: 1500 },
  { name: '03-booth-prep-filled', query: '?mute&scene=booth&auto', phase: 'prep-filled', settle: 800 },
  // The render scale: the suite runs at 1 (headless software rendering crawls at 2); this one shot is the sharp look.
  { name: '03a-booth-prep-hd', query: '?mute&scene=booth&auto&res=2', phase: 'prep-filled', settle: 800 },
  { name: '04-booth-live', query: '?mute&scene=booth&auto&fast', phase: 'live', settle: 2500 },
  { name: '04a-booth-needle', query: '?mute&scene=booth&auto&fast', phase: 'needle', settle: 450, timeout: 90000 },
  { name: '04b-booth-record', query: '?mute&scene=booth&auto&fast', phase: 'record', settle: 1500, timeout: 90000 },
  { name: '04c-booth-tube', query: '?mute&scene=booth&auto&fast', phase: 'tube', settle: 300, timeout: 90000 },
  // ESC mid-show: the overlay, with the volume sliders, and the show frozen under it.
  { name: '04e-booth-paused', query: '?mute&scene=booth&auto&fast', phase: 'live', settle: 1500, steps: pauseSteps, after: pauseAfter, timeout: 90000 },
  // The first needle of a run is hinted.
  { name: '04f-booth-hint', query: '?mute&scene=booth&auto&fast', phase: 'hint:needle', settle: 300, timeout: 90000 },
  // ?auto opens the desk once during the first record, and closes it 1.5 s later.
  { name: '04d-booth-desk', query: '?mute&scene=booth&auto&fast', phase: 'desk', settle: 600, timeout: 90000 },
  { name: '05-booth-switchboard', query: '?mute&scene=booth&auto&fast', phase: 'switchboard', settle: 700, timeout: 90000 },
  { name: '05-booth-switchboard-confide', query: '?mute&scene=booth&auto&fast', phase: 'confide', settle: 60, timeout: 90000 },
  { name: '05a-booth-call', query: '?mute&scene=booth&auto&fast', phase: 'call', settle: 900, timeout: 90000 },
  { name: '05b-booth-dump', query: '?mute&scene=booth&auto&fast', phase: 'dump', settle: 150, timeout: 90000 },
  { name: '05c-booth-storm', query: '?mute&scene=booth&auto&fast', phase: 'storm', settle: 900, timeout: 120000 },
  { name: '05e-booth-carrier', query: '?mute&scene=booth&night=2&auto&fast&drift', phase: 'carrier', settle: 1500, timeout: 150000 },
  { name: '05d-booth-morse', query: '?mute&scene=booth&auto&fast', phase: 'morse', settle: 2300, timeout: 150000 },
  { name: '06-other-station', query: '?mute&scene=booth&auto&fast', phase: 'other-station', settle: 2500, timeout: 180000 },
  { name: '07-dawn-numbers', query: '?mute&scene=booth&auto&fast', phase: 'dawn', settle: 2200, timeout: 240000 },
  { name: '07a-dawn-notices', query: '?mute&scene=dawn&auto', phase: 'dawn-notices', settle: 1200, timeout: 90000 },
  { name: '08-dawn-stories', query: '?mute&scene=dawn&auto', phase: 'dawn-page-1', settle: 3600 },
  { name: '09-dawn-letter', query: '?mute&scene=dawn&auto', phase: 'dawn-letter', settle: 1200, timeout: 90000 },
  { name: '10-night2-prep', query: '?mute&scene=booth&night=2&auto', phase: 'prep-filled', settle: 800 },
  { name: '11-night2-switchboard', query: '?mute&scene=booth&night=2&auto&fast', phase: 'switchboard', settle: 700, timeout: 90000 },
  // The second board of Night 2, ringing over the late record.
  { name: '11a-night2-board-late', query: '?mute&scene=booth&night=2&auto&fast', phase: 'switchboard:n2_board_late', settle: 700, timeout: 150000 },
  { name: '12-night2-morse', query: '?mute&scene=booth&night=2&auto&fast', phase: 'morse', settle: 2300, timeout: 150000 },
  { name: '13-night2-dawn', query: '?mute&scene=booth&night=2&auto&fast', phase: 'dawn-page-1', settle: 3600, timeout: 300000 },
  // ?drift leans toward 1250 in the squall: the town hears the other carrier.
  { name: '13a-night2-dawn-drift', query: '?mute&scene=booth&night=2&auto&fast&drift', phase: 'dawn-page-1', settle: 3600, timeout: 300000 },
  { name: '14-night2-letter', query: '?mute&scene=dawn&night=2&auto', phase: 'dawn-letter', settle: 1200, timeout: 90000 },
  // A run saved after Night 1: the title offers to continue it.
  { name: '15-continue', query: '?mute', phase: 'title', settle: 1500, storage: { 'deadair.save': JSON.stringify({ version: 1, index: 1, town: { flags: ['n1_teddy_found'] } }) } },
  // The whole campaign, Night 1 to the last dawn (its headline), then START OVER.
  { name: '16-campaign', query: '?mute&scene=booth&auto&fast', phase: 'dawn-headline', settle: 2500, timeout: 600000, drive: campaign, after: campaignEnd },
  // Nights 3-6, each from ?night=N (earlier nights as their ?auto shows).
  ...[3, 4, 5, 6].flatMap((n) => [
    { name: `${n}0-night${n}-prep`, query: `?mute&scene=booth&night=${n}&auto&fast`, phase: 'prep-filled', settle: 800 },
    { name: `${n}1-night${n}-switchboard`, query: `?mute&scene=booth&night=${n}&auto&fast`, phase: 'switchboard', settle: 700, timeout: 90000 },
    ...(n === 4 ? [{ name: '41a-night4-override', query: '?mute&scene=booth&night=4&auto&fast', phase: 'override', settle: 1500, timeout: 120000 }] : []),
    // The climax: ?auto holds the dial through it (jammed); ?counter talks over it instead.
    ...(n === 6 ? [
      { name: '61a-night6-climax', query: '?mute&scene=booth&night=6&auto&fast', phase: 'climax', settle: 1500, timeout: 240000, after: climaxEnds('jammed') },
      { name: '61b-night6-counter', query: '?mute&scene=booth&night=6&auto&fast&counter', phase: 'climax-counter', settle: 1200, timeout: 240000, after: climaxEnds('countered') },
    ] : []),
    { name: `${n}2-night${n}-dawn`, query: `?mute&scene=booth&night=${n}&auto&fast`, phase: 'dawn-page-1', settle: 3600, timeout: 300000 },
    ...(n === 6 ? [{ name: '62-night6-dawn-counter', query: '?mute&scene=booth&night=6&auto&fast&counter', phase: 'dawn-page-1', settle: 3600, timeout: 300000 }] : []),
    { name: `${n}3-night${n}-letter`, query: `?mute&scene=booth&night=${n}&auto&fast`, phase: 'dawn-letter', settle: 1200, timeout: 360000 },
  ]),
];

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});

mkdirSync('shots', { recursive: true });
let failures = 0;

for (const shot of SHOTS.filter((s) => new RegExp(filter).test(s.name))) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  if (shot.storage) {
    await page.addInitScript((items) => {
      for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
    }, shot.storage);
  }
  const started = Date.now();
  try {
    await page.goto(base + shot.query + (shot.query.includes('res=') ? '' : '&res=1'));
    if (shot.drive) await shot.drive(page);
    await seen(page, shot.phase, shot.timeout ?? 60000);
    await page.waitForTimeout(shot.settle ?? 500);
    if (shot.steps) await shot.steps(page);
    await page.screenshot({ path: `shots/${shot.name}.png` });
    if (shot.after) await shot.after(page);
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (errors.length) {
      failures++;
      console.log(`FAIL ${shot.name} (${secs}s): ${errors.length} console error(s)`);
      errors.slice(0, 5).forEach((e) => console.log('   ', e));
    } else {
      console.log(`ok   ${shot.name} (${secs}s)`);
    }
  } catch (e) {
    failures++;
    await page.screenshot({ path: `shots/${shot.name}-FAILED.png` }).catch(() => {});
    const seen = await page.evaluate(() => window.__deadair?.phasesSeen ?? []).catch(() => []);
    console.log(`FAIL ${shot.name}: ${e.message.split('\n')[0]} | phases seen: ${seen.join(', ')}`);
    errors.slice(0, 5).forEach((err) => console.log('   ', err));
  }
  await page.close();
}

await browser.close();
await server.close();
console.log(failures ? `\n${failures} shot(s) failed` : '\nall shots ok');
process.exit(failures ? 1 : 0);
