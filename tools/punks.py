# CryptoPunks (Larva Labs, 2017: their sheet punks.png, 100 x 100 punks of 24 x 24) as the app's Punk starts, drawn in
# black and white: python3 tools/punks.py <punks.png>. Each punk its line drawing: its outline (a pixel of it beside the
# background), its near black marks (eyes, mouth, pipe…) and its contrasts (two parts of it much apart in colour, a
# bandana on the skin: the darker side); 72 bytes in base64 a punk, row by row, as Pixelarticons' (see pixelicons.py).
# Out: punks.js, PUNK_BITS (no Pillow: the PNG read here)
import base64, struct, sys, zlib

def read_png(path):  # an 8-bit RGBA PNG, not interlaced: its rows of bytes
    data, pos, idat = open(path, 'rb').read(), 8, b''
    while pos < len(data):
        n, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        if kind == b'IHDR': w, h, depth, ctype = struct.unpack('>IIBB', body[:10]); assert depth == 8 and ctype == 6
        if kind == b'IDAT': idat += body
        pos += 12 + n
    raw, stride, rows, prev = zlib.decompress(idat), w * 4, [], bytearray(w * 4)
    for y in range(h):
        f, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a, b, c = line[i - 4] if i >= 4 else 0, prev[i], prev[i - 4] if i >= 4 else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return rows

rows = read_png(sys.argv[1])
lum = lambda p: (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255
diff = lambda p, q: (abs(p[0] - q[0]) + abs(p[1] - q[1]) + abs(p[2] - q[2])) / 765
SIDES = ((1, 0), (-1, 0), (0, 1), (0, -1))
bits = []
for k in range(10000):
    px = [[tuple(rows[(k // 100) * 24 + y][((k % 100) * 24 + x) * 4:((k % 100) * 24 + x) * 4 + 4]) for x in range(24)] for y in range(24)]
    at = lambda x, y: px[y][x] if 0 <= x < 24 and 0 <= y < 24 else (0, 0, 0, 0)
    b = bytearray(72)
    for y in range(24):
        for x in range(24):
            p = px[y][x]
            if not p[3]: continue
            edge = any(not at(x + dx, y + dy)[3] for dx, dy in SIDES)
            contrast = any(at(x + dx, y + dy)[3] and diff(p, at(x + dx, y + dy)) > 0.25 and lum(p) <= lum(at(x + dx, y + dy)) for dx, dy in SIDES)
            if edge or lum(p) < 0.18 or contrast: b[(24 * y + x) >> 3] |= 128 >> (x & 7)
    bits.append(base64.b64encode(bytes(b)).decode())
with open('punks.js', 'w') as o:
    o.write('// CryptoPunks (Larva Labs, 2017), their 10,000 punks as line drawings (see tools/punks.py): each 24 x 24, 72 bytes in\n'
            '// base64, row by row, as Pixelarticons\'; Punk, a Life start (see ICON_SETS)\n')
    o.write('const PUNK_BITS = "' + ' '.join(bits) + '".split(" ");\n')
print(len(bits))
