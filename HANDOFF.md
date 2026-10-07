# Handoff — Dead Air

For the next agent picking this up. Read this, then `CLAUDE.md` (commands, layout, rules),
`DESIGN.md` (the game), and `TODO.md` (the live task list). Last updated 2026-10-06.

## What this is

A small browser game: you run WLMP 1260 AM, "the Lamp", the last radio station in Port
Vesper, a post-collapse town on Lake Erie. You build a night's show from cards, run it
live, and what you air changes the town. After sign-off, another station on your frequency
reads back what you chose *not* to air. Phaser 4 + TypeScript + Vite, Vitest for rules.

**Milestone status:** the campaign milestone (`PLAN.md`, 2026-10-06) is built: packets
A-G, K and M are on `main`. Six nights play start to finish, save and continue, with every
line voiced. M0 and M1 were playtested by the owner; everything since (booth tasks, the
switchboard, the desk, the Other Station live, Nights 3-6, the climax, pause and volume)
has only been played by the `?auto` player and one scripted real-pace run of Night 1.
Next is the owner's Gate 1 playtest; see "What to do next".

**Content status:** the campaign is six nights (`src/data/night1.ts` to `night6.ts`,
listed in order in `src/data/nights.ts`), all voiced. Nights 3-6 were written by the
director (2026-10-06) and wired in Packet G; nobody has played them by hand yet, only
`?auto` (the `16-campaign` shot plays Night 1 to the last dawn and START OVER).

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
| Daytime | **Cut** (PLAN.md, 2026-10-06). The station is the game; dawn carries the between-nights. |
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
  Packet C (switchboard v2): 177 tests, 25 shots (adds `05-booth-switchboard-confide`,
  `11a-night2-board-late`).
  Packet G (campaign wiring): 317 tests, 48 shots (adds `16-campaign`, which plays Night 1
  to the last dawn and START OVER and also saves `16a`/`16b`, and prep / switchboard /
  dawn / letter for Nights 3-6, `41a-night4-override`, `61a-night6-climax`).
  Packet K (the climax): adds `61b-night6-counter` and `62-night6-dawn-counter`
  (`?counter`); `61a` / `61b` also check the climax ended `jammed` / `countered`.
  Packet M (polish): adds `04e-booth-paused` and `04f-booth-hint`.
  At the end of the milestone (2026-10-06): 349 tests, 53 shots, typecheck and build clean.
  `npm run probe -- N` prints a night's resolved result (signal, flags, ledger, headline)
  from the `?auto` run, the quickest way to check content; `npm run play` drives Night 1
  at real pace with a scripted player.
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
- Packet D (the desk, hedged reads, sources, scarcity; 2026-10-06): news cards carry a
  `source` (shown at prep instead of true/false) and some a `hedge` script. Live, TAB opens
  the desk (`src/sim/desk.ts`: `deskCards` re-checks gates against `airedTonight`,
  `swapNext`; `src/ui/DeskPanel.ts`) and H cues a hedged read; the scene passes the
  running order as aired plus `hedged` and `swaps` to the resolver. `TownState.spares` is
  the tube drawer (one of each to start; `save.ts` fills it in old saves); `TubeFault`
  takes the drawer, and with no matching spare a tube is `bodged` (60% for the night).
  The resolver takes `tubes[].used` out of the drawer. `NightDef.classifieds` sell spares
  and records at dawn (`src/sim/classifieds.ts`: `buy`; `run.ts`: `buyClassified` re-saves);
  the Dawn scene's NOTICES page shows them.
- Packet G (campaign wiring, Nights 3-6; 2026-10-06): the rules the four nights rely on.
  The resolver sets `aired_<card>` for every card that aired (`hedged_<card>` for hedged
  reads) before the night's dawn lines run; an outcome with `line: ''` adds no dawn line
  (flag and effects still land). `gate` on every event kind and intrusion (`openNight`
  drops closed ones; Night 4 and 6 each have two mutually exclusive Morse events).
  `StormEvent.wind` multiplies `STORM_WIND`. `NightDef.dawnLines` (evaluated last, in
  order, against the town after the night, each adding its flag for the next), `letters`
  (first open one replaces `letter`; `NightResult.letter`), `headlines` (first open one;
  `NightResult.headline`, drawn on the dawn's numbers page). Card `group`s (only one airs;
  prep greys siblings; the desk won't offer one), `otherStation.readsGroup` (reads the
  unpicked ones). `endsShow` cards: the show ends when one finishes (no sign-off read,
  `ShowPerformance.endedEarly`, the rundown is the prefix that aired; boards due later never
  rang; storms count aired slots only). `otherStation.fillsSilence` / `readsAll`
  (`otherStationReads` in the resolver; with nothing to read the script is intro + stamp and
  `<nightId>_other_silent` is set). `climax.card` is optional. Tone `rumor` (dim ink and a
  `~` bullet in the Ledger since Packet M). People `ewa`, `marta`, `harbor`.
- Polish (Packet M, 2026-10-06): pause (ESC or the PAUSE label; `BoothScene.setPaused`
  suspends the AudioContext, pauses speechSynthesis, `time.paused`, tweens and `update`;
  bare timers go through `pauseClock` in `src/sim/pausable.ts`, so any new `setTimeout` in
  show code must too, and a new stored `this.time.now` timestamp must be shifted in
  `setPaused`). Volume sliders music / voice / static (`src/sim/settings.ts`, three gain
  nodes in `engine.ts`, `localStorage['deadair.volume']`, on the pause overlay and the title).
  First-time hints (`src/ui/hints.ts`; `run.hints` saved in `SavedRun.hints`, tolerated when
  missing). Title shows the version (Vite `define` `__APP_VERSION__`) and `six nights`; the
  canvas takes focus on click. `tools/shots.mjs` shots take an optional `steps` function
  (`04e-booth-paused` freezes the show with ESC and checks nothing moves).

### How it fits together

- `src/sim/` — pure rules, no Phaser. `resolver.ts` turns a rundown + live performance
  (`ShowPerformance`: per-slot signal, dead air, calls, needle drops, tube seconds and Morse per event)
  into the next town state and dawn lines. Rules: audience shares per segment, reach
  checks, breather/panic, ad fatigue, dedications, lies unravel at dawn, plus each booth
  task's outcome. `tuning.ts` is the transmitter drift model.
  - Booth tasks, one file each with its pure logic and constants: `storm.ts` (wind per
    slot, storm report), `needle.ts` (arm sweep, groove band, late skip), `tube.ts`
    (`TubeFault` state machine and the spares drawer), `calls.ts` (call results, the dump delay in chars and
    seconds, ring patience, `dumpedSentence`, `requestResult`), `morse.ts`
    (code table, keying timeline/tape, `MorseCopy`, chart). Tests in `tests/<name>.test.ts`.
  - `intrusion.ts`: the Other Station during the show (`otherStation.intrusions` in the
    night data, not `events`). `carrier`: a second carrier at `OTHER_OFFSET` (-0.55, "1250")
    over some slots; `bleed(error, tubeStrength)` is how much of it comes through yours,
    `carrierForSlot`. `override` / `climax`: `intrusionsDue` (same timing rules as
    `eventsDue`), `overrideSeconds` (holding the dial shortens it), `overrideCard`, and the
    show clock (`clockText`). The climax: `climaxResult(held, countered)` (SPACE wins;
    `CLIMAX_HOLD` 0.75 held jams it; `CLIMAX_TRIED` 0.1 or more and less than that fails;
    else carried), `JAM_SIGNAL`; the scene logs `perf.climax` and `perf.tuned` (signal per
    slot before the jam: storms are judged on that, so a jam is not "the wind took you off"). The resolver's
    `otherStationLive` turns `perf.bleed`, `perf.overrides` and `perf.climax` (unless
    jammed; countered at half signal) into cards the town heard on 1260
    (`NightResult.otherAired`, flags `other_heard` and `other_aired_<card>`, lines that
    lead the ledger, the climax's first: flag `n<number>_<result>`, a countered counter card
    counts as aired at half audience).
  - `desk.ts` (desk cards, live swaps) and `classifieds.ts` (what chits buy at dawn).
- `src/data/night1.ts` — Night 1's 13 cards, its events (`n1_board` with three lines,
  `n1_tube`, `n1_morse`, `n1_storm`), the Other Station config, and the `?auto` / `?scene=dawn`
  rundowns (tested for validity). `night2.ts` to `night6.ts` the same, plus (3-6) gated
  events, `dawnLines`, `letters`, `headlines` (Night 6's are the ending), groups (Night 5's
  answers) and an `endsShow` card (Night 5's "go dark"). `records.json` + `records.ts` — the
  record catalog: real 78s and synthesized stand-ins. A record airs at most once a night and
  never two nights running (data test).
- The data test's every-opening check opens each night for every combination of the flags
  its gates mention (minus combinations listed as impossible in `EXCLUSIVE`) and checks the
  crate (7-15 cards), the boards (2-3 lines), and that no two Morse signals key at once.
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
  shown in storms, with two carriers or under an override, the climax's HOLD / LET IT
  THROUGH / COUNTER strip over the gauge, cue box with THE DESK button,
  running-order chips), one panel per task (`NeedlePanel`, `TubePanel`, `Switchboard`,
  `MorsePanel`), `DeskPanel` (live swaps), `widgets`.
- Live controls: A/D tune (storms; held hard through an override, shortens it), SPACE cue /
  drop needle / leave switchboard, H cue hedged, TAB desk (1-9 pick, ESC close), Q/W/E spare
  tubes, 1/2/3 + ENTER switchboard, X dump, letters for Morse (H goes to Morse while it's on
  the chart). `?drift` (with `?auto`) holds the dial toward 1250 in storms.
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

## What to do next (the playtest gates, PLAN.md section 14)

1. **Gate 1: the owner plays Nights 1 and 2** with headphones, no switches. The questions
   to answer are the top of `TODO.md`. Nobody has heard the voices, the phone band, the
   Other Station's processing or the three-second dump delay; the owner's ear decides the
   levels (`playVoice` gains in `src/audio/engine.ts`, the sliders are only a scale on top).
   Tune what Gate 1 turns up before going on.
2. **Gate 2: Nights 1-4.** Night 3 (Two Lamps: the first override, the town asking about
   two a.m.), Night 4 (The Freeze: the relay hut fire, Teddy, the first long override). Judge
   whether the Other Station reading what you cut feels like a consequence or a trick.
3. **Gate 3: the full run** to the last dawn, then START OVER. Night 5's "go dark" card and
   what fills the silence; Night 6's climax (HOLD / LET IT THROUGH / COUNTER at 1:04 AM:
   does 45 seconds feel right, is holding three quarters of it fair, is the storm's wind
   1.6 with two tubes blowing and an empty drawer too much); whether the headline you got
   matches the night you had. `npm run probe -- 6` and `?night=6&counter` help, but
   `?night=N` towns are rosier than a real run (every earlier night went perfectly).
4. **Then** the Later list in `TODO.md`: rosier towns, tube picks during the fumble, the
   record glint. No new mechanics until the gates say the existing ones hold up.

## Known uncertainties

- Nobody in-session could listen to audio. The owner confirmed the original build sounds
  right; the real 78s are verified only to decode with even loudness. "Swanee Butterfly"
  may be instrumental; the Ballard and Nair record's style is unconfirmed.
- Marion Harris's label: archive.org says "Simolian", catalog 2610 (left as listed).
- `public/records/` adds about 23 MB to the repo. Trimming files to the ~75 s the game
  plays would halve it, if that ever matters.
