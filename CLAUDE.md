# Dead Air — agent guide

A small browser game: run a pirate-ish AM radio station in a post-collapse Lake Erie town.
Phaser 4 + TypeScript + Vite. Read `HANDOFF.md` first if you're new to the project, then
`DESIGN.md` for the game and `TODO.md` for what's next.

## Commands

- `npm run dev` — dev server at http://localhost:5173 (hot reload)
- `npm test` — Vitest unit tests (game rules and data)
- `npm run typecheck` — TypeScript, no emit
- `npm run build` — typecheck + production build to `dist/`
- `npm run shots` — headless play-through: screenshots to `shots/`, fails on any console error.
  Pass a filter: `npm run shots -- dawn`. Set `CHROMIUM_PATH` if Playwright's browser isn't installed.

URL switches (see `src/config.ts`): `?fast` short records/talk, `?auto` plays itself,
`?mute` silent, `?nofx` no post effects, `?scene=booth|dawn` jump in, `?night=N` start at
night N (earlier nights resolved as their `?auto` shows).
`window.__deadair` exposes the current phase and the game object for debugging.

Rendering notes: the room is lit with Phaser 4 lights (`setLighting`) and post effects in
`src/scenes/fx.ts`. UI lives on a second, clean camera (`splitCameras`); pass new UI roots
through its `ui()` helper or they'll render twice. Phaser 4's vignette darkens from the
center outward, so keep its strength low.

## Layout

- `src/sim/` — game rules. **Pure TS, no Phaser, no DOM.** Everything here is unit-tested.
- `src/data/` — content: nights (`nights.ts` lists them in order), cards, records (with
  provenance). Typed TS objects. Cards and callers can be gated on earlier nights' flags.
- `src/audio/` — Web Audio: radio chain, static, stand-in pressings, voice.
- `src/art/` — pixel art painted in code at boot (palette + painter + scenes).
- `src/scenes/` — Phaser scenes. `src/ui/` — reusable UI pieces.
- `tests/` — Vitest. `tools/shots.mjs` — screenshot/smoke tool.

## Rules

- Keep the process light: one commit per feature, play a build every session.
- Game logic goes in `src/sim/` with tests. Scenes call into it; they don't hold rules.
- Bug fixes: add a failing test first when the bug is in `src/sim/` or `src/data/`.
- Before committing: `npm test`, `npm run build`, and `npm run shots` when visuals or flow changed.
  Look at the screenshots.
- Real records must be public domain with full provenance (`public/records/README.md`).
  Never add copyrighted audio.
- Names marked (placeholder) in `DESIGN.md` are the owner's to finalize.
- Don't explain the Other Station in content. The owner decides what it is.
