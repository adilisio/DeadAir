// Probe a night: play it headless on ?auto and print what the resolver made of it (per-slot
// signal, the climax, the night's flags, trust, listeners, every dawn line, the headline).
// For checking content without reading PNGs. Usage: `npm run probe -- 6` (night 1-6), or pass
// extra switches: `npm run probe -- 6 counter drift`.
import { chromium } from 'playwright';
import { createServer } from 'vite';

const [night = '1', ...extra] = process.argv.slice(2);
const query = `?mute&scene=booth&night=${night}&auto&fast` + extra.map((s) => `&${s}`).join('');

const server = await createServer({ server: { port: 0 }, logLevel: 'silent' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base + query);
await page.waitForFunction(() => window.__deadair && window.__deadair.phasesSeen.includes('dawn-page-1'), null, { timeout: 300000, polling: 200 });
const d = await page.evaluate(() => {
  const data = window.__deadair.data;
  const r = data.result;
  const n = data.nightOnAir;
  return {
    signal: data.signal,
    climax: data.climax ?? null,
    rundown: data.rundown,
    flags: r.after.flags.filter((f) => f.startsWith(`n${n}_`)),
    aired: r.after.flags.filter((f) => f.startsWith('aired_') || f.startsWith('other_aired_')),
    stats: { morale: r.after.morale, safety: r.after.safety, credibility: r.after.credibility, listeners: r.after.listeners, chits: r.after.chits, trust: r.after.trust },
    lines: r.lines.map((l) => `${l.tone}: ${l.text}`),
    headline: r.headline ?? null,
    letter: r.letter,
  };
});
console.log(`night ${night}  ${query}`);
console.log('signal  ', d.signal.map((x) => x.toFixed(2)).join('  '));
console.log('rundown ', d.rundown.join(' '));
if (d.climax) console.log('climax  ', JSON.stringify(d.climax));
console.log('flags   ', d.flags.join(' '));
console.log('aired   ', d.aired.join(' '));
console.log('town    ', JSON.stringify(d.stats));
console.log('ledger');
for (const l of d.lines) console.log('  -', l);
if (d.headline) console.log('headline', d.headline.text, '/', d.headline.sub);
if (d.letter) console.log('letter  ', typeof d.letter === 'string' ? d.letter : JSON.stringify(d.letter));
if (errors.length) console.log('console errors:\n' + errors.join('\n'));
await browser.close();
await server.close();
process.exit(errors.length ? 1 : 0);
