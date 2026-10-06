# DEAD AIR — Design

*Working title. Names marked (placeholder) are easy to change; ask the owner before treating them as final.*

## Pitch

You keep the last working AM transmitter on the south shore of Lake Erie, sixty-odd
years after the collapse. By day you gather records, transmitter parts and gossip. By
night you go live, and what you broadcast changes the town. One night a second station
starts broadcasting on your frequency, and it knows things you haven't said yet.

**Tone:** lonely, funny, warm. A voice in the dark keeping people company. Night Vale
meets Fallout radio. Never grimdark for its own sake.

## Pillars

1. **The broadcast is the verb.** Everything you do by day exists to feed the show.
   The show is how you act on the world.
2. **Small town, long memory.** Every choice leaves a visible mark: a faction's trust,
   a boat that stayed in, a rumor that spread.
3. **Lonely, funny, warm.** The writing and sound carry the game. Humor lives next to
   melancholy. The town is worth saving.

## World (placeholders)

- **Port Vesper, Ohio** — a harbor town on Lake Erie's south shore. (Vesper: the evening
  star, and the evening prayer.)
- **WLMP 1260 AM, "the Lamp"** — your station, wired into the base of the old Vesper Point
  lighthouse. The antenna runs up the tower.
- **Factions** (names settled; details still growing), each with a trust score 0–100:
  - **The Netters** — fishing families of the harbor. Up at 3 a.m., practical, superstitious.
  - **The Chapel** — the church on the hill. Runs the only infirmary and school. Kind,
    powerful, and certain about what people should hear. Early to bed.
  - **The Linemen** — engineers and dreamers restringing the dead lines to bring the power
    back. Your working transmitter is their proof it can be done. Idealistic, a bit reckless,
    up all night on the pylons.
- **The town** — Morale and Safety, plus how many Listeners you have.
- **You** — Credibility (do people believe you?) and Chits (the town's scrip; sponsors pay you).
- **The Other Station** — something on 1260 after you sign off. Never explain it early.

## The day (M2+)

One day moves through three small modes on one shared top-down engine:

1. **Morning — town.** Walk and talk. Requests, rumors, tips become show cards.
2. **Midday — the map.** Pick a destination. A text event with a choice on the way.
3. **Afternoon — a run.** Two to four minutes sneaking and looting a ruin: records,
   tubes, wire, stories. Avoid more than fight.

Playtesting decides which mode deserves to grow.

## The night (M1: the core)

### 1. Prep — build the rundown

You have a crate of **cards** for tonight. The show has **3 segments × 2 slots**:

| Segment | Clock | Who's listening |
| --- | --- | --- |
| Dusk | 8 p.m. | Everyone. Biggest audience. |
| Late | 11 p.m. | Linemen mostly; a few of the Chapel. |
| Small Hours | 2 a.m. | Netters getting the boats ready. Few others. |

Card kinds:

- **Record** — a song. Genre and mood. Each faction has tastes.
- **News** — something that happened. True, rumor, or false. False news hits hard now
  and costs Credibility when it unravels.
- **Warning** — a public-safety notice. Matters most if the right people hear it.
- **Ad** — a sponsor pays Chits. Listeners hate two in a row.

Where a card airs matters as much as which card: the same warning saves lives at 2 a.m.
and is wasted at 11.

### 2. Live — run the show

The show plays in real time.

- **Records** play (real 78s, or synthesized stand-ins with a 78 sound).
- **Talk** is read by the browser's voice with radio static under it, with a teleprompter.
- **Ride out the storm.** Most of the night the transmitter holds 1260 on its own. When a
  squall comes off the lake (a night's `storm` events), lightning knocks the carrier off and
  the wind pushes it around; hold it on frequency. Static rises as you drift. Your signal
  multiplies your reach, and the ledger reports whether the Lamp held through the storm.
- **Cue the next item** before the air goes silent. Every second of dead air costs
  Listeners and Credibility.
- **Drop the needle.** Records don't need cueing; the tonearm swings in and the player
  drops it on the lead-in groove. Too early skates across the record on air (Listeners,
  Credibility, and the ledger names the record); too late skips the intro (a little
  Listeners). Every record clean gets a kind word at dawn.
- **Swap a blown tube.** When a night's `tube` event comes due, a transmitter tube blows mid-item
  and the program drops to a whisper. Read which socket went dark, pick the matching spare
  from three; a dud costs a second of fumbling, the right one warms up and the Lamp comes
  back. Lost seconds cost signal; the ledger praises a quick swap or reports a slow one.
- **The switchboard.** When a night's `switchboard` event comes due, up to three lines ring at
  once, each with a few words on the board. Listen in off air to hear a line before
  deciding; put as many on as you like before the lines give up (the clock pauses while
  someone's on). Each line has its own outcome for airing, never being taken, or being cut
  off. On air, the teleprompter shows only what the caller has said so far.
- **The dump button.** Some callers turn: `turn.at` marks the first words that must not go
  out. The station runs a few seconds behind the phone (`DUMP_DELAY_CHARS`), so dumping
  just after they turn still keeps it off the air. Dump too late and it went out; dump an
  honest caller and you cut them off.
- **Morse under the static.** A night's `morse` event keys a word over and over, faint,
  for a set time. It can carry a `sender` (Night 2 on, Teddy at the relay hut). The panel shows a keying lamp, a tape of the current pass,
  and a chart of the word's letters among decoys; the player types the letters (a wrong
  one costs three seconds). Copied or faded, each has its own outcome at dawn.
- **Two carriers.** Some slots put a second carrier on the dial at about 1250 (the Other
  Station's `intrusions`, kind `carrier`; Night 2 has one in its squall). The gauge shows
  it as a dim green needle and reads TWO CARRIERS. On 1260 it's nothing; drift toward 1250
  and it bleeds through yours, louder on a weak tube: its voice, reading the card it would
  read at sign-off, and a second whistle. If the town heard enough of it over those slots
  (average bleed 0.35 or more), dawn treats that card as aired, by "you": its effects
  (no chits), its reach outcome instead of the unaired one, and a line saying so.

Each night schedules its tasks as a list of **events** (`events` in the night data: any
number of `switchboard`, `tube`, `morse` and `storm`), so the show changes texture
segment to segment instead of repeating one task. An event fires once, at `at: { slot,
frac }`: with no `frac` it fires between items, just before item `slot` begins; with a
`frac` it fires once that much of the item has played. A switchboard that comes due during
a record rings over it (the record plays on, ducked under any call); one that comes due
during talk waits until the talk ends. Anything whose item ended before its moment fires
before the next item. Storms are wind over whole slots. `src/sim/events.ts` has the rules
(`eventsDue`); the scene asks it and keeps the set of events already fired.

### Nights in a run

The town (stats, faction trust, story flags, and what the station has done to each
caller) carries from each dawn into the next night, and the run is saved at each dawn and
when the next night begins (`localStorage`, versioned). The title offers "continue:
night N".

A night's cards and switchboard lines can carry a **gate**: flags (`requires` /
`unless`), stat thresholds (`when`: `morale`, `safety`, `credibility`, `listeners`,
`chits`, `trust.<faction>`, min and max inclusive), and for callers only, what has aired
so far tonight (`tonight: { aired, notAired }`). Before prep the night is opened against
the town, so the crate and the boards hold only what's in play; when a board rings, its
lines are checked again against what has aired by then.

**People remember.** Every caller is a person (`src/data/people.ts`). At dawn the
resolver counts each of their calls as aired, cut, dumped or ignored (a late dump counts
as aired and dumped) and sets flags like `grace_cut`, and `grace_cut_2` the second time,
for later content to gate on. This is how one night's choices show up in the next:
copy Night 1's Morse and the Wozniak brothers come back with a tip; lose a boat and the
Chapel holds a memorial; let a slander air and Sister Agnes asks to reply; find Teddy and
Grace Okafor calls to thank the Linemen, or don't and she calls to tell them off.

Each night also moves its booth tasks around. Night 1: needle and tube at dusk,
switchboard and storm late, Morse in the small hours. Night 2: switchboard at dusk, tube
and Morse (from Teddy) late, the storm in the small hours, right on top of the squall
warning.

### 3. Sign-off, the Other Station, and dawn

After you sign off, the dial slips. On 1260, a voice reads **the card you chose not to
air**, word for word, timestamped days from now. Then dawn: the town's report. Meters,
what changed, and who noticed.

**Overrides** (`intrusions` of kind `override`, from a moment in the show for some
seconds) don't wait for sign-off: it takes the frequency, the program drops under it and
the needle pins to 1250 while it reads an unaired card; holding the dial hard against it
(on a healthy tube) lets it go up to 40% sooner, and the town acts on what it read.

### Rules of the broadcast (resolver)

Pure TypeScript in `src/sim/`, fully unit-tested. In short:

- A card's effect on a faction = its base effect × that faction's share of the segment's
  audience × your signal quality.
- Town effects (Morale, Safety, Listeners) scale with the segment's total audience.
- **Listeners scale the audience:** everything above is also multiplied by tonight's
  audience factor, listeners / 140 kept between 0.5 and 1.5 (set from the night's start).
  A town that has stopped tuning in hears you less; a crowd hears you more.
- **Trust shifts reach thresholds:** a faction's threshold is multiplied by
  1.3 − 0.6 × trust / 100 (trust 50: unchanged, 100: ×0.7, 0: ×1.3). A faction that trusts
  you acts on less; one that doesn't needs more of its people listening.
- **Breather:** a grim item followed directly by a record cancels the grim item's Morale hit.
  Two grim items in a row cause panic (extra Morale loss).
- **Ad fatigue:** two ads back to back lose Listeners.
- **Dedication:** a record a faction loves, right after news that helps that faction, earns
  extra trust.
- **Reach checks:** some warnings and calls only work if the right people hear them
  (share × signal ≥ threshold). These set story flags the dawn report reads.
- **Lies unravel:** false news sets an immediate effect, then a Credibility loss at dawn.

## Look

- 640×360 logical screen. Pixel art is painted at 320×180 and scaled 2× (nearest).
- Real lighting: Phaser 4 point lights with self-shadowing over dark, cool pixel art;
  warm tube glow, a desk lamp, the lighthouse beam sweeping through the window.
- Post: bloom on bright things, a slight barrel curve, vignette, scanlines (CRT feel).
- Font: VT323 (OFL) for all UI text.
- Palette: night blues and slate, warm amber and tube orange, one sick green for the
  Other Station.

## Sound

- One Web Audio graph. Every program source goes through the **radio chain**
  (band-limit ~250 Hz–4 kHz, tube saturation, compression) and is mixed with **static**
  driven by tuning error.
- **Records:** real public-domain 78s (US recordings published before 1926) from the
  Internet Archive's Great 78 Project, listed in `src/data/records.json` with full
  provenance and fetched by `npm run records`. Each faction has its music: sea songs for
  the Netters, hymns for the Chapel, the "new music" (1920s jazz and blues singers) for the
  Linemen. If a file is missing, a synthesized stand-in pressing plays in its place.
- **Voices:** every line is rendered offline with Kokoro TTS, one voice per person, and
  played through the radio chain (callers through a phone filter first; the Other Station
  is the DJ's own voice, slowed and doubled). The owner's recorded lines drop in as files.
  The browser's `speechSynthesis` is only a fallback for lines not rendered yet.

## Milestones

| # | Name | Playable result |
| --- | --- | --- |
| M0 | Scaffold | Build, tests, screenshot tool |
| M1 | One Night | The booth: prep, live show, the Other Station, dawn report |
| M2 | One Day | Town walk, map + one event, one ruin run, feeding the night |
| M3 | One Week | 7 days, 3 factions, transmitter upgrades, the mystery deepens, save/load |
| M4 | Ship it | Art and content pass, endings, menus, itch.io release |
| Stretch | Real voices | Owner recordings; in-browser neural TTS |

## Open questions

- Final names: the DJ. (Settled: Port Vesper, the Lamp, Netters, Chapel, Linemen.)
- What the Other Station is (decide by M3; reveal late).
- How long a full playthrough is (target: 7 nights, ~2 hours?).
