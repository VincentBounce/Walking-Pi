# Walking Pi

## Bundles
The user always makes the app's single-file versions with the script `_Make Walking Pi.html.command` in the folder
`Walking Pi resources` beside the repo (double-click). It runs `tools/bundle.py` twice and makes two HTML files there:
- `Walking Pi v<version> compressed.html`: no comment anywhere: not in the scripts (main.js, emoji.js, punks.js,
  pixelarticons.js: `//`, `/* */`), the page's inline script (the theme's), the loader, style.css (`/* */`, minified by
  esbuild too) or
  index.html (`<!-- -->`); blank lines and line-end spaces gone; the scripts and the inline script minified by esbuild
  (`brew install esbuild`; top-level names kept: a script, not a module; without it, only their comments gone), then
  gzipped (base64);
- `Walking Pi v<version> plain.html`: the scripts, style and page as they are, comments and all (`--plain`).

Keep `tools/bundle.py` working for that script: its arguments, its output names and folder. After changing it: grep the
compressed file for `//`, `/*` and `<!--` (outside URLs and the base64), open it from the local server (a copy in the
repo, deleted after), no console error, and `walkingCheck()` passes in it.

Never delete the bundles in `Walking Pi resources` (old versions included): the user keeps them to compare versions.

## Comment hierarchy (main.js)
- The file opens with a banner (`WALKING π — main.js`) and a "How it fits together" overview of its parts.
- A part: a banner of `=`, 96 columns wide, its title in capitals, then a few lines on what it does:
  ```
  /* ==============================================================================================
   * PART 6 — WALKS ON LATTICES AND SPIRALS
   * ==============================================================================================
   *
   * A stepper turns one digit into the next cell. …
   */
  ```
- A section: one line, numbered by its part, padded with `-` to the same width:
  `/* ---- 6.1 Square grid ------------------------------------------------------------------------- */`
- A section added later between two others takes a letter (`7.4b Möbius strip`, `9.1b Patterns`), not a renumbering.
- Then plain comments: `//` above a function or a block (what it does, why), `// (…)` at a line's end for a detail.
- A new function goes in the part and section of its concept; a new concept with no section gets one (ask if a
  new part seems needed). PART 8 (Game of Life, ~3,000 lines) has no sections yet: to cut, when decided.

## Line balance
`python3 tools/lines.py [from] [to]` (from: HEAD; to: the files now, or a commit) gives each changed code file's lines
of code only (no comment, no blank line, see `tools/uncomment.py`): before, and +y or −y, nothing else: the « solde » of each
delivery, e.g. `python3 tools/lines.py HEAD~1 HEAD` after a commit.

## Versions
- `const VERSION = '0.2.N'` (main.js, line 40) is the only source; every commit's message ends with it, `(v0.2.N)`.
- The last number goes up by 1 with every commit. The middle one only when the user decides, for a step they name
  (0.2: links that carry their version); the last one then starts again at 0. 1.0 would mean links that keep working.
- Every link ends with `v=` and the version it was made with, kept in Treasures and their JSON files (see `setupFrom`).
  A link that fails: `git log --grep "(v0.2.N)" -F`, its bundle in `Walking Pi resources`, or `tools/at.sh 0.2.N`, which
  serves that version on port 8322 beside this one.

## Removed features
A feature taken out gets a row in `REMOVED.md` (in English) at once: its last version, date, commit, a raw.githack link
that opens it as it was, and why it left.
