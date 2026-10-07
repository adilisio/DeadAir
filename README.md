# Dead Air

*You keep the last working radio transmitter on the Lake Erie shore. By night you go live,
and what you broadcast changes the town. Then a second station starts broadcasting on your
frequency.*

A small browser game built with Phaser 4 + TypeScript. See `DESIGN.md`.

## Play

Requires [Node.js](https://nodejs.org) 20+.

```powershell
npm install
npm run dev
```

Open http://localhost:5173 in Chrome or Edge and click to sign on. Use headphones: it's a radio game.

Voices are pre-rendered into `public/voice/` with `npm run voices` and play through the
radio. A line with no file yet (say, a script you just edited) falls back to the browser's voice.

## How a night works

1. **Prep.** Pick six cards off the desk into three segments. Hover a card to read it and
   see who it's for; the bars next to each segment show who's listening then. News tells
   you where a story came from, not whether it's true. Some cards are alternatives (pick one
   and the others grey out), and a card marked ENDS THE SHOW is your sign-off when it airs.
2. **Live.** Your show plays: records, news, warnings, ads, all read on air.
   - When a storm hits, **hold A / D** (or the arrow keys, or press on the TRANSMITTER
     gauge) to keep the signal on 1260. Static means fewer people heard you.
   - In a storm with **two carriers**, drifting toward 1250 lets the other one through.
   - **SPACE** cues the next talk item when the cue opens near the end of the current one.
     If nothing's cued when an item ends, that's dead air. When the next item is a story
     you can't vouch for, **H** cues it hedged: half the effect, harder to land, but it
     can't come back on you.
   - **TAB** (or THE DESK in the cue box) opens the desk: everything you didn't schedule.
     During a record, at the cue, or in dead air, press **1-9** to put a card on next in
     place of what was there. TAB or ESC closes it.
   - Records start themselves: the tonearm swings in, and **SPACE** drops the needle.
     Land it on the green lead-in groove. Early scratches on air; late loses the intro.
   - If a tube blows, the music dies: **Q / W / E** seats the spare that matches the dead
     socket. A wrong one is a dud and costs a second. The drawer only holds what you have:
     with no spare of the right type, any tube is a bodge, and the Lamp runs weak for the
     rest of the night.
   - When the switchboard lights up: **1 / 2 / 3** listens in on a line off air; press it
     again (or **ENTER**) to put them on. Each line waits only so long (its seconds are on
     its row); a fast red lamp is urgent. Keep listening and a caller may tell you something
     they won't say on the air. On air you hear them first, and the town hears them three
     seconds later (the delay): **X** dumps a caller who says something that mustn't go
     out, and a quick dump keeps it off the air. What you dump may come back.
     **SPACE** goes back to the show.
   - On the last night, at the worst of the storm, the other one takes the frequency and
     you choose: **hold A / D** against it the whole time to jam it, let it through, or
     press **SPACE** (or COUNTER) to talk over it.
   - In the small hours something taps under the static. Read the dots and dashes off the
     tape against the chart and **type the letters** before it fades. Wrong guesses cost time.
3. **Sign-off.** Then leave the set on for a minute.
4. **Dawn.** The town's paper tells you what your show did. The notices page has
   classifieds: spend chits on a spare tube for the drawer, or a record for a later night.
5. **The next night.** The town carries over: its mood, who trusts you, and what happened.
   Each night remembers the ones before it. There are six nights; the last dawn prints a
   headline for how it all went, and START OVER begins a new run.

## Controls

| Key | What it does |
| --- | --- |
| **SPACE** | Cue the next talk item; drop the needle on a record; leave the switchboard |
| **H** | Cue the next story hedged (when it has a hedged read) |
| **TAB** | Open or close the desk (or click THE DESK in the cue box) |
| **1-9** | On the desk: put that card on next. On the switchboard: 1 / 2 / 3 listen in on a line |
| **ENTER** | Put the line you are listening to on air |
| **X** | Dump the caller on air |
| **A / D** or **left / right** | Hold the dial on 1260 in a storm, or against the Other Station (the TRANSMITTER gauge takes clicks too) |
| **Q / W / E** | Seat a spare tube |
| **letters** | Copy the Morse signal from the chart |
| **ESC** | Close the desk if it is open; otherwise pause the show (and go on again). The small PAUSE label, top right, does the same |

Pausing freezes the show: voices, music, timers and dead air all stop. The pause screen has
three volume sliders (music, voice, static), also in the corner of the title screen. Prep and
the dawn ledger do not pause.

The first time each booth task turns up in a run (the needle, a blown tube, the switchboard,
Morse, a storm, the desk, a hedged read, the Other Station taking the dial) a one-line hint
shows for six seconds by the cue box. A continued run does not repeat them.

## Settings (URL switches)

| Add to the URL | Effect |
| --- | --- |
| `?nofx` | No bloom, CRT curve or vignette (slow PCs) |
| `?mute` | Silent |
| `?fast` | Short records and talk: a whole night in about a minute |
| `?auto` | The game plays itself (for testing) |
| `?drift` | With `?auto`: hold the dial toward 1250 in storms instead of on 1260 |
| `?counter` | With `?auto`: talk over the last night's climax instead of holding the dial |
| `?scene=booth` / `?scene=dawn` | Skip straight to a scene |
| `?night=N` | Start at night N (1-6), as if the earlier nights went like their `?auto` shows |

Combine them with `&`, e.g. http://localhost:5173/?scene=booth&fast

The volume sliders are saved in this browser (`localStorage['deadair.volume']`), 80 / 90 / 60
for music, voice and static until moved. A run is saved too (`deadair.save`): after each dawn
the title offers `continue: night N`.

## Develop

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests for the game rules and content |
| `npm run build` | Typecheck + production build in `dist/` (open with any static server) |
| `npm run shots` | Headless play-through; screenshots in `shots/` |
| `npm run voices` | Render spoken lines that have no voice file yet (Kokoro TTS, offline) |

First time running `npm run shots` on a new machine: `npx playwright install chromium`.
