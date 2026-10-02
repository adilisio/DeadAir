# Records

Real records are public-domain 78s listed in `src/data/records.json` and downloaded
here by `npm run records`. `CREDITS.md` (generated) lists every source.

## The rule

Only **public-domain** recordings. In the United States, sound recordings first
published **before 1926** are public domain as of 2026 (Music Modernization Act; the
cutoff moves forward one year every January 1). The **song** must also be public domain:
published before 1931 as of 2026. Prefer original US pressings over modern reissues.

`tests/data.test.ts` enforces the year and that every provenance field is filled.

## Adding a record

1. Find the record on the Internet Archive's Great 78 Project (https://archive.org/details/georgeblood).
   Check the label and date look right for an original pressing.
2. Add an entry to `src/data/records.json`: id, title, performer, year, label, composer
   (with the song's year), `archiveId` (the item id from the URL), `sourceFile` (the mp3's
   file name in that item), `file` (a short `snake_case.mp3` name), and a `fallback`
   stand-in style.
3. `npm run records` downloads it, converts it with ffmpeg if you have it (mono, trimmed,
   loudness-matched), and rewrites `CREDITS.md`.
4. `npm test`, then use it on a card in a night file.

If a file is missing the game plays a synthesized stand-in in its place and says so on
the teleprompter.
