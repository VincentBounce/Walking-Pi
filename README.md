# Walking π

A walk driven by the digits of **π**, other famous numbers, formulas and large primes. The walker moves on square, triangle or hexagon tiles, through a 3D lattice, around the Ulam spiral, or across a torus, a Möbius strip, a cube and other polyhedra. The same digits can also seed a **Game of Life** on those surfaces.

**▶ Live demo: https://vincentbounce.github.io/Walking-Pi/**

π₃ = 10.0102110122220102110021111102212222201112012121212001…

## Numbers

Every number is a **formula**, computed in the browser with `BigInt` in a Web Worker and written in the base the mode needs. You can get from 1,000 up to 10,000,000 digits. Integers and fractions are exact. Other numbers are computed in fixed point with guard digits, and a warning appears in the rare case where the last digits cannot be certain. The integer part is part of the walk.

The cards fill in the formula field; you can also type your own.

**Constants:** π, e, φ (golden ratio), γ (Euler–Mascheroni), G (Catalan), E (Erdős–Borwein), τ (Prouhet–Thue–Morse) and F (the rabbit constant, the Fibonacci word). τ and F are made of 0s and 1s in every base; read by a Pivot walk on triangles, τ draws Koch's curve.

**𝑓 (formulas):** √2, ∛2, π², e^π, ln 2, ζ(3), 4/3, 16/9.

**Primes**
- **Mersenne primes 2ᵖ − 1:** the known ones from M₁₂₇ to M₁₃₆₂₇₉₈₄₁. In base 2 or 4 their digits are trivial (111…1 and 1333…3).
- **Primorial primes p# ± 1:** p# is the product of all primes up to p. The values of p come from OEIS A005234 and A006794.
- **Random prime:** a probable prime of 100 to 2,000 decimal digits (sieve, then Miller–Rabin), drawn from a seed so a link gives it back.
- **Prime constant ρ₂:** ρ = Σ 2^(−p) = 0.0110101000101…₂, written in the walk's base.

**Sequences** (digit streams, used alone)
- **Random digits:** `random(seed)`, a new seed on each click.
- **Champernowne:** 1 2 3 4 … written one after another in the walk's base.
- **Prime barcode ρ (Ulam):** digit k is 0 if k is not prime, else k mod b. On the square spiral it draws the Ulam spiral of the primes.
- **Prime gaps Δp:** one digit per gap between consecutive odd primes, (gap / 2) mod b.
- **Dragon (paperfolding):** the folds of a strip folded in two again and again. As turns, it draws the dragon curve on Triangles turtle, Squares turtle and Hexagons turtle.
- **Rudin–Shapiro:** digit k is the parity of the blocks 11 in k written in base 2; on Hexagons turtle, a branching fractal.
- **Kolakoski:** 1 2 2 1 1 2 1 2 2 …, the sequence of its own run lengths, as 0s and 1s.

### How each number is computed

Times are for one computation in the browser's worker, in base 10 (other bases are about the same), on a recent laptop. A formula costs the sum of its parts: π² costs about one π.

Binary splitting and Newton's method cost a few multiplications of huge integers, so ten times more digits take about 15 to 25 times longer. A series summed term by term needs one long division per term, so ten times more digits take about a hundred times longer: only ζ(5), ζ(7)… still work that way.

| Formula | Method | 100,000 digits | 1,000,000 digits |
|---|---|--:|--:|
| `pi` | Chudnovsky series, by binary splitting | 0.07 s | 1.3 s |
| `e` | Σ 1/k!, by binary splitting | 0.03 s | 0.5 s |
| `ln(2)` | 18·artanh(1/26) − 2·artanh(1/4801) + 8·artanh(1/8749), by binary splitting | 0.1 s | 2.1 s |
| `phi`, `sqrt(x)` | integer square root, Newton doubling its precision | 0.03 s | 0.6 s |
| `cbrt(x)` | integer cube root, Newton doubling its precision | 0.05 s | 0.9 s |
| `root(x, k)` | integer k-th root, Newton at full precision | 0.3 s | 5.4 s |
| `erdos` | Σ 2^(−k²)·(2^k + 1)/(2^k − 1), about √n terms | 0.07 s | 3.5 s |
| `zeta(3)` | Amdeberhan–Zeilberger series, by binary splitting | 0.2 s | 4.0 s |
| `catalan` | Lupaș series, by binary splitting | 1.2 s | 24 s |
| `gamma` | Brent–McMillan, by binary splitting | 2.0 s | 41 s |
| `ln(3)`, `log(1000, 7)`, `ln(22/7)` | ln of a **small** fraction: k·ln 2 + 2·artanh(r) with a small fraction r, by binary splitting. A fraction with long numbers, like `ln(10^500+1)`, goes to the general ln below | 0.2 s | 3.5 s |
| `exp(2)`, `e^(1/3)` | exp, "bit-burst": the argument in chunks of 32, 32, 64, 128… bits, each series by binary splitting | 0.04 s | 0.7 s |
| `e^pi`, `2^pi`, `x^y` | exp as above (x^y = e^(y·ln x)) | 0.4–0.5 s | 10–12 s |
| `ln(pi)`, `log(pi, 10)` | ln of any value (and of fractions with long numbers): Newton's method on exp, doubling its precision | 0.7 s | 16 s |
| `zeta(5)`, `zeta(7)`… | Borwein's series, term by term | 29 s | too long |
| `22/7` | long division | instant | instant |
| `2^136279841-1` | exact `BigInt`, then its digits (all 41,024,320 of them, whatever the count asked) | 15 s | 15 s |
| `primorial(9562633)+1` | exact `BigInt`, primes multiplied as a balanced tree | 1.3 s | 1.3 s |
| `randprime(size, seed)` | sieve, then Miller–Rabin; the time depends on the size, not on the digits asked | 300 digits: 0.05 s, 1,000: 1.5 s | 2,000 digits: minutes |

**When one function has two methods.** The choice depends on the formula, never on the number of digits asked:
- **ln of a fraction:** by binary splitting when, once brought between 1/√2 and √2, its gap to 1 has a short numerator (64 bits, about 19 decimal digits): `ln(3)`, `ln(22/7)`, `ln(2^127-1)`. Otherwise every term of the series would carry the long numbers, and the general ln is faster.
- **Powers a^b**, by the exponent: a whole number up to a billion (`2^127`, `pi^2`, `10^-50`) by repeated squaring, exact when a is; a fraction with a small denominator (`8^(1/3)`, `pi^(2/3)`) as a root, exact when it can be; any other exponent (`2^pi`, `pi^pi`) as e^(b·ln a).
- **ζ(k):** ζ(3) has its own fast series; ζ(5), ζ(7)… go through Borwein's series, term by term.
- **ln 2** has its own formula, also used inside every other logarithm.

### Formula language

Names: `pi`, `e`, `phi`, `gamma`, `catalan`, `erdos`.

Functions:
- `sqrt(x)`, `cbrt(x)`, `root(x, k)`;
- `ln(x)`, `exp(x)`, `log(x, b)`;
- `zeta(k)`;
- `primorial(p)`, `randprime(size, seed)`.

Operators: `+ − × ÷ ^ ( )`.

Examples: `22/7`, `2^pi`, `8^(1/3)`, `2^127-1`, `primorial(11)+1`, `ln(3)`.

Digit sequences, used alone: `random(seed)`, `champernowne`, `primes`, `primegaps`, `dragon`, `thuemorse`, `rabbit`, `rudinshapiro`, `kolakoski`.

Press Enter to compute.

## Walk modes

The walker starts at the origin, heading north (up). Each mode sets the base of the digits and the rule that turns a digit into a move. In the relative modes you never step back the way you came.

### 2D walks

| Mode | Base | Rule |
|---|:-:|---|
| Squares turtle | 3 | `0` turn left + step · `1` step forward · `2` turn right + step |
| Squares cardinal | 4 | `0` north · `1` east · `2` south · `3` west |
| Triangles | 2 | Exit the triangle through the edge on your `0` left or `1` right |
| Triangles | 3 | Cross the `0` horizontal · `1` “/” · `2` “\” edge |
| Hexagons | 5 | `0` sharp left · `1` left · `2` straight · `3` right · `4` sharp right |
| Hexagons | 6 | `0` N · `1` NE · `2` SE · `3` S · `4` SW · `5` NW |
| Pivot (squares, triangles, hexagons) | 2 | `0` step forward · `1` turn right on the spot by one notch (90° on squares, 60° on triangles and hexagons), with no step |
| Parity (squares, triangles, hexagons) | 2 | `0` step forward · `1` step forward, then turn by one notch: right at an odd digit (1st, 3rd…), left at an even one |

The rabbit constant on **Parity** (squares) draws the Fibonacci word fractal. **Pivot** is the turtle of the L-systems: a turn costs no step, so turns pile up (two quarter turns: back the way you came). It exists where a step straight on does: along squares and triangles, on square and hexagon cells.

### Walks on surfaces (the 3D tab)

Each surface is walked **along the grid** (from corner to corner, turning at each corner) or **on cells** (from tile to tile): Grid | Cells, beside the list.

| Surface | Along the grid | On cells |
|---|---|---|
| Square torus | base 3: `0` left · `1` straight · `2` right | base 3: `0` left · `1` straight · `2` right |
| Triangle torus | base 5: `0` sharp left … `4` sharp right | base 2: exit through the `0` left or `1` right edge |
| Hex torus | base 2: `0` left · `1` right | base 5: `0` sharp left … `4` sharp right |
| Cairo torus | — | base 4: out through the `0` sharp left · `1` left · `2` right · `3` sharp right edge |
| Klein bottle (squares, Cairo pentagons, hexagons, triangles) | — | as the torus's walks on cells |
| Möbius strip | squares as the torus; hexagons base 2: `0` left · `1` right; triangles base 5: `0` sharp left … `4` sharp right | squares as the torus; hexagons base 5: `0` sharp left … `4` sharp right; triangles base 2: the `0` left or `1` right edge |
| Cube | base 3: `0` left · `1` straight · `2` right | base 3: `0` left · `1` straight · `2` right |
| Tetrahedron, octahedron, triangle sphere | base 5: `0` sharp left … `4` sharp right (at a corner of the solid, the nearest edge) | base 2: exit through the `0` left or `1` right edge |
| Hexagon sphere | base 2: `0` left · `1` right | base 2: the `0` front left or `1` front right edge |

Most surfaces also have the **Pivot** rule (base 2, `0` step forward, `1` turn right on the spot by one notch) and the **Parity** rule (`1` a step, then a notch right at an odd digit, left at an even one): along the grid on squares and triangles, on cells on squares and hexagons.

- **Torus**, **Möbius strip** and **Sphere** are one entry each in the list, their tiles picked by the tabs under it: for the torus squares, Cairo pentagons, hexagons, hexagons **turned by 30°**, triangles and triangles turned by 30° (turned, their rows go round the tube instead of round the ring), and under them **Rectangle | Square** (for the Möbius strip too): a torus or a strip from a long sheet (the default, its tiles even once rolled up) or from a square one (as many tiles round the ring as round the tube, stretched along the ring once rolled up; not turned); for the Möbius strip squares, Cairo pentagons, hexagons, turned hexagons, triangles and turned triangles (hexagons and turned triangles make its edges zigzag along them); for the sphere hexagons (the default) or triangles (the icosahedron, inflated).
- The **Klein bottle** is a torus whose sheet is glued with its ends turned over, as the Möbius strip's: one-sided and closed. In space it has to cross itself: it is shown as the figure-8 bottle (its tube's cross-section a figure 8 turning half a turn round the ring), crossing itself along a circle, both sides of its tiles drawn.
- The − / + under the list set the surface's size. Round a torus and along a Möbius strip the length follows from the width (the shape's proportions), rounded to a multiple of 12 so that the blocks of 2, 3, 4, 6 and 12 colours divide it.
- **Starts:** the different walks a surface allows (its rotations turn a start into another one that draws the same walk, turned), numbered alike at every size; hovering the number shows them all.
- A walk that comes back onto itself stops after its first round (`↻`, see [Regular patterns](#regular-patterns)); on a torus, a fraction's **loops** button finds the sizes where it closes in fewest laps.
- A surface can be shown **flat or round**: the torus and the Möbius strip unroll into their sheet and the polyhedra flatten, and the walk goes on during the morph.
- The **Möbius strip** is walked as a strip of paper: each square has two faces, each with its own cells, and a walker keeps to its face; at the strip's edge it goes round onto the face just behind. Both faces make one surface with no edge (2 starts on squares, 3 on hexagons and triangles); at a hexagon strip's zigzag edge a corner is not flat, and turns there are measured as a share of the way round it.

### Walks in space (the Space tab: a 3D lattice)

| Mode | Base | Rule |
|---|:-:|---|
| Cubes | 5 | Relative to the heading: `0` turn left · `1` up · `2` straight · `3` down · `4` turn right |
| Cubes | 6 | `0` north · `1` east · `2` up · `3` south · `4` west · `5` down |
| Cubes pivot | 3 | `0` step forward · `1` quarter turn right · `2` quarter turn up, both on the spot |

### Game of Life

A cellular automaton on the plane (squares, triangles, hexagons, Cairo pentagons; walls or a torus at its edges) or on a surface: a torus (squares, hexagons, triangles or Cairo pentagons), a Klein bottle, a Möbius strip (its two faces one surface, over its edge onto the face behind), a cube, a cube with pits, a tetrahedron, an octahedron, a stella octangula, a dodecahedron, the triangle or hexagon sphere. Neighbours share an edge or a corner.

- **Rules** in `B…/S…/C…` notation: Conway's Life, HighLife, Seeds, Brian's Brain, Star Wars, Maze, Day & Night…, rules found by scans that last long on hexagons, triangles and Cairo pentagons, or any rule typed (on hexagons, with Callahan's letters for where 2, 3 or 4 neighbours sit: `o` side by side, `m` one apart, `p` opposite). With C states a cell is `0` dead, `1` alive or `2`… dying: **States** counts them all, so C states are dead, alive and C − 2 dying stages (5 · 3 dying: a cell that fails to survive fades for 3 generations before it is dead, and cannot be born again meanwhile).
- **Populations:** 1 to 12 colours that fight by the same rule, each starting in its part of the grid (see below). A cell keeps its colour while it lives and while it dies.
- **Births in a battle** (under States, *Births by majority colour*, and in the player's description): a dead cell is born only if one colour has more live neighbours than any other, and takes it. On a tie, it takes the one colour missing around it if just one is, else it stays dead. So Life (B3/S23) with 2 colours never meets a tie (3 neighbours split 2 + 1, Immigration), with 4 colours is QuadLife (1 + 1 + 1 gives the 4th colour: the colours never change who lives); a birth on 2 neighbours with 3 colours gives the third on 1 + 1; 1 + 1 + 1 with 3 colours, or 1 + 1 with 2, gives none. Under States, the ties the rule meets with the colours chosen, and what they give.
- **Where the colours start** (each colour its part of the grid; Wild fills the part, the other zones a patch at its middle, Famous a pattern there):
  - **the plane:** a grid of blocks, 2 × 1, 3 × 1, 2 × 2, 3 × 2, 4 × 2, 4 × 3 for 2, 3, 4, 6, 8, 12 colours;
  - **a torus:** blocks as square as can be on the doughnut, its ring 2.5 times its tube (12 colours 6 × 2), a block 2:1 at most (7 and 9 colours left out); its rows a multiple of 6, its columns a whole count of blocks round the ring; each tile in the block its middle is in. On squares, when the blocks can be as many squares round as along with the ring at most 20 % longer or shorter, they are, and the tube follows, its squares always square (12 colours on 48 rows: 144 columns, blocks 24 × 24);
  - **a Klein bottle:** each colour a slice round the ring;
  - **a Möbius strip:** its two faces one strip twice its length, each colour a stretch of it in turn, from the start of the face in view (red first), so that a face holds whole stretches when it can;
  - **a solid** (cube, pits, polyhedra, spheres): fair spots its symmetries swap (faces, corners or edges' middles; the cube with 3 colours, 2 opposite faces each), each cell to the nearest; Realm, a whole face each.
  - The 12 colours come in an order that keeps close hues apart in all these layouts: red, blue, gold, green, violet, cyan, magenta, lime, orange, pink, indigo, teal.
- **Start:**
  - **Hunt:** looks for the longest life, the longest death (a start that ends empty) or, in colours, the fairest battle (the longest contact between colours, by their balance). It runs on all the computer's cores until stopped, 1 run in 3 a random start and the others tweaks of the best; the 8 best are listed, a click plays one. Each has a light: in colours how even the battle is, in one colour how far it spreads (its most live cells at once against its cells at the start).
  - **Zones** where the hunt draws its starts, each colour in its part (see above):
    - **Spark … Jungle:** radius 1 to 8 round its part's middle (Spark, Seed, Sprout, Bloom, Grove, Meadow, Forest, Jungle; on an even side, round the middle corner);
    - **Realm:** on a solid, a whole face each; elsewhere, its whole part but its cells next to another colour's, so that the colours start two cells apart whatever the shape of their parts;
    - **Mirror:** on a solid, two opposite faces each (where the colouring pairs them);
    - **Wild:** its whole part, the colours side by side;
    - **Icon, Punk:** a picture (a Pixelarticons icon, a CryptoPunk), 24 cells or as big as fits, one a colour; **Emoji** (the plane, one colour): as big as the grid;
    - **Famous, Anywhere:** the rule's known patterns, turned and mirrored, at its part's middle or anywhere in it.

    Each random start is as dense as drawn between 10 and 70 %, each colour at least one cell alive; a zone with at most 20,000 possible starts has them all tried.
  - **Draw:** cells drawn by hand, or the rule's patterns.
  - On the plane, a start can have a **symmetry** (mirrors, turns).
  - **Digits:** the number's digits, one per cell, in base C.
- The start is kept in the link, so a found pattern can be shared.

#### Tilings left out

Of the duals of the k-uniform tilings of pentagons (Wikipedia, *Pentagonal tiling*, dual k-uniform tilings), the app has Dual 16, Dual 56 and Dual 314. These were tried and left out, not to be added again: too like one another, or too drawn out along one side, or all with the same asymmetry (a half turn, no mirror):

- 2-uniform: no. 17
- 3-uniform: no. 53, 55
- 4-uniform: no. 142, 143, 144
- 5-uniform: no. 309, 310, 311, 312, 315 (no. 303 on Wikimedia is no tiling of pentagons: its dual has hexagons)

### 2D spirals

| Mode | Base | Rule |
|---|:-:|---|
| Ulam square spiral | 2 | Follow the Ulam square spiral; `1` draw the step, `0` move without drawing |
| Ulam triangle spiral | 2 | Same, along a spiral of triangles |
| Ulam hexagon spiral | 2 | Same, along a spiral of hexagons |

## Regular patterns

A fraction's digits repeat, so its walk makes the same moves again and again: it draws regular patterns, and many of them close on themselves, which the app sees (`… digits max ↻`). A few of them:

- **Rosettes** in 2D: [11/604](https://vincentbounce.github.io/Walking-Pi/#x=11/604&w=triTurtle&d=451) on Triangles turtle, [3/497](https://vincentbounce.github.io/Walking-Pi/#x=3/497&w=hexTurtle&d=631) on Hexagons turtle, [2/541](https://vincentbounce.github.io/Walking-Pi/#x=2/541&w=turtle&d=541) on Squares turtle.
- **Loops on surfaces**: [96/95](https://vincentbounce.github.io/Walking-Pi/#x=96/95&w=torusGrid&d=5760&s=64x160) on the square torus, [189/188](https://vincentbounce.github.io/Walking-Pi/#x=189/188&w=cubeGrid&d=6625&s=48) round the cube, [149/148](https://vincentbounce.github.io/Walking-Pi/#x=149/148&w=icosaGrid&d=8641&s=48) round the triangle sphere.
- **Braids on the sphere of hexagons**: [318/305](https://vincentbounce.github.io/Walking-Pi/#x=318/305&w=hexSphereGrid&d=10000&s=32&st=3).

**[PATTERNS.md](PATTERNS.md)** lists the most striking ones walk by walk, with how they were found; the **Gallery**'s Treasures start with a curated choice.

## Features

- **Tabs** (top): the **Gallery**, then **Life**, **Ant** and **Walk**; under them 2D, 3D (the surfaces) and Space (a 3D lattice). Hover the Gallery to open it in the left pane, click it to keep it open.
  - **Treasures**: your setups, kept in this browser only, grouped as the tabs (Life, Ant, Walk). ☆ saves the setup in view (yellow while it is one of them), × deletes one, and the two arrows import or export them as a JSON file. On a first visit they hold a curated choice (rosettes, loops on surfaces, classics), yours to delete.
  - Hovering a setup shows it in the view, leaving the list brings back the one in use, a click keeps it and opens its parameters.
- **Play card** (bottom left): the number, its loop (`↻`) and base, a step slider, ⏮ and ▶︎ play / pause.
  - Hovering opens it: the walk and its rule, a chip per digit with its count, the stats (position, distance, cells or corners visited, or the automaton's lifetime), an **activity curve** (a walk's distance from its start along the whole walk; Life's live cells and its births + deaths per generation: chaos, then calm), the digits being read, one step and ⏭ jump to the end (in Life, +2k: 2,000 generations ahead), and the speed between a turtle and a rabbit (6 to 6,000,000 steps per second, 60 by default: steps evenly spread over the frames of a 60 or 120 Hz screen).
- **Display box** (top right, hover to open), with what fits the current tab:
  - **Auto-fit:** the view follows the walk and ends framed on it.
  - **Colours:** rainbow along the walk, rainbow cells, heatmap of visits, one colour per digit, or one colour.
  - **Cells** (2D and on surfaces): square buttons for the cells' look: an ant's states in **Ink** or **Amber**, **Path** (the rainbow line over the cells, faded), **Rainbow** along the walk, **Directions** (a colour per digit: a turn by its family on every tiling, for an ant and for the walks turning relative to their heading: left blue, right pink, a sharp one deeper, straight on gold; the fixed directions by the compass), **Heatmap** of visits.
  - **Area:** Empty, Light (translucent, the default) or Plain: each area the walk closes off is filled when it closes (squares, triangles or hexagons, up to a box of 12 million tile corners: 2 million digits of π fill in 1 to 2 seconds).
  - **Theme:** Light ☀, Dark ☾ or System ◐ (the default, following the system), kept in this browser; the surfaces keep their sky.
  - Grid, sky, auto-rotate (the solid tumbles on three axes), flat / round and perspective.
- **Navigation:** mouse wheel to zoom, drag to pan, double-click (or `F`) to fit.
  - In 3D: drag to rotate (it keeps Auto-fit, stops Auto-rotate), Shift+drag to pan; double-click centres the view, and on a view already centred brings back the starting view (Auto-rotate off).
  - On the surfaces, a walk shown whole is faced at once; while it moves, the camera turns to keep the walker in view, with a small arrow lying on the surface for its heading.
- **Drawing:** the walks, their cells, areas and surfaces are drawn by the graphics card (WebGL 2), so a walk of millions of steps still pans, zooms and turns smoothly; without WebGL 2, everything is drawn in 2D as before. The greyed-out WebGL 2 toggle at the bottom of the Display box shows which.
- **Links:** the page link always holds the current setup (number, walk, surface, size, start, rule, Life start), never the display settings.

Keyboard: `Space` play/pause · `→` one step · `R` restart · `E` jump to end · `F` centre (again: starting view)

## Run locally

There are no dependencies and no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Files

- `index.html`: page layout
- `style.css`: styles
- `main.js`: the formula worker, walk modes, surfaces and meshes, Game of Life and hunt, setups and gallery, and canvas rendering. Its header lists its parts.
- `PATTERNS.md`: the regular patterns of fractions, walk by walk
