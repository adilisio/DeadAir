# TODO

Light process: one list. Move items to Done with the commit that did them.
The direction is `PLAN.md` (2026-10-06): six nights in the booth, no daytime modes.

## Gate 1, second pass — Anthony's answers (2026-10-07) and what they became
1. "I don't hear the delay anymore" → the teleprompter shows it: a caller's words turn
   from blue to cream as they reach the town (forty characters behind the handset, the
   rule's delay), and a dump shows what the town heard and "the rest never went out".
2. The Other Station "sounds good now". 3. Text "looks great now".
4. "Who is Grace? I didn't catch that one" → he never found listening in. After a preview
   the board now says "... still on the line. Keep listening, or put them on."
5. The desk: "how do I do that? not obvious" → while the desk has cards and hasn't been
   opened tonight, the cue box's waiting line reads "TAB - the desk: swap what's next".
6. Noticed the second carrier: "surprising". 7. Bought from the notices; the why was clear.
8. "The timing of the games can be a little surprising and the songs can feel a little long"
   → records play 60 s (was 75). The tasks' arrivals: built as a beat of warning, for
   Gate 2 to judge: a tube sputters in its socket (and you hear it) before it blows; a
   Morse signal keys under the static for a lead before the tape appears and the clock
   starts. If the surprise was better, `TUBE.warnSeconds` and `MORSE_TIMING.leadSeconds`
   go to 0. **Gate 2 (2026-10-07): the warning stays.**
9. Night 6: both colliding, "cool and stressful". 10. Chits stays. 11. "You" stays.
12. The DJ's scripts "are good for now".

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
All three playtest gates passed on 2026-10-07 with nothing to fix after Gate 1 (Gate 2:
Nights 1–4; Gate 3: the full run to the last dawn and START OVER). Night 6's storm was
judged by hand and holds; the `?auto` numbers below are a headless artefact, not a tuning
problem. What is left is polish, none of it blocking.

- [ ] Night 6 on `?auto` only: the storm (wind 1.6) plus two tubes blowing into an empty
      drawer leaves slots 4–6 at 0.4 / 0.3 / 0.0 signal. By hand it plays fine (Gate 3); only
      worth touching if a headless check needs the finale's warnings to land.
- [ ] `?night=N` towns are too rosy and too poor (every auto night goes perfectly: trust 100
      by Night 3; nobody buys classifieds, so the drawer is empty by Night 5). Make `townBefore`
      play earlier nights at signal 0.85 with one caller ignored and buy a spare a night.
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
- 2026-10-07, before Gate 2: a beat of warning before a tube blows (the sputter) and before
  the Morse tape (the lead); a tube pick during the fumble is queued, not lost
- 2026-10-07, Gate 2: Anthony played Nights 1–4. Nothing to fix; the warning beat stays
- 2026-10-07, Gate 3: Anthony played the full run to the last dawn. Nothing to fix
