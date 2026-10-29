# Walking Pi as one HTML file, to send: index.html with style.css and its scripts in it, the scripts minified (esbuild),
# gzipped (base64) and unzipped by the page as it opens (DecompressionStream, every browser since 2023), or as they are,
# comments and all (--plain).
# python3 tools/bundle.py [--plain] [out.html]   (out: « Walking Pi resources/Walking Pi v<version> compressed|plain.html », beside the repo)
import base64, gzip, os, re, shutil, subprocess, sys
from uncomment import tidy, uncommented, uncommented_css  # (code without its comments)

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if a != '--plain']
plain = '--plain' in sys.argv
read = lambda name: open(os.path.join(root, name), encoding='utf-8').read()
html, main = read('index.html'), read('main.js')
version = re.search(r"VERSION = '([^']+)'", main).group(1)
out = args[0] if args else os.path.join(os.path.dirname(root), 'Walking Pi resources', f'Walking Pi v{version}{" plain" if plain else " compressed"}.html')

# a script or a style minified by esbuild (brew install esbuild): a script's local names shortened, its top-level names
# kept (a script, not a module: the quick check calls them), comments gone; without it, comments gone only (see uncommented)
def minified(src, loader='js'):
    if not shutil.which('esbuild'): return uncommented(src) if loader == 'js' else uncommented_css(src)
    return subprocess.run(['esbuild', '--minify', '--charset=utf8', f'--loader={loader}', '--log-level=warning'], input=src, capture_output=True, text=True, check=True).stdout
# the style minified, the page's comments gone too, not the plain one's
css = read('style.css') if plain else minified(read('style.css'), 'css')
if not plain: html = tidy(re.sub(r'<!--.*?-->', '', html, flags=re.S)) + '\n'  # (its inline script: minified below)
html = re.sub(r'<link rel="stylesheet" href="style\.css[^"]*">', lambda _: '<style>\n' + css + '\n</style>', html)
names = re.findall(r'<script src="([^"?]+)', html)

if not plain and not shutil.which('esbuild'): print('esbuild not found (brew install esbuild): the scripts without their comments only', file=sys.stderr)

code = ';\n'.join(read(n) for n in names)  # (one script: their top-level names were one scope already)
if not plain:
    code = minified(code)
    html = re.sub(r'<script>(.*?)</script>', lambda m: '<script>\n' + minified(m[1]) + '</script>', html, flags=re.S)  # (the page's own: the theme's)
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
print(f'{os.path.getsize(out) / 1e6:.2f} MB ({"plain" if plain else "minified, gzipped" if shutil.which("esbuild") else "uncommented, gzipped"}), scripts: {", ".join(names)}', file=sys.stderr)
