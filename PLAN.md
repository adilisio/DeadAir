# DEAD AIR — Complete Campaign (milestone plan)

*Written 2026-10-06 by the acting creative/systems director after a full audit of the
repository, the tests, the headless play-through and a real-pace Night 1. This is the
judgment the next weeks of work follow. It supersedes the roadmap parts of `DESIGN.md`
and `TODO.md` where they disagree; those files are updated to point here.*

---

## 1. Where the game stands

**What works.** The booth is a real place: the lighting, the window, the tubes, the
ON AIR sign, real 78s through a radio chain, a morning paper that talks like a person.
The rules live in pure, tested TypeScript (`src/sim/`, 98 tests, clean typecheck and
build, 22 headless shots green). Night 2 remembers Night 1 through flags. The Other
Station's one trick, reading the card you *didn't* air in your own voice from a date
that hasn't happened, is the best idea in the game, and the two listener letters about
it are the best writing.

**What doesn't, measured against the standard "players tell stories about what happened
on their show":**

1. **All the decisions happen at prep, with full information.** Card blurbs say "True."
   and "False." The switchboard lets you listen off air first, and the preview gives the
   game away ("Folks ought to hear what's going on up at that Chapel"). Nothing surprises
   a careful player. The live show is execution: six reaction tests in a row.
2. **The live show has one editorial moment per night** (the switchboard, one slot, up
   to three lines). Everything else live is upkeep with a right answer.
3. **The town's numbers are a scoreboard, not a state.** Morale, Safety, Credibility,
   Listeners and Chits change but nothing reads them. Chits buy nothing. Only flags gate
   content, and flags are the right tool, but numbers that don't matter make the prep
   screen a lie.
4. **People aren't people yet.** Grace Okafor exists in two files as two unrelated
   callers linked by a flag. There is no notion of a person the station has cut off twice.
5. **Voices.** One browser TTS voice at different pitches, dry, un-filterable. In a radio
   game this is the ceiling on everything else.
6. **Dawn explains everything.** Every line says exactly what you did and what it caused.
   No rumor, no delay, no "wait, was that because of…".
7. **The Other Station is a coda.** Thirty seconds after sign-off, then a letter.
8. **Night 1 at real pace is about six minutes on air** (sign-on 0:14, first record
   0:50, tube 1:16, switchboard 2:06, storm 2:56, Morse 4:28, sign-off 5:57, Other
   Station 6:00). That's a fine length for a night; it means a campaign of six nights
   is about an hour, which is the right size for this game.
9. **No save.** A one-hour campaign needs one.

The architecture is sound and should be extended, not rewritten: sim/scene split,
flag gates, authored outcomes, a performance record the resolver consumes. Three things
are too narrow for the campaign: one switchboard/tube/Morse *per night* (singletons on
`NightDef`), callers with no identity across nights, and a prep screen that tells the
truth.

## 2. What Dead Air should become

**The station is the game, so the show is where the decisions are.** Prep is the plan.
The night is what happens to the plan.

A night of Dead Air, finished:

- You build a rundown from what came in that day. You know what the cards *are*, not
  whether they're true: who said it, whether you can vouch for it.
- You go live. Records, your reads, the sign-on. The phone rings when it rings: during a
  record, in the middle of a warning, twice in a row. Each caller is someone. By Night 3
  you know Lottie's voice before she says her name and you know Old Bill is right about
  weather and wrong about everything else.
- A caller tells you something off air that changes what you want to air next. You pull
  a card off the desk and swap it in at the cue. Or you don't, and the Other Station
  reads it at 2:14 instead.
- Someone turns on you mid-sentence. The station runs seven seconds behind the phone;
  you hit the dump or you don't. Sometimes the thing you dumped was true.
- A squall comes off the lake and there's a second carrier on 1260 under yours. Holding
  the dial now means choosing which Lamp the town hears.
- A tube blows and the drawer has no 5U4 left, because you spent the chits on a record
  instead of a spare. You finish the night at half strength and the Netters past the
  breakwater don't hear the ice warning.
- Dawn. The Ledger says what people are saying. Some of it is wrong. Some of it is about
  what you did three nights ago. There are letters. One of them asks if that was you.

Everything in this plan serves that night. Nothing in this plan happens outside the
booth or the paper.

## 3. What we will NOT build

- **Daytime modes: town walk, map + travel event, ruin run.** Cut from the roadmap.
  Judged against the six tests (inputs for broadcasts, relationships with voices,
  stakes, information you can't get in the booth, tradeoffs, pacing): a walk-and-talk
  could feed cards, but it duplicates what the switchboard and the paper do, splits the
  game's identity, costs a second engine (top-down movement, collision, a town map) and a
  second art pipeline, and makes every night's information arrive *before* the show
  instead of *during* it, which is the opposite of what the game needs. What the day
  should do (bring in records, parts, requests, mail) the **desk** does at prep for a
  fraction of the cost. If, after the campaign ships, the owner still wants to walk the
  town, it can be a stretch goal. Not now.
- **A reputation spreadsheet.** No per-person affinity numbers. People remember what the
  station did to them through flags the resolver sets automatically (`grace_cut`,
  `grace_aired`) and content gated on those.
- **New stand-alone minigames.** Any new interaction must touch at least two existing
  systems. The list of mechanics below is the whole list.
- **Explaining the Other Station.** Its *behavior* escalates (section 9). Its nature is
  never stated. The owner decides if it ever is.
- **Procedural dialogue.** Every line is authored. The variety comes from gating and
  recombination, not generation.
- **Runtime neural TTS in the browser.** Voices are rendered once, offline, to files.

## 4. Mechanics: keep, deepen, simplify, remove

| Mechanic | Verdict | What changes |
| --- | --- | --- |
| Prep / rundown | Keep, **rewrite the information** | Blurbs stop stating truth. Each news card shows its *source* ("an unsigned note", "Sister Agnes", "Doc Hessler, paying"). The crate becomes the desk: cards you don't schedule stay available live. Station mail and classifieds (spend chits) appear here. |
| Cueing | **Simplify into a decision** | The cue window stays, but it's the moment you can swap the next item or choose a hedged read. Dead air stays as a cost of indecision, not of forgetting SPACE. Records keep self-starting. |
| Needle drop | Keep | Add one rule: scratching a record that was a dedication or a memorial is its own dawn line. Nothing else. |
| Tube swap | Keep, **deepen through scarcity** | The spares drawer persists across nights. No matching spare: seat a wrong one and run at 60% all night (reach suffers, the Other Station bleeds louder). Spares come from classifieds, paid in chits, which ads earn. Tubes blow more than once on late nights. |
| Tuning / storm | Keep, **deepen** | From Night 3 the dial has two carriers in a storm. Drift toward 1250 and the town hears the Other Station through you. Tube strength scales how loud it bleeds. |
| Switchboard | **The pillar. Deepen hard** | Rings several times a night, including during records (answer: the record ducks; the call goes out over the music). Callers are people from a registry with their own voice. Previews are partial and sometimes misleading. Turns aren't always telegraphed. Two urgent lines at once, time for one. Off-air confidences: things a caller will tell *you* but not the town. Callers react to what you aired *tonight* (gates can read tonight's rundown so far). |
| Dump delay | Keep, **sharpen** | The dumped sentence is captured and the Other Station reads it back. Some callers who turn are telling the truth. The delay buffer becomes audible: on-air voice lags the handset. |
| Morse | Keep as **optional intelligence from a known sender** | Each signal has a sender. Night 2 onward it's Teddy Okafor at the relay hut (he learned it from the Linemen). Late nights, the Other Station keys too. Word length and penalty tuned down at full pace. Not a puzzle for its own sake. |
| The Other Station | **Pillar** | Section 9. |
| Dawn ledger | Keep, **layer** | Section 11. |
| Stats | **Make three of them matter** | Listeners scales the audience total. Faction trust shifts reach thresholds (a faction that trusts you acts on less). Chits buy spares and records. Morale and Safety gate a few panic/relief cards and pick the ending headline. Credibility is read by callers (low credibility: some people stop calling, the anonymous man calls more). |
| Records | Keep, **relax the once-per-run rule** | A station has a library. Records recur across nights (not two nights running). Requests make specific records matter on specific nights. Fetch about eight more 78s. |
| Save / continue | **Add** | localStorage at each dawn. Title offers "Continue: Night N". |

## 5. Campaign: six nights

Six, because the arc below needs each of them and a seventh would be "harder Night 6".
About an hour of play. Each night has a shape, a new pressure, and a question.

| # | Title | New pressure | The question the night asks | Booth texture |
| --- | --- | --- | --- | --- |
| 1 | **Sign-on** (exists; revised) | Learn the booth. Meet Grace, the anonymous man, Lottie. | Whose call do you take? | needle, tube at dusk; switchboard and storm late; Morse HELP at 2 AM. The Other Station reads your unaired card. |
| 2 | **The Line** (exists; revised) | The Linemen light Ridge Road. Grace returns, glad or angry. Sparky. Old Bill's knee. | Do you let an enthusiast on the air? | switchboard at dusk, a second ring during a late record; tube and Morse (SPOOL, from Teddy) late; squall at 3. The Other Station reads back the sentence you dumped. |
| 3 | **Two Lamps** | People quote things you never said. The Chapel and the Linemen contradict each other (the bees, the sulfa). The anonymous man is back, and this time he's right. Requests start. | Which contradiction do you air? Who do you believe? | First live intrusion: a second carrier on 1260 in the storm. A tube with maybe no spare. Two switchboard rings. |
| 4 | **The Freeze** | Hard freeze; a boat overdue; two emergencies on the board at once. Doc Hessler pays big for a lie during a medical night. | Which emergency gets the air? | The Other Station airs a warning **before you do**, mid-show, and the town acts on it. Morse from Teddy, a position. Storm with intrusion; tube twice. |
| 5 | **Silence** | Someone wants you off the air: the Chapel asks you to stop "repeating lies"; the Linemen need the lighthouse power for the switch-on. Sister Agnes calls for the first time. Trusted voices are wrong (Bill's knee says calm; the barometer says squall). | Do you address the other station on air? Deny it, claim it, or say nothing? | Sabotaged antenna: storm wind up, tuning harder; the board rings through records; Morse from the Other Station (a word from a card you haven't aired). |
| 6 | **Dead Air** | The night the grid comes on, or the storm of the decade and Dock Street evacuating; the switchboard never stops. The Other Station broadcasts the evacuation itself. | Hold the carrier and jam it, let it through, or talk over it? | Everything at once. Then sign-off, and the Other Station's last broadcast: whatever you left unsaid. If you left nothing, dead air. |

Escalation across the six: switchboard rings 1 → 2 → 2 → 3 → 3 → continuous; tube
faults 1 → 1 → 1–2 → 2 → 2 → 2; intrusion none → none → storm-only → one override → two
→ the climax; Morse sender unknown → Teddy → Teddy → Teddy → the Other Station → both.

## 6. People

A registry (`src/data/people.ts`): id, name, faction, a voice (Kokoro voice id, rate,
pitch), one line of who they are. Callers reference a person. The resolver sets flags
automatically when a person is aired, cut, dumped-in-time or ignored (`grace_aired`,
`grace_cut`, counts as `grace_cut_2`), and content gates on them. No numbers.

The cast, and what each is for:

- **Grace Okafor** (Elm St; Chapel-leaning). The mother. Her Night 1 outcome colors every
  later call. Teddy's fate is the campaign's human throughline.
- **Teddy Okafor** (14; wants to be a Lineman). Never on the phone. He's the Morse.
- **Old Bill Wozniak** (Netter). Weather oracle, right about the lake, wrong about people.
  The player learns to trust him selectively. Night 5 his knee is wrong.
- **Lottie Kowalczyk** (smokehouse row). Comic relief and the town's gossip. Her chatter
  contains the Night 3 and Night 4 keys if you listen. Walt (night crew) is her reason to call.
- **The anonymous man.** Lies on Night 1, is right on Night 3, and on Night 5 he gives his
  name. A player who dumps him on reflex misses something true.
- **Sister Agnes** (Chapel). Sends notes, honey and jars; never calls until Night 5, and
  when she does the whole town is listening.
- **Sparky** (Linemen hanger-on). Enthusiasm is dangerous. By Night 4 he's at the relay
  hut with Teddy.
- **Pruitt** (Lineman). Bitten on Night 1 if the dog warning didn't reach him. Holds it
  against you or doesn't; on Night 5 he's the one who asks you to go dark for the switch-on.
- **Doc Hessler** (sponsor). Pays. Lies. The chits you need come from him.
- **The Ostrowskis** (Netters). Henryk dies on Night 1 if the ice warning fails. The
  memorial, the smokehouse ads, the Night 4 overdue boat.
- **Brother Amos** (Chapel bees). The Night 3 contradiction.
- **The Kaminskis** (Netters). The boat that chases herring.

Rule: a person named in any card can later call, write a letter, or be an obituary.

## 7. Consequence model

Keep the one that exists and extend it in three places:

1. **Flags** stay the spine. The resolver sets outcome flags (as now), person flags
   (new, automatic), and *tonight* flags (`t_aired_<card>`, `t_dumped_<person>`) that
   are visible to gates during the live show and discarded at dawn.
2. **Gates** gain two contexts: `tonight` (what's gone out so far this show) and
   `stats` (simple thresholds: `morale < 35`, `trust.chapel >= 65`). Still declarative,
   still tested by the every-opening test.
3. **Delayed payoffs** are just gates on old flags in later nights. The content plan
   lists at least one Night 1 → Night 4 and one Night 2 → Night 6 callback so the
   player gets the "oh, *that* was because of…" at least twice.

Numbers that now matter (section 4): Listeners (audience total), trust (reach
thresholds), chits (spares, records), morale/safety (gates, ending headline),
credibility (who calls).

## 8. Broadcasting as strategy

The player should regularly want to air two incompatible things. Sources of that:

- **Six slots, more that matters.** Nights 3–6 have ten to twelve talk cards worth
  airing and five records. The breather rule means you can't air all the hard things.
- **Hedged reads.** Some news cards carry a second script: the straight read and the
  hedged one ("I can't swear to this"). Straight: full effect, full credibility risk if
  it unravels. Hedged: half effect, no unravel, lower reach. Chosen at the cue.
- **Live swaps.** The desk is live. A caller changes what's urgent; you swap at the cue,
  and the item you dropped is what the Other Station reads.
- **The ad you need.** Chits buy the spare you'll need on Night 4. Two ads in a row lose
  listeners. Doc's ads lie.
- **Who hears it.** Audience by segment (exists) plus trust-shifted thresholds: a
  warning to a faction that doesn't trust you needs a bigger audience.
- **Callers vs. rundown.** Taking a long call during a record means the record is the
  bed, not the message; taking it during your own read means finishing the sentence
  late. Not taking it has a flag.

## 9. The Other Station: the arc

It only ever says things made from your omissions: unaired cards, dumped sentences, the
option you didn't choose. That's already the design; the campaign makes it a relationship.

| Night | What it does | What it reads |
| --- | --- | --- |
| 1 | After sign-off. Your voice, a date days ahead. | The first unaired card. |
| 2 | After sign-off. | An unaired card, *and the sentence you dumped*, finished. |
| 3 | **Live**, in the storm: a second carrier at 1250. Hold 1260 and it's a whisper under you; drift and the town hears it clear. | Tonight's unaired card, in the storm. After sign-off, as before. |
| 4 | **Overrides** once, mid-show, for twenty seconds, whatever you do (tube strength shortens it). | A warning from your desk you haven't aired yet. The town acts on it. Dawn reports people who heard "you" say it. |
| 5 | Two overrides. People call to ask if it's you. Three cards offer an answer on air (deny / claim / say nothing); whichever two you don't pick, it reads. | Your unpicked answers. And it keys Morse: a word from an unaired card. |
| 6 | The climax: during the evacuation/switch-on it broadcasts the order. You hold the carrier (jam), let it through (carry), or air your counter over it. | Everything you left unsaid in the campaign, in the stamp's order. If nothing's left: dead air, and the letter says so. |

The letters track the stamps: Thursday, Monday, a Tuesday that isn't Tuesday, then a
date that *is* tonight, 2:14, while you were still on. Never a sentence explaining it.

## 10. Audio strategy

- **Voices are pre-rendered, offline, to files.** `tools/voices.mjs` runs Kokoro-82M
  (Apache-2.0, 28 voices; verified working in Node on the owner's PC today: fp32 renders
  at roughly half real time, model cached after the first ~300 MB download) over every
  script, caller line, sign-on/off, letter-free. Output `public/voice/<hash>.mp3` plus an
  index (text hash → file, seconds, per-word timing estimate). Only changed lines
  re-render. Falls back to `speechSynthesis` for any missing line, so content iteration
  never blocks on rendering.
- **Everything goes through the radio chain.** Pre-rendered voices are buffers, so the
  band-limit, tube drive, ducking, tuning static and tube faults all apply. Callers get a
  phone chain first (300–3400 Hz, harder clip). Off-air listening is the phone chain
  alone, no static: you're on the handset.
- **One voice per person,** chosen once in the registry. Recognizability by ear is the
  goal. The DJ gets one Kokoro voice until the owner records their own lines, which drop
  into the same folder by id and win.
- **The Other Station is the DJ's own buffers, wronged:** slower (playbackRate ~0.92),
  narrower band, a short doubled delay, the drone under it. Same words, same voice, wrong.
- **The delay buffer is audible:** on air, the caller's voice runs a few seconds behind
  the handset monitor, so the dump makes sense to the ear.
- Keep: records, static, hum, rain, thunder, phone ring, the sfx set. Add: a cheap
  "carrier" tone for the second station, a hard "censor" bleep on dump (exists), and the
  transmitter's own breathing (a low fan loop) so silence is never nothing.
- Volume sliders (music / voice / static) and pause come with the polish packet.

## 11. Dawn and feedback

The Ledger keeps its three movements and gains:

- **Rumor lines** (tone `rumor`, set in italics-ish dim ink): things people are saying
  that may be wrong. Some reach checks produce a rumor at dawn and the truth a night later.
- **Delayed lines**: a night can contribute lines gated on older flags ("The Ostrowski
  boy asked at the memorial why nobody said anything about the ice").
- **Letters, plural**: one to three per night, from named people, some about the Other
  Station, some about what you did to them. The Other Station letter stays last.
- **Notices**: obituaries, missing persons, a faction statement, a classified. The
  classifieds are where chits are spent (spares, a record) with one click.
- **Last edition** (Night 6): a headline chosen from state, the stories, the final
  letters, and who was listening.

The page never shows a number for anything but the meters. No "trust +4".

## 12. Architecture changes

Required before content can scale; all in `src/sim/` with tests, none a rewrite:

1. **Night events.** `NightDef.events: NightEvent[]` replaces the singleton
   `switchboard` / `tube` / `morse` / `storm`. An event has an id, a trigger (`slot`,
   `frac`, `during: 'any' | 'record' | 'talk'`) and a kind. `ShowPerformance` records
   per-event outcomes. Nights 1 and 2 migrate; the every-opening test extends to events.
2. **People registry** and automatic person flags in the resolver.
3. **Gate contexts**: `tonight` flags and stat thresholds, evaluated by one function.
4. **Live rundown**: the scene's rundown is mutable until sign-off; the resolver already
   takes the final list. Swaps are recorded in the performance for the ledger.
5. **Dumped text capture** in the performance (`calls[].dumpedAt` exists; add the
   person and the sentence to the Other Station's material).
6. **Tuning with two carriers**: `Tuning.quality` becomes a function of the night's
   carriers; the intrusion is a pure model (`src/sim/intrusion.ts`).
7. **Inventory in TownState**: spares by tube type, records owned.
8. **Save/load**: serialize `run` at dawn to localStorage; version the shape.
9. **Voice index** consumed by `src/audio/voice.ts`; buffers through the engine.
10. **`BoothScene` split**: the live state machine stays, but each booth task's driver
    moves to `src/scenes/live/<task>.ts` so adding events doesn't grow one 900-line file.
    No behavior change; shots prove it.

## 13. Implementation packets, in order

Ordered by player-perceived impact × dependency × risk. Each packet ends with tests,
build, shots, and a look at the PNGs. One commit per packet.

| # | Packet | Who | Depends on |
| --- | --- | --- | --- |
| **A** | **Voice pipeline**: `tools/voices.mjs` (Kokoro, hashing, index), engine voice playback through the chain, phone chain, Other Station processing, speechSynthesis fallback, word-timing estimate for the teleprompter and dump. Renders Nights 1–2. | Sonnet/Opus from spec; director verifies by ear with the owner | none |
| **B** | **Events + people + gates + save**: architecture items 1–3, 7, 8; migrate N1/N2 data; tests; `BoothScene` split (item 10). | Opus from spec; director reviews | none |
| **C** | **Switchboard v2**: multiple rings, rings during records, partial/misleading previews, unmarked turns, tonight-gated callers, off-air confidences, dumped-sentence capture, audible delay. Night 1–2 boards reworked to use it. | director designs; Sonnet implements UI | A, B |
| **D** | **The desk and the cue as decision**: live swaps, hedged reads, source lines instead of truth, mail and classifieds at prep, chits spend, spares inventory, degraded running. | Sonnet from spec | B |
| **E** | **The Other Station live**: intrusion model, two-carrier tuning, overrides, bleed audio, reads dumped sentences and the unpicked answer. | director + Opus | A, B |
| **F** | **Stats that matter**: listeners scale, trust-shifted thresholds, stat gates, credibility and who calls. Small, all sim. | Sonnet | B |
| **G** | **Nights 1–2 revision** on the new systems (sources, second ring, people, letters). Records fetch (+8). | director writes; Haiku wires | C, D |
| **H** | **Night 3: Two Lamps** | director structure and key lines; Sonnet drafts; director edits | C, D, E |
| **I** | **Night 4: The Freeze** | same | H |
| **J** | **Night 5: Silence** | same | I |
| **K** | **Night 6: Dead Air** + endings (last edition) | director | J |
| **L** | **Dawn layering**: rumor lines, delayed lines, letters, notices, last edition. | Sonnet from spec | B (can start early; content lands with G–K) |
| **M** | **Polish**: pause, volume sliders, first-time hints, title continue, docs. | Haiku/Sonnet | everything |

A and B run in parallel first: A is the biggest jump in perceived quality and has no
dependencies; B unblocks everything else. C and E are the story engines and come next.

Done (2026-10-06):

- [x] **A** Voice pipeline: Kokoro lines rendered offline, played through the radio chain (`7c09ac0`).
- [x] **B** Events, people, gates, save/continue (`e47f33b`).
- [x] **C** Switchboard v2: confides, requests, patience, the audible delay, dumps read back (`6095fa8`).
- [x] **D** The desk: live swaps, hedged reads, sources, the spares drawer, classifieds (`1da99af`).
- [x] **E** The Other Station live: two carriers in the storm, overrides mid-show (`c7be35f`).
- [x] **F** Stats that matter: listeners scale the audience, trust shifts reach (`2aa73f4`).
- [x] **G** Campaign wiring: Nights 3-6 (the content of H-K) in, with the rules they need (gated
  events, dawn lines, letters, headlines, groups, ends-the-show, Other Station variants) and
  their voices. The records fetch planned for G landed earlier (`79ba260`). Still open from
  H-L: the climax's HOLD / CARRY / COUNTER, rumor ink at dawn, several letters a night.
- [x] **K** Night 6's climax is a choice: hold the dial to jam it (dead air, half signal for the
  slot), let it carry, or SPACE to talk over it with the counter card at half reach. Its
  lines lead the ledger; `?counter` for the auto show (`f1f4f9d`).
- [x] **M** Polish: pause (ESC / PAUSE), music / voice / static volume sliders (saved), first-time
  hints (saved with the run), rumor ink at dawn, version and `six nights` on the title, canvas
  focus, README controls table.

## 14. Playtest gates (owner)

Short, only questions a person can answer. Three gates.

**Gate 1, after A–D, Nights 1–2 reworked.** Play Night 1 then Night 2, no switches.
- Did a caller's voice sound like a person? Could you tell Grace from Lottie with your eyes closed?
- Did you listen off air before putting someone on? Did it help, or lie to you?
- Did you swap anything live? Why?
- Was there a moment you wanted to air two things and couldn't?
- Did the dump feel like a decision or a reflex?

**Gate 2, after H–I, Nights 1–4.** Play straight through.
- Did Night 3 feel different from Night 2, and Night 4 from Night 3? In what way?
- When the other carrier appeared, what did you think it was? Threatening, intriguing, scripted?
- Did you believe the anonymous man on Night 3?
- Did anything at dawn surprise you in a good way? Anything confuse you?
- Was any booth task annoying rather than tense? Which?

**Gate 3, after K–L, the full run.**
- What's the story of your run, in three sentences?
- Which person do you remember? Who do you regret?
- Did the ending feel like yours?
- Would you play again to do it differently? What would you change first?

## 15. Definition of done

- Six nights, each with its own shape, playable start to finish in about an hour, saved
  between nights, with a title that continues.
- A cast of about a dozen people with one voice each, pre-rendered, through the radio
  chain; the owner's own lines drop in by id.
- The switchboard rings at least twice a night, with callers who recur, react to tonight,
  mislead, and remember.
- Live swaps and hedged reads; the desk; chits that buy spares and records; a drawer that
  can be empty.
- The Other Station is live on the dial from Night 3, overrides from Night 4, and its last
  broadcast is made of the player's omissions.
- Dawn: rumor, delay, letters, notices, a last edition. At least two consequences that
  pay off two or more nights later.
- Tests cover every gate opening, every event schedule, every ending condition, the save
  shape, the voice index. `npm run shots` covers each night and each new panel.
- `README.md`, `DESIGN.md`, `HANDOFF.md`, `TODO.md` describe the game that exists.
- The owner, after Gate 3, can tell the story of their run without mentioning a minigame.

## 16. Questions for the owner (not blocking; answered by default if silent)

1. **The DJ's Kokoro voice** until you record: default `am_michael` (warm, mid). Say if
   you'd rather a woman's voice or an older one; it's one line in the registry.
   *Answered 2026-10-07: keep `am_michael`. The Other Station stays the DJ's own voice, pushed further.*
2. **Night 6's setting event**: the grid switch-on (hopeful) or the storm evacuation
   (grim), or both colliding. Default: both, with the switch-on scheduled for the night
   the storm comes, because that's the night people stay up with their radios.
3. **Records**: all right to fetch about eight more public-domain 78s from archive.org
   (free; adds roughly 15 MB to the repo)? Default: yes.
4. **Chits name**: still "chits"? Default: keep.
5. **The first-person "you" of the paper**: the Ledger addresses the DJ as "you" now.
   Keep, or make it a real paper that writes about "the Lamp" in third person? Default:
   keep "you" for the lines, third person for notices and the last edition's headline.
