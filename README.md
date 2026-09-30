# Walking π

A walk driven by the digits of **π**, other famous numbers, formulas and large primes. The walker moves on square, triangle or hexagon tiles, through a 3D lattice, around the Ulam spiral, or across a torus, a cube and other polyhedra. The same digits can also seed a **Game of Life** on those surfaces.

**▶ Live demo: https://vincentbounce.github.io/Walking-Pi/**

π₃ = 10.0102110122220102110021111102212222201112012121212001…

## Numbers

Every number is a **formula**, computed in the browser with `BigInt` in a Web Worker and written in the base the mode needs. You can get from 1,000 up to 10,000,000 digits. Integers and fractions are exact. Other numbers are computed in fixed point with guard digits, and a warning appears in the rare case where the last digits cannot be certain. The integer part is part of the walk.

The cards fill in the formula field; you can also type your own.

**Constants**

| Number | Method |
|---|---|
| π | Chudnovsky, by binary splitting |
| e | Σ 1/k!, by binary splitting |
| φ (golden ratio) | (1 + √5) / 2, integer square root |
| γ (Euler–Mascheroni constant) | Brent–McMillan, by binary splitting |
| G (Catalan's constant) | Lupaș series, by binary splitting |
| E (Erdős–Borwein constant) | Σ 2^(−n²)·(2ⁿ+1)/(2ⁿ−1) |

**𝑓 (formulas):** √2, ∛2, π², e^π, ln 2, ζ(3), 4/3, 16/9.

- ln 2 = 18·artanh(1/26) − 2·artanh(1/4801) + 8·artanh(1/8749).
- ζ(3) uses the Amdeberhan–Zeilberger series.

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
- **Dragon (paperfolding):** the folds of a strip folded in two again and again. As turns, it draws the dragon curve on Triangles left/right, Squares turtle and Hexagons relative.

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
