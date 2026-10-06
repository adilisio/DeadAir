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
| Voices | Kokoro TTS rendered offline to files, one voice per person (`src/data/people.ts`), played through the radio chain; browser TTS only as a fallback. Owner may record lines (they drop into `public/voice/`). |
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
  `c209871` tube, `96f4cd4` switchboard + dump, `51c8ae4` Morse), pushed at `f0d40bb`.
  Then Night 2 and the run (one commit after that).
- Verified at handoff: 98 tests pass, `npm run build` clean, `npm run shots` (22 shots:
  Night 1 headless start to finish, Night 2 prep through letter) green with no console errors.
  Packet B (events, people, gates, save; 2026-10-06): 132 tests, 23 shots (adds
  `15-continue`), Nights 1 and 2 resolve exactly as before.
  Packet E (the Other Station, live; 2026-10-06): 181 tests, 25 shots (adds
  `05e-booth-carrier` and `13a-night2-dawn-drift`, both `?drift`).
- Runs: `src/run.ts` holds the run (night index, town, result); `startNight`, `finishNight`
  (keeps the result and saves), `nextNight` (saves), `resetRun`, `townBefore(n)` for
  `?night=N`, and the save: `saveRun` / `loadRun` / `savedRun` / `clearSave` on
  `localStorage['deadair.save']` (shape in `src/sim/save.ts`, `version: 1`; junk and
  missing fields fall back to the starting town). The title offers "continue: night N".
  `src/sim/nights.ts` has `gateOpen(gate, flags, { town, airedTonight })` (flags, `when`
  stat thresholds, `tonight` aired/not aired; a clause with no context is open),
  `openNight(night, town)`, `linesOpenNow(board, town, airedTonight)` and `letterText`.
  Each `NightDef` carries its own letter and `rundowns.auto` / `rundowns.demo`.
- Events: a night's booth tasks are `events: NightEvent[]` (switchboard, tube, morse,
  storm; any number of each, ids like `n1_board`). `src/sim/events.ts` has `eventsOf`,
  `eventsDue` (when each fires: between items, or a fraction into one; a board due during
  a record rings over it, during talk it waits) and `airedWhenBoardOpens`. `BoothScene`
  keeps a fired set, a board queue, pending tubes and a Morse queue, and `airedTonight`
  (also on the debug hook). The performance reports per event (`tubes`, `morse` by id).
- People: `TownState.people` counts each person's calls (aired / cut / dumped / ignored);
  the resolver sets `<person>_<count>` flags and `_2` once a count reaches two.

### How it fits together

- `src/sim/` — pure rules, no Phaser. `resolver.ts` turns a rundown + live performance
  (`ShowPerformance`: per-slot signal, dead air, calls, needle drops, tube seconds and Morse per event)
  into the next town state and dawn lines. Rules: audience shares per segment, reach
  checks, breather/panic, ad fatigue, dedications, lies unravel at dawn, plus each booth
  task's outcome. `tuning.ts` is the transmitter drift model.
  - Booth tasks, one file each with its pure logic and constants: `storm.ts` (wind per
    slot, storm report), `needle.ts` (arm sweep, groove band, late skip), `tube.ts`
    (`TubeFault` state machine), `calls.ts` (call results, the dump delay), `morse.ts`
    (code table, keying timeline/tape, `MorseCopy`, chart). Tests in `tests/<name>.test.ts`.
  - `intrusion.ts`: the Other Station during the show (`otherStation.intrusions` in the
    night data, not `events`). `carrier`: a second carrier at `OTHER_OFFSET` (-0.55, "1250")
    over some slots; `bleed(error, tubeStrength)` is how much of it comes through yours,
    `carrierForSlot`. `override` / `climax`: `intrusionsDue` (same timing rules as
    `eventsDue`), `overrideSeconds` (holding the dial shortens it), `overrideCard`, and the
    show clock (`clockText`). The resolver's `otherStationLive` turns `perf.bleed` and
    `perf.overrides` into cards the town heard on 1260 (`NightResult.otherAired`, flags
    `other_heard` and `other_aired_<card>`, lines that lead the ledger).
- `src/data/night1.ts` — Night 1's 13 cards, its events (`n1_board` with three lines,
  `n1_tube`, `n1_morse`, `n1_storm`), the Other Station config, and the `?auto` / `?scene=dawn`
  rundowns (tested for validity). `records.json` + `records.ts` — the record catalog: 11
  real 78s and 5 synthesized stand-ins.
- `src/audio/` — `engine.ts` (one Web Audio graph: radio chain, static/whistle/hum by tuning
  error, record playback with stand-in fallback, phone ring, Other Station drone, level meter;
  `setOtherGain` for the `other` channel and drones, `setCarrier` for the second whistle,
  `override(on)` to push the program and the station's voices under it),
  `pressings.ts` + `render.ts` (seeded stand-in tunes). Voices: `lines.ts` (pure: every
  spoken line and its id, a hash of voice + words), `voice.ts` (`speak()`: plays the line's
  pre-rendered file from `public/voice/` through `engine.playVoice` on a channel — `air` for
  the DJ, `phone` for callers on air, `handset` for listening in off air, `other` for the
  Other Station, which is the DJ's own files slowed and doubled — with proportional word
  timing for the teleprompter; falls back to speechSynthesis for lines with no file, and to
  a silent timed delay under `?fast`/`?mute`). Voices join the chain after the duck, so
  records duck under them, and tuning and tube faults reach them.
  `tools/voices.ts` (`npm run voices`) renders missing lines offline with Kokoro (kokoro-js,
  CPU, a little slower than real time) and ffmpeg; see `public/voice/README.md`.
- `src/scenes/` — Boot (paints textures, waits for the VT323 font), Title, **Booth** (prep →
  live → sign-off → Other Station; owns the live state machine and drives each booth task,
  with an `?auto` player for every one), Dawn (the 3–4 page ledger).
  `fx.ts`: post effects and `splitCameras` (UI on a clean second camera).
- `src/ui/` — `RundownBuilder` (prep), `LiveHud` (teleprompter with a reveal mode for
  callers and an override mode that keeps the station's own item behind it, a tuning gauge
  shown in storms, with two carriers or under an override, cue box, running-order chips), one panel per task
  (`NeedlePanel`, `TubePanel`, `Switchboard`, `MorsePanel`), `widgets`.
- Live controls: A/D tune (storms; held hard through an override, shortens it), SPACE cue /
  drop needle / leave switchboard, Q/W/E spare tubes, 1/2/3 + ENTER switchboard, X dump,
  letters for Morse. `?drift` (with `?auto`) holds the dial toward 1250 in storms.
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
- `speechSynthesis` audio **cannot** be routed through Web Audio, so the browser-voice fallback
  gets no radio filter. That's why lines are pre-rendered: **after editing any spoken text
  (scripts, previews, sign-on/off, Other Station lines) or a person's voice, run
  `npm run voices`** or that line plays in the browser voice. Shots run `?mute`, so they
  never exercise the voice files; `window.__deadair.data.voicePlays` counts files played.
- Headless rendering of stand-in records is slow here (3–9 s each); the game pre-renders
  records as soon as they're placed in the rundown.
- `BoothScene` already has a `needles` field (the VU/dial/clock graphics). Vite serves code
  with type errors, so a name clash there shows up only in `npm run typecheck`, not in shots.
  Run typecheck before trusting a shot.

### Owner's-PC gotchas (Windows)

- Playwright's Chromium is installed (2026-10-02), so `npm run shots` works as is. If it
  goes missing, run `npx playwright install chromium` or point the tool at Chrome:
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

1. **Playtest Nights 1 and 2 back to back with the owner** (recommended), then tune or
   cut. The owner's first booth-task pass is in `TODO.md` (tasks hard the first time;
   Morse hard on `?fast`). Night 1's shape: needle and tube at dusk; switchboard (Mrs.
   Okafor, a nameless slanderer to dump, Lottie) and a storm late; Morse ("HELP") in the
   small hours. Night 2 (`src/data/night2.ts`): switchboard at dusk (Grace Okafor, Sparky
   inviting the town up a live pylon, Old Bill's knee), tube and Morse ("SPOOL", from Teddy) late, the
   squall in the small hours on top of the squall warning. Night 1's flags gate Night 2
   cards and callers (Morse copied → the Wozniak tip, boat lost → memorial, slander aired
   → Sister Agnes replies, Teddy found or not → which Grace calls).
   Also pending: one-line first-time hints if needed, volume sliders and a pause.
2. **Voices: listen.** Every line is pre-rendered with Kokoro and plays through the radio
   chain (2026-10-06). Nobody in-session could hear them: the owner should judge the voice
   picks in `src/data/people.ts`, the phone and Other Station sound, and levels against
   the records. The owner's own recordings drop into `public/voice/` (see its README).
3. **M2: One Day** — town walk, map with a travel event, one ruin run; outputs are cards
   and records for the night. See `DESIGN.md`.
4. **Night 3+** needs new records: all eleven real 78s are now used (a test keeps each
   record to one night). Fetch more with `npm run records` after adding catalog entries.
   A Bessie Smith original pressing would be a good Linemen record (the one found was a
   modern Wolf reissue, so it was skipped).

## Known uncertainties

- Nobody in-session could listen to audio. The owner confirmed the original build sounds
  right; the real 78s are verified only to decode with even loudness. "Swanee Butterfly"
  may be instrumental; the Ballard and Nair record's style is unconfirmed.
- Marion Harris's label: archive.org says "Simolian", catalog 2610 (left as listed).
- `public/records/` adds about 23 MB to the repo. Trimming files to the ~75 s the game
  plays would halve it, if that ever matters.
