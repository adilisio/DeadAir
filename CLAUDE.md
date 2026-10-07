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
- `npm run probe -- N` — play night N headless on `?auto` and print what the resolver made
  of it: signal per slot, flags, every dawn line, the headline. For checking content.
- `npm run play` — Night 1 at real pace with a scripted player (tasks, calls, a dump).
- `npm run voices` — render spoken lines with no voice file yet (Kokoro, offline, CPU) into
  `public/voice/`. Run it after editing any spoken text; `-- --list` shows what's missing.

URL switches (see `src/config.ts`): `?fast` short records/talk, `?auto` plays itself,
`?mute` silent, `?nofx` no post effects, `?scene=booth|dawn` jump in (booth continues a
saved run), `?night=N` start at night N, 1-6 (earlier nights resolved as their `?auto` shows;
wins over a save), `?reset` forget the saved run, `?drift` (with `?auto`) lean toward 1250 in storms, `?counter`
(with `?auto`) talk over the last night's climax instead of holding the dial. ESC pauses.
`window.__deadair` exposes the current phase and the game object for debugging.

Rendering notes: the room is lit with Phaser 4 lights (`setLighting`) and post effects in
`src/scenes/fx.ts`. UI lives on a second, clean camera (`splitCameras`); pass new UI roots
through its `ui()` helper or they'll render twice. Phaser 4's vignette darkens from the
center outward, so keep its strength low.

## Layout

- `src/sim/` — game rules. **Pure TS, no Phaser, no DOM.** Everything here is unit-tested.
  `events.ts` schedules a night's events (`eventsDue`); `nights.ts` has gates
  (flags, stats, tonight); the resolver sets person flags (`grace_cut`, `grace_cut_2`);
  `save.ts` is the versioned save shape (`run.ts` reads and writes `localStorage`).
- `src/data/` — content: six nights (`night1.ts` to `night6.ts`; `nights.ts` lists them in
  order), cards, a night's `events` (switchboards, tubes, Morse, storms; any number of
  each), its `dawnLines`, `letters` and `headlines`, records (with provenance), people
  (`people.ts`: every caller is one). Typed TS objects. Cards, callers, events and
  intrusions can be gated on earlier nights' flags (`aired_<card>` for every card that
  aired), town stats, and (callers, desk cards) what aired or was confided tonight.
- `src/audio/` — Web Audio: radio chain, static, stand-in pressings, voice (pre-rendered files
  played on air / phone / handset / Other Station channels; `lines.ts` lists every spoken line).
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
