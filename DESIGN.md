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
- **Keep the signal tuned.** The transmitter drifts; hold it on frequency. Static rises
  as you drift. Your average signal multiplies your reach.
- **Cue the next item** before the air goes silent. Every second of dead air costs
  Listeners and Credibility.
- **Callers.** The phone lights up. Put them on air or let it ring. Choices matter.

### 3. Sign-off, the Other Station, and dawn

After you sign off, the dial slips. On 1260, a voice reads **the card you chose not to
air**, word for word, timestamped days from now. Then dawn: the town's report. Meters,
what changed, and who noticed.

### Rules of the broadcast (resolver)

Pure TypeScript in `src/sim/`, fully unit-tested. In short:

- A card's effect on a faction = its base effect × that faction's share of the segment's
  audience × your signal quality.
- Town effects (Morale, Safety, Listeners) scale with the segment's total audience.
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
- **Voices:** `speechSynthesis` for v1. Note: browser TTS can't be routed through Web
  Audio, so its radio effect is static and crackle *under* the voice, not a filter on it.
  Upgrade path: an in-browser neural TTS that renders to audio buffers (filterable), and
  the owner's own recorded lines as audio files.

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
