# Walking Pi as one HTML file, to send: index.html with style.css and its scripts in it, the scripts gzipped (base64) and
# unzipped by the page as it opens (DecompressionStream, every browser since 2023), or as they are (--plain).
# python3 tools/bundle.py [--plain] [out.html]   (out: « Walking Pi resources/Walking Pi v<version> compressed|plain.html », beside the repo)
import base64, gzip, os, re, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if a != '--plain']
plain = '--plain' in sys.argv
read = lambda name: open(os.path.join(root, name), encoding='utf-8').read()
html, main = read('index.html'), read('main.js')
version = re.search(r"VERSION = '([^']+)'", main).group(1)
out = args[0] if args else os.path.join(os.path.dirname(root), 'Walking Pi resources', f'Walking Pi v{version}{" plain" if plain else " compressed"}.html')

html = re.sub(r'<link rel="stylesheet" href="style\.css[^"]*">', lambda _: '<style>\n' + read('style.css') + '</style>', html)
names = re.findall(r'<script src="([^"?]+)', html)
code = ';\n'.join(read(n) for n in names)  # (one script: their top-level names were one scope already)
if plain:
    loader = '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>\n'
else:
    zipped = base64.b64encode(gzip.compress(code.encode('utf-8'), 9)).decode()
    loader = ('<script>  // the app\'s scripts, gzipped: unzipped and run as the page opens\n'
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
