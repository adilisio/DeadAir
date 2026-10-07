# TODO

Light process: one list. Move items to Done with the commit that did them.
The direction is `PLAN.md` (2026-10-06): six nights in the booth, no daytime modes.

## Questions for Anthony (2026-10-07) — answer any, in any order
While playing Nights 1 and 2:
1. A caller on air plays once now, on the handset. Does the three-second delay still read as
   a thing (the DELAY 3s label, the dump), or has it vanished?
2. Does the Other Station sound like you gone wrong, and can you still make out the words?
   If not: too muddy, or still too much like you?
3. On the big monitor: readable now? Anything still clipping outside its box, and which panel?
4. Did you listen in off air before putting someone on? (Grace says something on Night 1 she
   won't say on the air.) Did it change what you did?
5. Did you swap anything live with the desk (TAB)? Why, or why not?
6. Night 2's squall: did you notice the second carrier on the dial? What did you take it for?
7. At dawn: did you buy anything from the notices? Was it clear why you might?
8. Anything annoying rather than tense: which task, and when.
Decisions, with the default if you say nothing:
9. Night 6's setting: the grid switch-on, the storm evacuation, or both colliding (built: both).
10. "Chits" for the money (default: keep).
11. The ledger says "you". Keep, or a real paper writing about "the Lamp" in third person?
    (default: "you" for the lines, third person for notices and the headline).
12. A casual rewrite of the DJ's scripts (contractions, asides, the kettle): before Gate 2, or
    after you've heard more?

## Gate 1 — Anthony's first pass at Night 1 (2026-10-07, Desktop/Feedback)
What he found, and what it became:
- Text hard to read on a large screen → the canvas now renders at the screen's own scale
  (`RES` in `src/config.ts`, 1-3; `?res=N`), cameras zoom to match, text rasterizes at it.
- The caller "played twice, on top of each other" → that was the handset copy plus the air
  copy three seconds behind. The booth no longer monitors the air: one voice, the delay is
  a clock. The dump still cuts both.
- "I hang up on people before I can take their call" → SPACE used to leave the board. Now
  SPACE puts the line you are listening to on the air (ENTER too); ESC hangs up. Labels,
  the first-time hint and the README say so.
- Text clipping outside boxes on long scripts; the Morse tape running off its box → the
  teleprompter scrolls a window of lines once a script is longer than the box at 12px; the
  switchboard panel is taller and shrinks a long confide; the tape shows its tail.
- "How long are the songs played?" → the record's time left sits in the teleprompter header.
- The DJ's voice: "a big improvement, still a little robotic, not casual like a radio DJ" →
  `npm run voices -- --audition` renders the sign-on in a dozen unused voices with a page to
  play them (see `public/voice/README.md`). **Decided (2026-10-07): keep `am_michael`,** the
  best of the thirteen. What's left is the writing: the DJ's scripts are formal; a casual
  rewrite pass (contractions, asides, the kettle) is a content job, every DJ line re-renders.
- "The unknown station sounds exactly like the main narrator, just deeper" → by design (it is
  the DJ's own files, slowed and doubled). **Decided (2026-10-07): it should sound like you,
  pushed further.** The `other` channel now runs slower, with a detuned second copy a
  beat behind, a slow drift on the pitch and a muffled room behind it (`playVoice` in
  `src/audio/engine.ts`). Tune by ear; keep it intelligible. Don't explain it in content.

Still to answer from the Gate 1 list (Night 2 not yet played): the off-air confide, the desk,
the second carrier in the squall, the classifieds, "annoying rather than tense".

## Next — in PLAN.md order
- [ ] Tune by ear after Gate 1: voice levels per channel (`playVoice` gains), the Other
      Station's processing, phone band, static under voices
- [ ] Gate 2 playtest (Nights 1–4), then Gate 3 (the full run); questions in PLAN.md §14 and
      HANDOFF.md "What to do next"
- [ ] Night 6 difficulty, after Gate 3: on `?auto` the storm (wind 1.6) plus two tubes
      blowing into an empty drawer leaves slots 4–6 at 0.4 / 0.3 / 0.0 signal, so the finale's
      warnings mostly miss. Headless frame rates make this worse; judge it by hand first.
- [ ] `?night=N` towns are too rosy and too poor (every auto night goes perfectly: trust 100
      by Night 3; nobody buys classifieds, so the drawer is empty by Night 5). Make `townBefore`
      play earlier nights at signal 0.85 with one caller ignored and buy a spare a night.
- [ ] Tube picks during the fumble are ignored; queue the pick or shorten the fumble
- [ ] Known rough edges: the record glint stands in for a spinning label; `?fast` overrides
      run at a third of their length on screen; no dawn line uses tone `rumor` yet (the ink
      is ready)

## Owner
- Final name for the DJ
- The DJ's voice until you record: `am_michael` (one line in `src/data/people.ts`)
- Optional: record your own lines; drop them in `public/voice/` by id (see its README)
- Push when a session couldn't

## Done
- M0 scaffold: Vite + TS + Phaser 4, Vitest, screenshot tool, docs
- M1 One Night: resolver + Night 1 content, audio engine and stand-in pressings, booth art
  and lighting, prep, live show (tuning, cueing, dead air, caller), the Other Station,
  the dawn ledger. 40 tests; `npm run shots` plays a full night headless.
- Owner playtest of M1: plays start to finish, runs smoothly; static was too loud (fixed),
  music needed singing (fixed with real 78s), voice should sound human (done: Kokoro),
  tuning + cueing gets repetitive (booth tasks built)
- Names settled: Port Vesper, the Lamp, Netters / Chapel / Linemen (grid restorers) (`069f1ff`)
- Real 78s: 11 public-domain records with credits, `npm run records`, Night 1 on real
  songs, stand-in fallback (`aa7732b`, `a3dd83b`); ten more for Nights 3–6 (`79ba260`)
- Booth tasks: storms `ad3c0cf`, needle drop `f233fff`, tube swap `c209871`, switchboard +
  dump `96f4cd4`, Morse `51c8ae4`
- Night 2 and runs (`4f9c6cf`)
- 2026-10-06, the campaign milestone (see PLAN.md):
  - A: pre-rendered Kokoro voices through the radio chain, one voice per person (`7c09ac0`)
  - B: night events, person flags, gate contexts, save/continue (`e47f33b`)
  - F: listeners scale the audience, trust shifts reach thresholds, reach hints (`2aa73f4`)
  - C: switchboard v2: confides, requests, patience, urgent lamps, the audible delay,
    dumped sentences read back (`6095fa8`)
  - D: the desk (live swaps), hedged reads, sources instead of truth, the spares drawer,
    classifieds (`1da99af`)
  - E: the Other Station live: two carriers in the storm, overrides (`c7be35f`)
  - G: Nights 3–6 wired with the rules they need, every line voiced, `?night=3..6`,
    the whole-campaign shot (`fe2edc3`); content fixes after the shot pass (`7fcf41b`)
  - K: Night 6's climax is a choice: HOLD (jam it), LET IT THROUGH, COUNTER (`f1f4f9d`)
  - M: pause, volume sliders, first-time hints, rumor ink, title version (`4c77090`)
  - Night 6's Ridge Road line resolves once; the storm is judged on the dial, not the jam;
    `npm run probe`
