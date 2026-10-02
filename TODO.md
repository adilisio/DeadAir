# TODO

Light process: one list. Move items to Done with the commit that did them.

## Now — M1: One Night (built; waiting on the owner's playtest)
- [ ] Owner plays a full night with sound and reports: is building the show interesting?
      Is tuning + cueing fun or a chore? Too easy / too hard? Does the Other Station land?
- [ ] Tune from that: drift strength (`src/sim/tuning.ts`), cue window and record length
      (`src/scenes/BoothScene.ts`), rule numbers (`RULES` in `src/sim/resolver.ts`)
- [ ] Check speech on the owner's browser: which voice it picks, whether word highlighting
      follows it (`src/audio/voice.ts`)
- [ ] Known rough edges: the record glint is a stand-in for a spinning label; no settings
      menu yet (volume, effects); no pause

## Next — M2: One Day
- Town walk (top-down, talk to people → cards)
- Map with one travel event
- One ruin run (sneak + loot → records, parts)

## Owner
- Allow `archive.org` and `*.archive.org` in the cloud environment's network settings,
  so `npm run records` can download the 78s in-session (or run it on your PC)
- Final name for the DJ

## Done
- M0 scaffold: Vite + TS + Phaser 4, Vitest, screenshot tool, docs
- M1 One Night: resolver + Night 1 content, audio engine and stand-in pressings, booth art
  and lighting, prep, live show (tuning, cueing, dead air, caller), the Other Station,
  the dawn ledger. 40 tests; `npm run shots` plays a full night headless.
