# A k-uniform tiling as Wikimedia draws it (k-uniform_N.svg: paths of regular polygons), its lattice and a cell's corners,
# made exact: python3 kuniform.py drawing.svg out.json (see build.js, kuniform.json; Wikipedia's Pentagonal tiling, dual
# k-uniform tilings). Its translations: the shortest moves taking every corner onto one with its faces the same ways round;
# then every polygon regular of side 1 by relaxing the corners and the lattice (to 1e-12); turned so a lies along x
import re, math, sys, json
from collections import Counter
src = open(sys.argv[1]).read()
polys = []
for d in [d for d in re.findall(r'<path d="([^"]+)"', src) if d.strip()[-1] in "Zz"]:
    toks = re.findall(r'[MmLlZz]|-?\d*\.?\d+(?:e-?\d+)?', d); pts = []; cmd = None; i = 0; cur = [0.0, 0.0]
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t; i += 1
            if cmd in 'Zz': break
            continue
        x, y = float(toks[i]), float(toks[i + 1]); i += 2
        if cmd in 'ml': cur = [cur[0] + x, cur[1] + y]
        else: cur = [x, y]
        pts.append(cur[:])
        if cmd == 'm': cmd = 'l'
        if cmd == 'M': cmd = 'L'
    if len(pts) >= 3: polys.append(pts)
e = sorted(math.dist(P[k], P[(k + 1) % len(P)]) for P in polys for k in range(len(P)))
L = e[len(e) // 2]
polys = [[(x / L, -y / L) for x, y in P] for P in polys]
# (only regular polygons of side 1: no outline of a group of them)
regular = lambda P: all(abs(math.dist(P[k], P[(k + 1) % len(P)]) - 1) < 0.02 for k in range(len(P))) and all(abs(math.dist(P[k], P[(k + 2) % len(P)]) - 2 * math.cos(math.pi / len(P))) < 0.03 for k in range(len(P)))
print('polygons', len(polys), 'regular', sum(map(regular, polys)))
polys = [P for P in polys if regular(P)]
key = lambda p: (round(p[0] * 200), round(p[1] * 200))
def ang(P, k):
    a, b, c = P[k - 1], P[k], P[(k + 1) % len(P)]
    return abs(math.atan2((a[0]-b[0])*(c[1]-b[1]) - (a[1]-b[1])*(c[0]-b[0]), (a[0]-b[0])*(c[0]-b[0]) + (a[1]-b[1])*(c[1]-b[1])))
at = {}
for P in polys:
    m = (sum(q[0] for q in P) / len(P), sum(q[1] for q in P) / len(P))
    for k, p in enumerate(P):
        at.setdefault(key(p), [p, 0, []])
        at[key(p)][1] += ang(P, k); at[key(p)][2].append((math.atan2(m[1] - p[1], m[0] - p[0]), len(P)))
def cyc(l):
    seq = [n for _, n in sorted(l)]
    return min(min(tuple(seq[i:] + seq[:i]) for i in range(len(seq))), min(tuple(seq[::-1][i:] + seq[::-1][:i]) for i in range(len(seq))))
full = {k: (v[0], cyc(v[2])) for k, v in at.items() if abs(v[1] - 2 * math.pi) < 1e-2}
sig = {k: tuple(sorted((round(math.degrees(t)) % 360, n) for t, n in at[k][2])) for k in full}  # (its faces' ways round it: a translation keeps them)
types = Counter(t for _, t in full.values())
cx = sum(p[0] for p, _ in full.values()) / len(full); cy = sum(p[1] for p, _ in full.values()) / len(full)
R = max(math.dist(p, (cx, cy)) for p, _ in full.values())
inner = [k for k, (p, t) in full.items() if math.dist(p, (cx, cy)) < R * 0.22]
S0 = Counter(sig[k] for k in inner).most_common()[-1][0]  # (the rarest way round, near the middle)
ko = min((k for k in inner if sig[k] == S0), key=lambda k: math.dist(full[k][0], (cx, cy))); o = full[ko][0]
def ok(v):  # every corner, moved by v, a corner with its faces the same ways round, where the drawing has it (some 20 of them)
    n = 0
    for k, (p, t) in full.items():
        q = (p[0] + v[0], p[1] + v[1])
        if not (inside(p) and inside(q)): continue
        if key(q) not in full or sig[key(q)] != sig[k]: return False
        n += 1
    return n >= 20
xs = [p[0] for p, _ in full.values()]; ys = [p[1] for p, _ in full.values()]
box = (min(xs) + 2, max(xs) - 2, min(ys) + 2, max(ys) - 2)
inside = lambda p: box[0] < p[0] < box[1] and box[2] < p[1] < box[3]  # (well within the drawing: its corners all whole there)
pts0 = [full[k][0] for k in full if sig[k] == S0]
cands = sorted({(round(q[0] - p[0], 4), round(q[1] - p[1], 4)) for p in pts0 for q in pts0 if math.dist(p, q) > 0.5 and (q[1] - p[1] > 1e-6 or (abs(q[1] - p[1]) < 1e-6 and q[0] > p[0]))}, key=lambda v: math.hypot(*v))
good = []
for v in cands:
    if any(abs(v[0] - w[0]) < 1e-3 and abs(v[1] - w[1]) < 1e-3 for w in good): continue
    if ok(v):
        good.append(v)
        if any(abs(good[0][0] * w[1] - good[0][1] * w[0]) > 1e-2 for w in good[1:]): break
a = good[0]; b = next(v for v in good if abs(a[0] * v[1] - a[1] * v[0]) > 1e-2 * math.hypot(*a) * math.hypot(*v))
def reduce(u, v):
    dot = lambda p, q: p[0] * q[0] + p[1] * q[1]
    for _ in range(20):
        k = round(dot(u, v) / dot(u, u)); v = (v[0] - k * u[0], v[1] - k * u[1])
        if dot(v, v) < dot(u, u): u, v = v, u
        elif not k: break
    return u, v
a, b = reduce(a, b)
D = a[0] * b[1] - a[1] * b[0]
if D < 0: b = (-b[0], -b[1]); D = -D
lat = lambda p: (((p[0]-o[0]) * b[1] - (p[1]-o[1]) * b[0]) / D, (a[0] * (p[1]-o[1]) - a[1] * (p[0]-o[0])) / D)
motif, fr = [], []  # a cell's corners, each once: by its place in the cell (mod 1), within 0.01
def find(fu, fv):
    for i, (gu, gv) in enumerate(fr):
        du, dv = (fu - gu + 0.5) % 1 - 0.5, (fv - gv + 0.5) % 1 - 0.5
        if abs(du) < 0.01 and abs(dv) < 0.01: return i
    return None
for p, t in full.values():
    u, v = lat(p); fu, fv = u % 1, v % 1
    if find(fu, fv) is None: fr.append((fu, fv)); motif.append([fu * a[0] + fv * b[0], fu * a[1] + fv * b[1]])
def where(p):  # a corner as (motif index, lattice offset)
    u, v = lat(p); fu, fv = u % 1, v % 1
    i = find(fu, fv)
    if i is None: return None
    gu, gv = fr[i]
    return (i, round(u - gu), round(v - gv))
# the check: as many corners as its faces' share of the cell's area (each corner: 1/3 of its triangles, 1/4 of its squares, 1/6 of its hexagons)
share = sum(sum({3: math.sqrt(3) / 4 / 3, 4: 1 / 4, 6: 3 * math.sqrt(3) / 2 / 6}[n] for n in t) for t in [full[k][1] for k in full]) / len(full)
print('corners', len(motif), 'by area', round(D / share, 3))
# the constraints: each polygon near the middle, regular of side 1 (all its corners' distances)
cons = set()
for P in polys:
    mm = (sum(q[0] for q in P) / len(P), sum(q[1] for q in P) / len(P))
    if math.dist(mm, (cx, cy)) > R * 0.45: continue
    W = [where(p) for p in P]
    if None in W: continue
    n = len(P)
    for i in range(n):
        for j in range(i + 1, n):
            d = math.sin(math.pi * (j - i) / n) / math.sin(math.pi / n)
            (i1, m1, k1), (i2, m2, k2) = W[i], W[j]
            cons.add((i1, i2, m2 - m1, k2 - k1, round(d, 12)))
A, B = list(a), list(b)
for it in range(200000):
    g = [[0.0, 0.0] for _ in motif]; ga = [0.0, 0.0]; gb = [0.0, 0.0]; err = 0
    for i1, i2, m, k, d in cons:
        p = motif[i1]; q = [motif[i2][0] + m * A[0] + k * B[0], motif[i2][1] + m * A[1] + k * B[1]]
        dx, dy = q[0] - p[0], q[1] - p[1]; r = math.hypot(dx, dy); e = r - d; err = max(err, abs(e))
        ux, uy = e * dx / r, e * dy / r
        g[i1][0] += ux; g[i1][1] += uy; g[i2][0] -= ux; g[i2][1] -= uy
        ga[0] -= m * ux; ga[1] -= m * uy; gb[0] -= k * ux; gb[1] -= k * uy
    s = 0.05
    for i in range(1, len(motif)): motif[i][0] += s * g[i][0]; motif[i][1] += s * g[i][1]
    nc = len(cons) / len(motif)
    A[0] += s * ga[0] / nc; A[1] += s * ga[1] / nc; B[0] += s * gb[0] / nc; B[1] += s * gb[1] / nc
    if err < 1e-12: break
t = -math.atan2(A[1], A[0]); rot = lambda p: [p[0] * math.cos(t) - p[1] * math.sin(t), p[0] * math.sin(t) + p[1] * math.cos(t)]
out = {'types': {''.join(map(str, k)): v for k, v in types.items()}, 'a': rot(A), 'b': rot(B), 'motif': [rot(p) for p in motif], 'err': err, 'iterations': it, 'constraints': len(cons)}
print(sys.argv[1], 'ways', len(set(sig.values())), 'types', dict(types), 'cell corners', len(motif), '|a|', round(math.hypot(*A), 6), '|b|', round(math.hypot(*B), 6), 'angle', round(math.degrees(math.atan2(B[1], B[0]) - math.atan2(A[1], A[0])), 4), 'err', err, 'it', it)
json.dump(out, open(sys.argv[2], 'w'))
