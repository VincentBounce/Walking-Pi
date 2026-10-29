# Walking Pi as one HTML file, to send: index.html with style.css and its scripts in it, the scripts without their comments,
# gzipped (base64) and unzipped by the page as it opens (DecompressionStream, every browser since 2023), or as they are,
# comments and all (--plain).
# python3 tools/bundle.py [--plain] [out.html]   (out: « Walking Pi resources/Walking Pi v<version> compressed|plain.html », beside the repo)
import base64, gzip, os, re, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if a != '--plain']
plain = '--plain' in sys.argv
read = lambda name: open(os.path.join(root, name), encoding='utf-8').read()
html, main = read('index.html'), read('main.js')
version = re.search(r"VERSION = '([^']+)'", main).group(1)
out = args[0] if args else os.path.join(os.path.dirname(root), 'Walking Pi resources', f'Walking Pi v{version}{" plain" if plain else " compressed"}.html')

# its blank lines and lines' ends' spaces gone (a script's, its line breaks kept: where a statement may end without ;)
tidy = lambda text: '\n'.join(l.rstrip() for l in text.split('\n') if l.strip())
# the page's and the style's comments gone too, not the plain one's (none in a string there: checked by hand)
css = read('style.css') if plain else tidy(re.sub(r'/\*.*?\*/', '', read('style.css'), flags=re.S))
if not plain: html = tidy(re.sub(r'<!--.*?-->', '', html, flags=re.S)) + '\n'
html = re.sub(r'<link rel="stylesheet" href="style\.css[^"]*">', lambda _: '<style>\n' + css + '\n</style>', html)
names = re.findall(r'<script src="([^"?]+)', html)

# a script without its comments (// and /* */), read as the browser reads it: not in a string, a template's text (a
# shader's own // kept) or a regular expression (a / where a value may start, not a division); tidied
REGEX_BEFORE = set('(,=:[!&|?{};+-*%<>~^') | {'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await'}
def uncommented(src):
    out, i, n, last, braces = [], 0, len(src), '', []  # last: the last token's end (a word or a sign); braces: in ${ }, its depth
    def word_before():  # the word or the sign before
        tail = ''.join(out[-40:]).rstrip()
        m = re.search(r'[\w$]+$', tail)
        return m.group(0) if m else tail[-1:]
    def template(i):  # its text to its end or to ${ (then code again, braces[-1] counting its own { })
        while i < n:
            c = src[i]
            if c == '\\': out.append(src[i:i + 2]); i += 2; continue
            out.append(c); i += 1
            if c == '`': return i, False
            if c == '$' and i < n and src[i] == '{': out.append('{'); return i + 1, True
        return i, False
    while i < n:
        c = src[i]
        if c == '/' and src[i + 1:i + 2] == '/':
            while i < n and src[i] != '\n': i += 1
            continue
        if c == '/' and src[i + 1:i + 2] == '*':
            j = src.index('*/', i + 2) + 2
            out.append('\n' if '\n' in src[i:j] else ' ')
            i = j
            continue
        if c in '\'"':
            j = i + 1
            while src[j] != c: j += 2 if src[j] == '\\' else 1
            out.append(src[i:j + 1]); i = j + 1
            continue
        if c == '`':
            out.append(c)
            i, inner = template(i + 1)
            if inner: braces.append(0)
            continue
        if braces and c == '{': braces[-1] += 1
        if braces and c == '}':
            if braces[-1] == 0:  # the ${ }'s end: its template's text again
                braces.pop(); out.append(c)
                i, inner = template(i + 1)
                if inner: braces.append(0)
                continue
            braces[-1] -= 1
        if c == '/' and word_before() in REGEX_BEFORE | {''}:  # a regular expression: to its closing / (not one in [ ])
            j, cls = i + 1, False
            while cls or src[j] != '/':
                if src[j] == '\\': j += 1
                elif src[j] == '[': cls = True
                elif src[j] == ']': cls = False
                j += 1
            out.append(src[i:j + 1]); i = j + 1
            continue
        out.append(c); i += 1
    return tidy(''.join(out))

code = ';\n'.join(read(n) if plain else uncommented(read(n)) for n in names)  # (one script: their top-level names were one scope already)
if not plain: html = re.sub(r'<script>(.*?)</script>', lambda m: '<script>\n' + uncommented(m[1]) + '\n</script>', html, flags=re.S)  # (the page's own: the theme's)
if plain:
    loader = '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>\n'
else:
    zipped = base64.b64encode(gzip.compress(code.encode('utf-8'), 9)).decode()
    loader = ('<script>\n'  # (the app's scripts, gzipped: unzipped and run as the page opens)
              '(async () => {\n'
              f'  const zipped = Uint8Array.from(atob("{zipped}"), (c) => c.charCodeAt(0));\n'
              "  const code = await new Response(new Blob([zipped]).stream().pipeThrough(new DecompressionStream('gzip'))).text();\n"
              "  const s = document.createElement('script');\n"
              '  s.textContent = code;\n'
              '  document.body.appendChild(s);\n'
              '})();\n'
              '</script>\n')
first = True
def swap(m):  # (the first tag: all of them, the others gone)
    global first
    if not first: return ''
    first = False
    return loader
html = re.sub(r'[ \t]*<script src="[^"]+"></script>\n?', swap, html)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print(out)
print(f'{os.path.getsize(out) / 1e6:.2f} MB ({"plain" if plain else "gzipped"}), scripts: {", ".join(names)}', file=sys.stderr)
