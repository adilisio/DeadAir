# Records

Real records are audio files in this folder, registered in `src/data/records.ts`.

## The rule

Only **public-domain** recordings. In the United States, sound recordings first
published **before 1926** are public domain as of 2026 (Music Modernization Act; the
cutoff moves forward one year every January 1). The **composition** must also be public
domain: published before 1931 as of 2026.

So for now: a record must be **published 1925 or earlier**, and its song written 1930 or
earlier. `tests/records.test.ts` enforces the year and that every field below is filled.

## Adding a record

1. Find a recording from a source that states its date and public-domain status, e.g.
   the Library of Congress National Jukebox, the UCSB Cylinder Audio Archive, or
   Wikimedia Commons. Prefer sources that say "public domain" outright.
2. Save it here as `.mp3` or `.ogg` (browsers play both). Keep files small: mono, 96 kbps is plenty.
3. Add an entry in `src/data/records.ts` with every provenance field:
   `title`, `performer`, `year` (first published), `composer`, `sourceUrl`, `licenseNote`.
4. Run `npm test`.

The build can't download these by itself in every environment, so adding records is a
human step for now. Until then the game uses synthesized stand-in pressings.
