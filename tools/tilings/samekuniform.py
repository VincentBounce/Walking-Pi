# python3 samekuniform.py N… (each its kN.json from kuniform.py): which of these k-uniform tilings are the same, turned or mirrored
# are two k-uniform tilings the same, turned or mirrored? their corners (a patch from the lattice and the motif), each with
# the ways its faces lie round it; one of B's corners put on each of A's alike, turned (and mirrored) so its faces lie as
# that one's, all of B's corners near it then on A's, alike
import json, math, sys, itertools
def patch(k, N=8):
    a, b, M = k['a'], k['b'], k['motif']
    pts = [(p[0] + i * a[0] + j * b[0], p[1] + i * a[1] + j * b[1]) for i in range(-N, N + 1) for j in range(-N, N + 1) for p in M]
    pts = [p for p in pts if math.hypot(*p) < 14]
    keyf = lambda p: (round(p[0] * 1000), round(p[1] * 1000))
    S = {keyf(p): p for p in pts}
    nb = {keyf(p): [q for q in pts if abs(math.dist(p, q) - 1) < 1e-6] for p in pts}
    return S, nb, keyf
def dirs(p, nb):  # the directions of its edges
    return sorted(math.atan2(q[1] - p[1], q[0] - p[0]) for q in nb)
def same(A, B):
    SA, nA, kf = patch(A); SB, nB, _ = patch(B)
    ob = min(SB.values(), key=lambda p: math.hypot(*p))
    db = dirs(ob, nB[kf(ob)])
    near = [p for p in SB.values() if math.dist(p, ob) < 7]
    for oa in [p for p in SA.values() if math.hypot(*p) < 5]:
        da = dirs(oa, nA[kf(oa)])
        if len(da) != len(db): continue
        for flip in (1, -1):
            for t0 in da:
                for s0 in db:
                    th = t0 - flip * s0
                    f = lambda p: (oa[0] + math.cos(th) * (p[0] - ob[0]) - math.sin(th) * flip * (p[1] - ob[1]), oa[1] + math.sin(th) * (p[0] - ob[0]) + math.cos(th) * flip * (p[1] - ob[1]))
                    if all(kf(f(p)) in SA for p in near): return f"same ({'mirrored' if flip < 0 else 'turned'})"
    return 'different'
ks = {n: json.load(open(f'k{n}.json')) for n in sys.argv[1:]}
for x, y in itertools.combinations(ks, 2):
    r = same(ks[x], ks[y])
    if r != 'different' or len(ks) < 6: print(x, y, r)
print('checked', len(ks))
