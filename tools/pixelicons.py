# Pixelarticons (MIT, Gerrit Halfmann, npm pixelarticons) as the app's icons: python3 tools/pixelicons.py <its svg folder>.
# Each 24 x 24 SVG (paths of M, H, V, L, Z, absolute or relative) filled (nonzero) at its pixels' middles, 72 bytes in
# base64 a line, row by row, the top first. Out: pixelarticons.js, ICON_NAMES and ICON_BITS
import base64, os, re, sys
src = sys.argv[1]
def polys(d):
    out, cur, x, y, sx, sy = [], [], 0, 0, 0, 0
    for c, args in re.findall(r'([MmHhVvLlZz])([^MmHhVvLlZz]*)', d):
        n = [float(v) for v in re.findall(r'-?\d*\.?\d+', args)]
        if c in 'Zz':
            if cur: out.append(cur)
            cur, x, y = [], sx, sy
            continue
        if c in 'Mm':
            if cur: out.append(cur)
            x, y = (n[0], n[1]) if c == 'M' else (x + n[0], y + n[1])
            sx, sy, cur = x, y, [(x, y)]
            pairs = [(n[i], n[i + 1]) for i in range(2, len(n), 2)]
            for a, b in pairs: x, y = (a, b) if c == 'M' else (x + a, y + b); cur.append((x, y))
        elif c in 'Ll':
            for i in range(0, len(n), 2): x, y = (n[i], n[i + 1]) if c == 'L' else (x + n[i], y + n[i + 1]); cur.append((x, y))
        elif c in 'Hh':
            for v in n: x = v if c == 'H' else x + v; cur.append((x, y))
        else:
            for v in n: y = v if c == 'V' else y + v; cur.append((x, y))
    if cur: out.append(cur)
    return out
def winding(P, px, py):
    w = 0
    for i in range(len(P)):
        (x0, y0), (x1, y1) = P[i], P[(i + 1) % len(P)]
        if y0 <= py < y1 and px < x0 + (py - y0) * (x1 - x0) / (y1 - y0): w += 1
        elif y1 <= py < y0 and px < x0 + (py - y0) * (x1 - x0) / (y1 - y0): w -= 1
    return w
names, bits = [], []
for f in sorted(os.listdir(src)):
    if not f.endswith('.svg'): continue
    ps = [p for d in re.findall(r' d="([^"]+)"', open(os.path.join(src, f)).read()) for p in polys(d)]
    b = bytearray(72)
    for y in range(24):
        for x in range(24):
            if sum(winding(P, x + 0.5, y + 0.5) for P in ps) != 0: b[(24 * y + x) >> 3] |= 128 >> (x & 7)
    names.append(f[:-4]); bits.append(base64.b64encode(bytes(b)).decode())
with open('pixelarticons.js', 'w') as o:
    o.write('// Pixelarticons (pixelarticons.com), its free set: MIT License, Copyright (c) 2019 Gerrit Halfmann. Each icon 24 x 24,\n'
            '// 72 bytes in base64, row by row (see tools/pixelicons.py); Icon, a Life start (see iconCells)\n')
    o.write('const ICON_NAMES = "' + ' '.join(names) + '".split(" ");\n')
    o.write('const ICON_BITS = "' + ' '.join(bits) + '".split(" ");\n')
print(len(names), os.path.getsize('pixelarticons.js'))
