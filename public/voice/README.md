# Voices

Every spoken line in the game, as audio files: the DJ's sign-on, sign-off and talk cards,
every caller's off-air preview and on-air call, and the Other Station's intro, date stamp
and goodbye (in the DJ's voice; the game makes it sound wrong at playback).

The game plays these through its radio chain, so static, tuning, the dump and blown tubes
all reach the voices. A line with no file falls back to the browser's own voice.

## Files

- `<id>.mp3`: one line. The id is a hash of the voice that reads it and the exact words
  (`src/audio/lines.ts`), so editing a script gives that line a new id.
- `index.json`: `{ "version": 1, "lines": { "<id>": { "file", "seconds", "person" } } }`.
  The game only plays lines listed here. `seconds` paces the teleprompter.

## Re-rendering

```sh
npm run voices                  # render lines that have no file yet (new or edited text)
npm run voices -- --list        # show what would be rendered
npm run voices -- --only grace  # only lines whose person id or text matches
npm run voices -- --force       # render again even if a file exists
```

This runs Kokoro-82M (Apache-2.0, `kokoro-js`) on the CPU with one voice per person, as
set in `src/data/people.ts`. The first run downloads the model (about 330 MB). Changing a
person's voice or rate gives all their lines new ids. With ffmpeg on the PATH the files
are loudness-evened mono MP3s at 32 kbps; without it they stay WAV. Old files for edited
lines stay behind; the tool lists index entries that no longer match any line.

## Your own recordings

Record a line, save it as `<id>.mp3` here (find the id with `npm run voices -- --list
--force --only "<a few words of the line>"`), and replace the file that's there. Or put
your file under any name and point that line's `file` at it in `index.json`; set
`seconds` to its length. The game uses whatever the index points to, and `npm run voices`
leaves existing files alone unless you pass `--force`.
