# TODO

Light process: one list. Move items to Done with the commit that did them.

## Now — owner picks the next piece (see HANDOFF.md, "What to do next")
- [ ] **Owner playtest of the booth tasks.** Which ones are fun, which to cut or grow, and
      timings: needle sweep (`NEEDLE`), switchboard ring time (`RING_SECONDS`), dump delay
      (`DUMP_DELAY_CHARS`), tube fumble/warm (`TUBE`), Morse speed and length (`MORSE_TIMING`,
      `night.morse.seconds`), storm wind (`STORM_WIND`).
  - Owner, first pass (on `?fast`): the tasks are hard the first time when you don't know
    what to do ("may be fine"). Morse was really tricky; `?fast` cuts it from 50 s to 14 s,
    so retry at normal speed before changing it. Idea if needed: a one-line "how to" the
    first time each task appears.
- [ ] Volume sliders (music / voice / static) and a pause
- [ ] Human-sounding voices: owner's recorded lines as drop-in files; in-browser neural TTS
- [ ] **Owner playtest of Night 2**, ideally straight on from Night 1 (`?night=2` jumps in
      with a good Night 1 behind it). Does it feel different enough? Do the callbacks to
      Night 1 land?
- [ ] Night 3 needs more 78s (all eleven are used; each record airs on one night)
- [ ] Known rough edges: the record glint stands in for a spinning label

## Next — M2: One Day
- Town walk (top-down, talk to people → cards)
- Map with one travel event
- One ruin run (sneak + loot → records, parts)

## Owner
- Push the latest commits if a cloud session couldn't (it gets sent as a git bundle)
- Final name for the DJ
- Optional: record your own voice lines for the sign-on, sign-off and the Other Station

## Done
- M0 scaffold: Vite + TS + Phaser 4, Vitest, screenshot tool, docs
- M1 One Night: resolver + Night 1 content, audio engine and stand-in pressings, booth art
  and lighting, prep, live show (tuning, cueing, dead air, caller), the Other Station,
  the dawn ledger. 40 tests; `npm run shots` plays a full night headless.
- Owner playtest of M1: plays start to finish, runs smoothly; static was too loud (fixed),
  music needed singing (fixed with real 78s), voice should sound human (open), tuning +
  cueing gets repetitive (booth tasks built, see below; awaiting playtest)
- Names settled: Port Vesper, the Lamp, Netters / Chapel / Linemen (grid restorers) (`069f1ff`)
- Real 78s: 11 public-domain records with credits, `npm run records`, Night 1 on real
  songs, stand-in fallback (`aa7732b`, `a3dd83b`)
- Booth tasks, so the night changes texture instead of repeating tune + cue:
  storms (tuning only in a squall) `ad3c0cf`, needle drop `f233fff`, tube swap `c209871`,
  switchboard + dump button `96f4cd4`, Morse `51c8ae4`. 79 tests; a shot for each.
- Night 2 and runs: the town carries over between nights; cards and callers gated on
  Night 1's flags; tasks rearranged; the five unused 78s; per-night letters; `?night=N`.
