# Handoff — Dead Air

For the next agent picking this up. Read this, then `CLAUDE.md` (commands, layout, rules),
`DESIGN.md` (the game), and `TODO.md` (the live task list). Last updated 2026-10-02.

## What this is

A small browser game: you run WLMP 1260 AM, "the Lamp", the last radio station in Port
Vesper, a post-collapse town on Lake Erie. You build a night's show from cards, run it
live, and what you air changes the town. After sign-off, another station on your frequency
reads back what you chose *not* to air. Phaser 4 + TypeScript + Vite, Vitest for rules.

**Milestone status:** M0 (scaffold) and M1 (One Night) are done and playtested by the
owner. Night 1 plays real public-domain 78s. The booth mini-games (the main playtest
complaint) are built but **not yet playtested by the owner**. Next work is the owner's
call; see "What to do next".

## The owner

- Anthony (GitHub `adilisio`). Directs, playtests and decides; AI writes the code.
  Makes the naming and design calls. Wants a **light process**: one design doc, one TODO,
  commit per feature, a playable build every session. No briefs, gates or agent lanes.
- Has other AI-built games (FO5 and DEAD CURRENT in Unreal, Dust & Frequency and Bug Defense
  in vanilla JS, Y2K Bio-Punk in Godot). Recurring tastes: radio and music as gameplay,
  post-apocalypse with personality, retro tech, Great Lakes / Cleveland settings, lighthouses.
  Don't change those repos from here.
- The owner's PC runs the game smoothly. They play in Chrome/Edge.

## Decisions already made (don't reopen without asking)

| Topic | Decision |
| --- | --- |
| Engine | Phaser **4** (not 3) + TypeScript + Vite, browser. Pixel art painted in code, real lights, bloom/CRT post. |
| Scope / process | A few weeks to a finished game. Light process. |
| Town | **Port Vesper**, Ohio. |
| Station | WLMP 1260 AM, **"the Lamp"** (owner: keep it). |
| Factions | **Netters** (fishing families), **the Chapel** (church: infirmary and school; kind, powerful, certain), **the Linemen** (engineers restringing the dead lines to bring the power back). The owner asked that not every faction be blue-collar. |
| Music | Real public-domain 78s (US recordings published before 1926; songs before 1931). |
| Voices | Browser TTS first; human-sounding voices are the goal (owner may record lines). |
| Daytime (M2) | All three modes, each small, on one top-down engine: town walk, map + travel event, short ruin run. |
| Still open | The DJ's name. What the Other Station is (owner decides; don't explain it in content). |

## Owner's playtest of M1 (their words, condensed)

- Made it to the end; sound comes through well. **Static too loud at times** → fixed (about 40% quieter).
- **Music should have singing** → fixed with real 78s (quartets, choir, Marion Harris).
- **Narration should sound human**; "a good start".
- **Tuning + cueing is "mildly fun", "a little repetitive"**. Suggested *different mini-games
  through the night instead of just the one*. → Built (2026-10-02): storms, needle drop,
  tube swap, switchboard + dump, Morse. Waiting on the owner's playtest.

## Current state of the code

- The 2026-10-02 session ran on the owner's Windows PC. It started with GitHub in sync at
  `91cafb7`, then added one commit per booth task (`ad3c0cf` storms, `f233fff` needle,
  `c209871` tube, `96f4cd4` switchboard + dump, `51c8ae4` Morse) plus a docs commit. **These
  were not pushed**; `git status -sb` shows whether the owner has pushed since.
- Verified at handoff: 79 tests pass, `npm run build` clean, `npm run shots` (17 shots,
  full night headless) green with no console errors.

### How it fits together

- `src/sim/` — pure rules, no Phaser. `resolver.ts` turns a rundown + live performance
  (`ShowPerformance`: per-slot signal, dead air, calls, needle drops, tube seconds, Morse)
  into the next town state and dawn lines. Rules: audience shares per segment, reach
  checks, breather/panic, ad fatigue, dedications, lies unravel at dawn, plus each booth
  task's outcome. `tuning.ts` is the transmitter drift model.
  - Booth tasks, one file each with its pure logic and constants: `storm.ts` (wind per
    slot, storm report), `needle.ts` (arm sweep, groove band, late skip), `tube.ts`
    (`TubeFault` state machine), `calls.ts` (call results, the dump delay), `morse.ts`
    (code table, keying timeline/tape, `MorseCopy`, chart). Tests in `tests/<name>.test.ts`.
- `src/data/night1.ts` — Night 1's 13 cards, the switchboard (three lines), the storm,
  tube and Morse schedule, the Other Station config, and the `?auto` / `?scene=dawn`
  rundowns (tested for validity). `records.json` + `records.ts` — the record catalog: 11
  real 78s and 5 synthesized stand-ins.
- `src/audio/` — `engine.ts` (one Web Audio graph: radio chain, static/whistle/hum by tuning
  error, record playback with stand-in fallback, phone ring, Other Station drone, level meter),
  `pressings.ts` + `render.ts` (seeded stand-in tunes), `voice.ts` (speechSynthesis with a
  timed fallback).
- `src/scenes/` — Boot (paints textures, waits for the VT323 font), Title, **Booth** (prep →
  live → sign-off → Other Station; owns the live state machine and drives each booth task,
  with an `?auto` player for every one), Dawn (the 3–4 page ledger).
  `fx.ts`: post effects and `splitCameras` (UI on a clean second camera).
- `src/ui/` — `RundownBuilder` (prep), `LiveHud` (teleprompter with a reveal mode for
  callers, storm-only tuning gauge, cue box, running-order chips), one panel per task
  (`NeedlePanel`, `TubePanel`, `Switchboard`, `MorsePanel`), `widgets`.
- Live controls: A/D tune (storms), SPACE cue / drop needle / leave switchboard, Q/W/E
  spare tubes, 1/2/3 + ENTER switchboard, X dump, letters for Morse.
- `tools/shots.mjs` — the eyes. Drives the game with `?auto&fast&mute`, waits on phases
  from `window.__deadair`, saves PNGs, fails on any console error. **Look at the PNGs**
  after visual changes; this caught several real bugs.
- `tools/fetch-records.mjs` (`npm run records`) — downloads catalog records from
  archive.org, converts with ffmpeg, writes `public/records/CREDITS.md`.

### Gotchas learned the hard way

- **Phaser 4 APIs differ from 3.** Filters replace FX; lights via `setLighting(true)`;
  bloom is `Phaser.Actions.AddEffectBloom`. Agent docs ship in `node_modules/phaser/skills/`.
- **Phaser 4's vignette darkens from the center out.** Keep strength around 0.2. The original
  "everything is too dark" problem was the vignette, not the lighting.
- **UI must go through `ui()` from `splitCameras`** or it renders twice (once with CRT smear).
- Text glyphs: stick to ASCII in UI strings (VT323 lacks some symbols like `●` and `…`).
- `speechSynthesis` audio **cannot** be routed through Web Audio, so TTS can't get the radio
  filter. The upgrade is a TTS that renders buffers (e.g. Kokoro in the browser) or recorded files.
- Headless rendering of stand-in records is slow here (3–9 s each); the game pre-renders
  records as soon as they're placed in the rundown.
- `BoothScene` already has a `needles` field (the VU/dial/clock graphics). Vite serves code
  with type errors, so a name clash there shows up only in `npm run typecheck`, not in shots.
  Run typecheck before trusting a shot.

### Owner's-PC gotchas (Windows)

- Playwright's own Chromium isn't installed; point shots at Chrome:
  `CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npm run shots`.
- No Python in Git Bash. Source files are CRLF, so multi-line string replacements from
  `node -e` scripts miss; use the editor tools or `sed` for one-liners.

### Cloud-session gotchas

- **Pushing from the cloud session was denied** by the session's permission settings, even
  to a feature branch. Previous handoffs used `git bundle` files the owner pulled and pushed
  from their PC (`git pull <bundle> main` then `git push`). Ask before trying again.
- Network allowlist must include **both `archive.org` and `*.archive.org`** for records.
  Node's `fetch` doesn't get through the proxy; the fetch tool falls back to `curl`.
- Screenshots: `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run shots`.

## What to do next (ask the owner which; recommendation first)

1. **Playtest the booth tasks with the owner** (recommended), then tune or cut. Night 1's
   shape: dusk has the needle drop and a tube blowing mid-record; late opens on the
   switchboard (Mrs. Okafor, a nameless slanderer to dump, Lottie's hello) and a storm
   rolls in for slots 3–4; the small hours bring Morse ("HELP" from an ice shanty). The
   knobs are listed in `TODO.md`. Open design questions for the owner:
   - The handoff idea was that Morse *unlocks a card for later*; with no Night 2 yet it
     resolves at dawn instead. Revisit when there's a next night to unlock into.
   - Whether some tasks should move between segments or vary night to night.
   Also pending from the playtest list: volume sliders (music / voice / static) and pause.
2. **Human-sounding voices.** (a) A drop-in folder for the owner's recorded lines (e.g.
   `public/voice/<card-id>.mp3`, used when present, routed through the radio chain).
   (b) In-browser neural TTS (Kokoro via `kokoro-js` was the idea) rendering to buffers,
   so voices also get the radio filter. Untested; it downloads ~80 MB of model on first
   run, and its host will need allowing in the cloud environment.
3. **M2: One Day** — town walk, map with a travel event, one ruin run; outputs are cards
   and records for the night. See `DESIGN.md`.
4. Content: five downloaded records are unused (`rocked_cradle_deep`, `home_over_there`,
   `how_come_you_do_me`, `meet_me_in_dreamland`, `old_mill_stream`), ready for Night 2.
   A Bessie Smith original pressing would be a good Linemen record (the one found was a
   modern Wolf reissue, so it was skipped).

## Known uncertainties

- Nobody in-session could listen to audio. The owner confirmed the original build sounds
  right; the real 78s are verified only to decode with even loudness. "Swanee Butterfly"
  may be instrumental; the Ballard and Nair record's style is unconfirmed.
- Marion Harris's label: archive.org says "Simolian", catalog 2610 (left as listed).
- `public/records/` adds about 23 MB to the repo. Trimming files to the ~75 s the game
  plays would halve it, if that ever matters.
