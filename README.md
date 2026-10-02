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

## How a night works

1. **Prep.** Pick six cards from the crate into three segments. Hover a card to read it and
   see who it's for; the bars next to each segment show who's listening then.
2. **Live.** Your show plays: records, news, warnings, ads, all read on air.
   - When a storm hits, **hold A / D** (or the arrow keys, or press on the TRANSMITTER
     gauge) to keep the signal on 1260. Static means fewer people heard you.
   - **SPACE** cues the next talk item when the cue opens near the end of the current one.
     If nothing's cued when an item ends, that's dead air.
   - Records start themselves: the tonearm swings in, and **SPACE** drops the needle.
     Land it on the green lead-in groove. Early scratches on air; late loses the intro.
   - If a tube blows, the music dies: **Q / W / E** seats the spare that matches the dead
     socket. A wrong one is a dud and costs a second.
   - When the switchboard lights up: **1 / 2 / 3** listens in on a line off air; press it
     again (or **ENTER**) to put them on. **X** dumps a caller who says something that
     mustn't go out. The station runs a few seconds behind the phone, so a quick dump
     keeps it off the air. **SPACE** goes back to the show.
3. **Sign-off.** Then leave the set on for a minute.
4. **Dawn.** The town's paper tells you what your show did.

## Settings (URL switches)

| Add to the URL | Effect |
| --- | --- |
| `?nofx` | No bloom, CRT curve or vignette (slow PCs) |
| `?mute` | Silent |
| `?fast` | Short records and talk: a whole night in about a minute |
| `?auto` | The game plays itself (for testing) |
| `?scene=booth` / `?scene=dawn` | Skip straight to a scene |

Combine them with `&`, e.g. http://localhost:5173/?scene=booth&fast

## Develop

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests for the game rules and content |
| `npm run build` | Typecheck + production build in `dist/` (open with any static server) |
| `npm run shots` | Headless play-through; screenshots in `shots/` |

First time running `npm run shots` on a new machine: `npx playwright install chromium`.
