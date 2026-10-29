# Walking Pi

## Bundles
The user always makes the app's single-file versions with the script `_Make Walking Pi.html.command` in the folder
`Walking Pi resources` beside the repo (double-click). It runs `tools/bundle.py` twice and makes two HTML files there:
- `Walking Pi v<version> compressed.html`: the scripts without their comments, gzipped (base64);
- `Walking Pi v<version> plain.html`: the scripts as they are, comments and all (`--plain`).

Keep `tools/bundle.py` working for that script: its arguments, its output names and folder.
