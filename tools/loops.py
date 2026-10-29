# The self-reproducing loops (Langton, Byl, Chou-Reggia, SDSR, Evoloop) as Golly has them: each rule's table and colours
# (Golly's Rules/*.rule, from its repository) and its start (Golly's Patterns/Loops/*.rle, from Debian's copy of Golly
# 2.3): python3 tools/loops.py. Out: loops.js, LOOP_RULES, read by parseLoops in main.js
import json, re, urllib.request

RULES = 'https://sourceforge.net/p/golly/code/ci/master/tree/Rules/{}.rule?format=raw'
PATTERNS = 'https://sources.debian.org/data/main/g/golly/2.3-1/Patterns/Loops/{}.rle'
# the app's name of each, Golly's rule and pattern, its year and words
LOOPS = [
    ('Langton', 'Langtons-Loops', 'Langtons-Loops', 1984, "Langton's loops: a loop whose signals turning round in it build a copy of it, every 151 generations, into a colony growing as a coral, its dead loops in the middle"),
    ('Byl', 'Byl-Loop', 'Byl-Loop', 1989, "Byl's loop: Langton's without its inner sheath, 12 cells copied every 25 generations"),
    ('Chou-Reggia', 'Chou-Reggia-1', 'Chou-Reggia-Loop-1', 1993, "Chou and Reggia's loop: no sheath at all, 5 cells copied every 15 generations"),
    ('SDSR', 'SDSR-Loop', 'SDSR-Loop', 1998, "Sayama's structurally dissolvable loop: Langton's, its dead loops dissolving, so the colony goes on growing and turning over"),
    ('Evoloop', 'Evoloop', 'Evoloop', 1999, "Sayama's evoloop: loops that meet change, the smaller ones copying faster and taking the room: natural selection"),
]
get = lambda url: urllib.request.urlopen(url).read().decode()
out = {}
for name, rule, pattern, year, words in LOOPS:
    text = get(RULES.format(rule))
    table, colours, part = [], [], None
    for line in text.split('\n'):
        if line.startswith('@'): part = line.split()[0]; continue
        line = line.split('#')[0].strip()
        if not line: continue
        if part == '@TABLE': table.append(line)
        if part == '@COLORS': colours.append([int(v) for v in line.split()])
    rle = get(PATTERNS.format(pattern))
    head = re.search(r'x = (\d+), y = (\d+)', rle)
    body = ''.join(l.strip() for l in rle.split('\n') if l and not l.startswith('#') and not l.startswith('x '))
    out[name] = {'golly': rule, 'year': year, 'words': words, 'table': '\n'.join(table), 'colours': colours,
                 'pattern': {'w': int(head[1]), 'h': int(head[2]), 'rle': body}}
    print(name, len(table), 'lines,', len(colours), 'colours, pattern', head[1], 'x', head[2])
open('loops.js', 'w').write('// The self-reproducing loops, as Golly has them (see tools/loops.py): each one\'s table of transitions, colours and start\n'
                            f'const LOOP_RULES = {json.dumps(out, ensure_ascii=False)};\n')
