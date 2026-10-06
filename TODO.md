# TODO

Light process: one list. Move items to Done with the commit that did them.
The direction is `PLAN.md` (2026-10-06): six nights in the booth, no daytime modes.

## Now — owner playtest, Gate 1 (Nights 1 and 2 on the new systems)
Play Night 1 then Night 2, no switches, headphones. Then answer these; nothing else.
- [ ] Did a caller's voice sound like a person? Could you tell Grace from Lottie with your
      eyes closed?
- [ ] Did you listen in off air before putting someone on? Did it help, or lie to you?
      (Grace tells you something off air on Night 1 that she won't say on the air.)
- [ ] Did you swap anything live (TAB, the desk)? Why?
- [ ] Was there a moment you wanted to air two things and couldn't?
- [ ] Did the dump (X) feel like a decision or a reflex? Could you hear the three-second
      delay between the handset and the air?
- [ ] On Night 2, in the squall: did you notice the second carrier? What did you think it was?
- [ ] At dawn: did you buy anything from the classifieds? Did you understand why you might?
- [ ] Anything annoying rather than tense? Which task, and when.

Owner's earlier notes still open: tasks are hard the first time (a one-line "how to" the
first time each task appears is in the polish packet); Morse was tricky on `?fast`
(retry at normal speed).

## Next — in PLAN.md order
- [ ] Packet G (in progress): Nights 3–6 wired, voices for every line, `?night=3..6`
- [ ] Packet M (polish): pause, volume sliders (music / voice / static), first-time hints,
      rumor-tone ink on the Ledger, docs pass
- [ ] Gate 2 playtest (Nights 1–4), then Gate 3 (the full run); questions in PLAN.md §14
- [ ] Tune by ear after Gate 1: voice levels per channel (`playVoice` gains), the Other
      Station's processing, phone band, static under voices
- [ ] Known rough edges: the record glint stands in for a spinning label; `?fast` overrides
      run at a third of their length on screen

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
