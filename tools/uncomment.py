# Code without its comments, for the bundle (see bundle.py) and the line balance (see lines.py)
import re

# its blank lines and lines' ends' spaces gone (a script's, its line breaks kept: where a statement may end without ;)
tidy = lambda text: '\n'.join(l.rstrip() for l in text.split('\n') if l.strip())

# a script without its comments (// and /* */), read as the browser reads it: not in a string, a template's text (a
# shader's own // kept) or a regular expression (a / where a value may start, not a division); tidied
REGEX_BEFORE = set('(,=:[!&|?{};+-*%<>~^') | {'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await'}
def uncommented(src):
    out, i, n, braces = [], 0, len(src), []  # braces: in ${ }, its depth
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

# a style without its comments, a page without its own (<!-- -->, its inline scripts' too), a Python file without its
# comment lines; tidied (none in a string there: checked by hand)
uncommented_css = lambda src: tidy(re.sub(r'/\*.*?\*/', '', src, flags=re.S))
uncommented_html = lambda src: tidy(re.sub(r'<script>(.*?)</script>', lambda m: '<script>\n' + uncommented(m[1]) + '\n</script>', re.sub(r'<!--.*?-->', '', src, flags=re.S), flags=re.S))
uncommented_py = lambda src: tidy('\n'.join(l for l in src.split('\n') if not l.lstrip().startswith('#')))
# any of them, by its name's end
def code_of(name, src):
    ext = name.rsplit('.', 1)[-1]
    return {'js': uncommented, 'css': uncommented_css, 'html': uncommented_html, 'py': uncommented_py}.get(ext, tidy)(src)
