# TODO

Light process: one list. Move items to Done with the commit that did them.

## Now — owner picks the next piece (see HANDOFF.md, "What to do next")
- [ ] Booth mini-games so the night isn't one task on repeat (playtest: tuning + cueing is
      "mildly fun", "a little repetitive"): tube swap, needle drop, switchboard, dump button,
      Morse; tuning only during storms. Outcomes feed the resolver.
- [ ] Volume sliders (music / voice / static) and a pause
- [ ] Human-sounding voices: owner's recorded lines as drop-in files; in-browser neural TTS
- [ ] Night 2 content using the five unused 78s
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
  cueing gets repetitive (open: mini-games)
- Names settled: Port Vesper, the Lamp, Netters / Chapel / Linemen (grid restorers) (`069f1ff`)
- Real 78s: 11 public-domain records with credits, `npm run records`, Night 1 on real
  songs, stand-in fallback (`aa7732b`, `a3dd83b`)
