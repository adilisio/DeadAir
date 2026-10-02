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

/** Each shot: open url, wait until the game reports `phase`, optionally run steps, then capture. */
const SHOTS = [
  { name: '00-boot', query: '?mute', phase: 'boot', settle: 800 },
  { name: '01-title', query: '?mute', phase: 'title', settle: 1500 },
  { name: '02-booth-prep', query: '?mute&scene=booth', phase: 'prep', settle: 1500 },
  { name: '03-booth-prep-filled', query: '?mute&scene=booth&auto', phase: 'prep-filled', settle: 800 },
  { name: '04-booth-live', query: '?mute&scene=booth&auto&fast', phase: 'live', settle: 2500 },
  { name: '04b-booth-record', query: '?mute&scene=booth&auto&fast', phase: 'record', settle: 1500, timeout: 90000 },
  { name: '05-booth-caller', query: '?mute&scene=booth&auto&fast', phase: 'caller', settle: 600 },
  { name: '05b-booth-storm', query: '?mute&scene=booth&auto&fast', phase: 'storm', settle: 900, timeout: 120000 },
  { name: '06-other-station', query: '?mute&scene=booth&auto&fast', phase: 'other-station', settle: 2500, timeout: 180000 },
  { name: '07-dawn-numbers', query: '?mute&scene=booth&auto&fast', phase: 'dawn', settle: 2200, timeout: 240000 },
  { name: '08-dawn-stories', query: '?mute&scene=dawn&auto', phase: 'dawn-page-1', settle: 3600 },
  { name: '09-dawn-letter', query: '?mute&scene=dawn&auto', phase: 'dawn-letter', settle: 1200, timeout: 90000 },
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

  const started = Date.now();
  try {
    await page.goto(base + shot.query);
    await page.waitForFunction(
      (phase) => window.__deadair && window.__deadair.phasesSeen.includes(phase),
      shot.phase,
      { timeout: shot.timeout ?? 60000, polling: 100 },
    );
    await page.waitForTimeout(shot.settle ?? 500);
    await page.screenshot({ path: `shots/${shot.name}.png` });
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
