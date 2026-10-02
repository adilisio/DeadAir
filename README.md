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

Open http://localhost:5173 and click to sign on. Use headphones: it's a radio game.

## Develop

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests for the game rules and content |
| `npm run build` | Typecheck + production build in `dist/` (open with any static server) |
| `npm run shots` | Headless play-through; screenshots in `shots/` |

First time running `npm run shots` on a new machine: `npx playwright install chromium`.
