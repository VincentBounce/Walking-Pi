# Walking Pi

## Bundles
The user always makes the app's single-file versions with the script `_Make Walking Pi.html.command` in the folder
`Walking Pi resources` beside the repo (double-click). It runs `tools/bundle.py` twice and makes two HTML files there:
- `Walking Pi v<version> compressed.html`: no comment anywhere: not in the scripts (main.js, emoji.js, punks.js,
  pixelarticons.js: `//`, `/* */`), the page's inline script (the theme's), the loader, style.css (`/* */`) or
  index.html (`<!-- -->`); blank lines and line-end spaces gone; the scripts gzipped (base64);
- `Walking Pi v<version> plain.html`: the scripts, style and page as they are, comments and all (`--plain`).

Keep `tools/bundle.py` working for that script: its arguments, its output names and folder. After changing it: grep the
compressed file for `//`, `/*` and `<!--` (outside URLs and the base64), open it from the local server (a copy in the
repo, deleted after), no console error, and `walkingCheck()` passes in it.
