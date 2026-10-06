// Renders every spoken line to public/voice/ with Kokoro TTS (open weights, kokoro-js).
//
//   npm run voices                  -> render lines that don't have a file yet
//   npm run voices -- --list        -> print what would be rendered, then exit
//   npm run voices -- --only grace  -> only lines whose person id or text matches the regex
//   npm run voices -- --force       -> re-render even if a file exists
//
// One voice per person (src/data/people.ts). Each line's id hashes the voice and the words
// (src/audio/lines.ts), so editing a script renders just that line again. With ffmpeg on the
// PATH, files are loudness-evened mono MP3s at 32 kbps; without it, the WAV is kept.
//
// The model (~330 MB, fp32) downloads on first run into transformers.js' cache inside
// node_modules. Point KOKORO_CACHE at an existing cache folder to reuse one.

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NIGHTS } from '../src/data/nights';
import { PEOPLE } from '../src/data/people';
import { voiceLines, parseVoiceIndex, type VoiceIndex, type VoiceLine } from '../src/audio/lines';

const OUT = 'public/voice';
const INDEX = join(OUT, 'index.json');
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';

const args = process.argv.slice(2);
const force = args.includes('--force');
const list = args.includes('--list');
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? new RegExp(args[onlyAt + 1] ?? '', 'i') : null;

mkdirSync(OUT, { recursive: true });
const index: VoiceIndex = existsSync(INDEX) ? parseVoiceIndex(JSON.parse(readFileSync(INDEX, 'utf8'))) : { version: 1, lines: {} };
const saveIndex = () => {
  const sorted = Object.fromEntries(Object.entries(index.lines).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(INDEX, JSON.stringify({ version: 1, lines: sorted }, null, 2) + '\n');
};

const all = voiceLines(NIGHTS);
const todo = all.filter((l) => {
  if (only && !only.test(l.person) && !only.test(l.text)) return false;
  const e = index.lines[l.id];
  return force || !e || !existsSync(join(OUT, e.file));
});
const stale = Object.keys(index.lines).filter((id) => !all.some((l) => l.id === id));

console.log(`${all.length} spoken lines; ${todo.length} to render.`);
if (stale.length) console.log(`${stale.length} index entries no longer match any line (left in place): ${stale.join(' ')}`);
if (list) {
  for (const l of todo) console.log(`${l.id}  ${l.person.padEnd(7)} ${l.text.length > 90 ? l.text.slice(0, 87) + '...' : l.text}`);
  process.exit(0);
}
if (!todo.length) process.exit(0);

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
if (!hasFfmpeg) console.log('ffmpeg not found: keeping WAV files (bigger, unnormalized).');

const { KokoroTTS } = await import('kokoro-js');
if (process.env.KOKORO_CACHE) {
  const { env } = await import('@huggingface/transformers');
  env.cacheDir = process.env.KOKORO_CACHE;
}
const t0 = Date.now();
console.log(`Loading ${MODEL} (fp32, cpu)...`);
const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: 'fp32', device: 'cpu' });
console.log(`Model loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s.`);

type Voice = Parameters<typeof tts.generate>[1] extends { voice?: infer V } | undefined ? V : never;

/** Kokoro reads at most ~510 phonemes at a time; long scripts go in sentence groups. */
function chunks(text: string): string[] {
  if (text.length <= 320) return [text];
  const sentences = text.match(/[^.!?]+[.!?]*["')]*\s*/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + s).length > 300) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function render(line: VoiceLine): Promise<{ samples: Float32Array; rate: number }> {
  const v = PEOPLE[line.person].voice;
  const parts: Float32Array[] = [];
  let rate = 24000;
  for (const [k, text] of chunks(line.text).entries()) {
    const audio = await tts.generate(text, { voice: v.kokoro as Voice, speed: v.rate });
    rate = audio.sampling_rate;
    if (k > 0) parts.push(new Float32Array(Math.round(rate * 0.12)));
    parts.push(audio.audio);
  }
  const samples = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    samples.set(p, o);
    o += p.length;
  }
  return { samples, rate };
}

function wav(samples: Float32Array, rate: number): Buffer {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}

let failed = 0;
for (const [n, line] of todo.entries()) {
  const t1 = Date.now();
  const tag = `[${n + 1}/${todo.length}] ${line.id} ${line.person}`;
  try {
    const { samples, rate } = await render(line);
    const seconds = Math.round((samples.length / rate) * 1000) / 1000;
    const tmp = join(tmpdir(), `deadair-voice-${line.id}.wav`);
    writeFileSync(tmp, wav(samples, rate));
    let file = `${line.id}.mp3`;
    if (hasFfmpeg) {
      const ff = spawnSync('ffmpeg', [
        '-y', '-loglevel', 'error', '-i', tmp,
        // Even loudness, like the records (tools/fetch-records.mjs).
        '-af', 'loudnorm=I=-18:TP=-2:LRA=11',
        '-ac', '1', '-ar', '22050', '-b:a', '32k', join(OUT, file),
      ], { stdio: ['ignore', 'ignore', 'inherit'] });
      if (ff.status !== 0) throw new Error('ffmpeg failed');
    } else {
      file = `${line.id}.wav`;
      copyFileSync(tmp, join(OUT, file));
    }
    rmSync(tmp, { force: true });
    index.lines[line.id] = { file, seconds, person: line.person };
    saveIndex();
    console.log(`${tag}  ${seconds.toFixed(1)} s audio in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  } catch (e) {
    failed++;
    console.error(`${tag}  FAILED: ${e instanceof Error ? e.message : e}`);
  }
}
saveIndex();
console.log(`Done in ${((Date.now() - t0) / 60000).toFixed(1)} min. ${todo.length - failed} rendered, ${failed} failed.`);
process.exit(failed ? 1 : 0);
