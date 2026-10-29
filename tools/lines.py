# The line balance of the code files (main.js, style.css, index.html, the tools): their lines, and their lines of code
# only (no comment, no blank line, see uncomment.py), from one version to another, to see whether the code grows or
# only its words. python3 tools/lines.py [from] [to]   (from: HEAD by default; to: the files as they are now, or a commit)
import os, subprocess, sys
from uncomment import code_of

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
git = lambda *a: subprocess.run(['git', '-C', root, *a], capture_output=True, text=True).stdout
CODE = ('.js', '.css', '.html', '.py')
# the code files at a version (None: as they are now), by name
def files(rev):
    names = [n for n in git('ls-files').split('\n') + git('ls-files', '--others', '--exclude-standard').split('\n') if n.endswith(CODE)] if rev is None \
        else [n for n in git('ls-tree', '-r', '--name-only', rev).split('\n') if n.endswith(CODE)]
    read = (lambda n: open(os.path.join(root, n), encoding='utf-8').read()) if rev is None else (lambda n: git('show', f'{rev}:{n}'))
    return {n: read(n) for n in names if n and (rev is not None or os.path.exists(os.path.join(root, n)))}

a, b = sys.argv[1] if len(sys.argv) > 1 else 'HEAD', sys.argv[2] if len(sys.argv) > 2 else None
A, B = files(a), files(b)
count = lambda name, src: (src.count('\n') + (not src.endswith('\n') and src != ''), code_of(name, src).count('\n') + 1 if code_of(name, src) else 0)
signed = lambda d: f'{d:+,}' if d else '0'
rows, total = [], [0, 0, 0, 0]
for name in sorted(set(A) | set(B)):
    (l0, c0), (l1, c1) = count(name, A.get(name, '')), count(name, B.get(name, ''))
    if (l0, c0) == (l1, c1): continue
    rows.append(f'{name:22} {l0:>7,} → {l1:<7,} {signed(l1 - l0):>6}   code {c0:>7,} → {c1:<7,} {signed(c1 - c0):>6}')
    total = [total[0] + l0, total[1] + l1, total[2] + c0, total[3] + c1]
print('\n'.join(rows) or 'no code file changed')
if len(rows) > 1: print(f'{"all":22} {total[0]:>7,} → {total[1]:<7,} {signed(total[1] - total[0]):>6}   code {total[2]:>7,} → {total[3]:<7,} {signed(total[3] - total[2]):>6}')
