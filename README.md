# Walking π

A walk driven by the digits of **π**, other famous numbers, formulas and large primes. The walker moves on square, triangle or hexagon tiles, through a 3D lattice, around the Ulam spiral, or across a torus, a cube and other polyhedra. The same digits can also seed a **Game of Life** on those surfaces.

**▶ Live demo: https://vincentbounce.github.io/Walking-Pi/**

π₃ = 10.0102110122220102110021111102212222201112012121212001…

## Numbers

Every number is a **formula**, computed in the browser with `BigInt` in a Web Worker and written in the base the mode needs. You can get from 1,000 up to 10,000,000 digits. Integers and fractions are exact. Other numbers are computed in fixed point with guard digits, and a warning appears in the rare case where the last digits cannot be certain. The integer part is part of the walk.

The cards fill in the formula field; you can also type your own.

**Constants:** π, e, φ (golden ratio), γ (Euler–Mascheroni), G (Catalan), E (Erdős–Borwein).

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

Digit sequences, used alone: `random(seed)`, `champernowne`, `primes`, `primegaps`, `dragon`.

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

### 3D walks

| Mode | Base | Rule |
|---|:-:|---|
| Cubes | 5 | Relative to the heading: `0` turn left · `1` up · `2` straight · `3` down · `4` turn right |
| Cubes | 6 | `0` north · `1` east · `2` up · `3` south · `4` west · `5` down |

### Walks on surfaces

| Surface | Base | Rule |
|---|:-:|---|
| Square torus | 3 | `0` turn left · `1` straight on · `2` turn right |
| Hex torus | 5 | `0` sharp left · `1` left · `2` straight · `3` right · `4` sharp right |
| Cube | 3 | Squares on the faces of a cube: `0` turn left · `1` straight on · `2` turn right |
| Tetrahedron, octahedron, icosahedron | 2 | Triangles on the faces: exit through the `0` left or `1` right edge |

The walk keeps coming back to the same tiles, so each tile is coloured by its number of visits, on a log scale. The − / + buttons set the number of tiles. A surface can be shown **flat or round**: the torus unrolls into its sheet and the polyhedra flatten, and the walk goes on during the morph.

### Automata on surfaces

The digits seed a cellular automaton on a torus (squares or hexagons), a cube, a tetrahedron, an octahedron or an icosahedron. In base C, each cell starts `0` dead, `1` alive, or `2`… dying. Neighbours share an edge or a corner.

- **Rules** in `B…/S…/C…` notation.
  - Conway's Life, HighLife, Seeds, Brian's Brain, Star Wars, Maze, Day & Night…
  - Rules found by scans that last long on hexagons and triangles.
  - Any custom rule.
- **Methuselah hunt:** it looks for a start that lives as long as possible before it settles or loops.
  - The start covers the whole surface, or a small patch (radius 1, 2 or 3) with the rest dead.
  - 🔍 Hunt tries 1,000 random starts, then 2,000 tweaks of the best one, then plays the champion.
  - Clicking again skips to the tweaks, then plays the best so far.
  - When a patch has at most 20,000 possible starts, all of them are tried.
- The champion's start is kept in the link, so a found pattern can be shared.

### 2D spirals

| Mode | Base | Rule |
|---|:-:|---|
| Ulam square spiral | 2 | Follow the Ulam square spiral; `1` draw the step, `0` move without drawing |
| Ulam triangle spiral | 2 | Same, along a spiral of triangles |
| Ulam hexagon spiral | 2 | Same, along a spiral of hexagons |
| Ulam spiral jumps | 10 or 64 | Jump ahead digit + 1 cells along the spiral and mark the landing cell |
| Ulam spiral search | 10 or 64 | Mark cell n when the digits of n appear somewhere in the number's digits |

The search mode shows where a number stops containing every sequence of digits: all short numbers are found, then the coverage drops at each new digit length.

## Features

- **Play box** (bottom left):
  - ⏮ restart, ▶︎ play / pause, one step, ⏭ jump to the end (2,000 generations ahead for an automaton);
  - speed from 6 to 600,000 steps per second.
  - Hovering shows the stats (steps, position, distance, cells visited, digit counts or lifetime) and the digits being read.
- **Display box** (top right, hover to open), with what fits the current tab:
  - **Auto-fit:** the view follows the walk and ends framed on it.
  - **Colours:** rainbow along the walk, rainbow cells, rainbow by number of visits, one colour per digit, or one colour.
  - **Fill areas:** each area the walk closes off is filled when it closes.
  - Grid, sky, auto-rotate, flat / round and perspective.
- **Navigation:** mouse wheel to zoom, drag to pan, double-click to fit.
  - In 3D: drag to rotate, Shift+drag to pan.
  - On the surfaces, the camera turns to keep the walker in view, with a small arrow lying on the surface for its heading.
- **Setups:** the page link always holds the current setup (number, mode, surface, rule, Life start), never the display settings.
  - Save setups in the browser, copy a link, or export and import them as JSON.

Keyboard: `Space` play/pause · `→` one step · `R` restart · `E` jump to end · `F` auto-fit

## Run locally

There are no dependencies and no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Files

- `index.html`: page layout
- `style.css`: styles
- `main.js`: the formula worker, walk modes, surfaces and meshes, Game of Life and hunt, setups, and canvas rendering. Its header lists its parts.
