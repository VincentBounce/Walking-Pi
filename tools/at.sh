#!/bin/zsh
# An old version of Walking Pi beside this one, to compare (a link's v=, see setupFrom in main.js): its commit found by
# its version (each commit's message ends with it), a copy of the repo at it, served on port 8322. tools/at.sh 0.1.1520
v=$1; repo="${0:A:h:h}"
c=$(git -C "$repo" log --format=%h --grep="(v$v)" -F -1)
[[ -n $c ]] || { echo "no commit for v$v"; exit 1; }
dir="${TMPDIR:-/tmp}/walking-pi-v$v"
[[ -d $dir ]] || git -C "$repo" worktree add --detach "$dir" "$c" >/dev/null 2>&1
echo "v$v ($c): http://localhost:8322/   (Ctrl-C to stop; then: git worktree remove \"$dir\")"
python3 -m http.server 8322 -d "$dir"
