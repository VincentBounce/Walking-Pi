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

## Regular patterns on the sphere of hexagons

In *Walks on surface grids*, the **Hexagon sphere** reads base-2 digits as turns: `0` left, `1` right. An irrational number like π draws noise; a fraction has digits that repeat, so each period of digits makes the same turns again. When the repeating word turns by 0° in total (its count of `0`s minus its count of `1`s is a multiple of 6), each period shifts the walker straight on, and on the sphere the walk comes back exactly onto itself after a while. The walk then stops after that first round (`… digits max ↻`), and Fill areas is set aside.

The tables below list every such fraction p/q between 1 and 2 with q ≤ 512 and a period of at most 64 digits: **227 different patterns** (a word, its rotations, its mirror `0`↔`1` and its reverse count as one), each under its fraction with the smallest denominator. They were measured on the sphere of 10,242 hexagons; each number opens the live page.

- **Round**: steps before the walk is back exactly where it started; **corners**: corners walked; **area**: share of the sphere enclosed, at start 1.
- **Symmetry**: how many of the sphere's 60 rotations map the drawing onto itself (5: around a pentagon, 3: around the centre of a face, 2: around the middle of an edge), at the best of starts 1 to 8, which the link opens. Almost every pattern closes into a symmetric drawing: that is what makes these braids.
- **Chains** (80): one period's figure moves on one notch without ever walking an edge twice.
- **Bands** (128): the figure moves on but walks over its own edges: braided bands.
- **In place** (19): no shift per period: a small closed figure.

### The most striking (41): symmetry 5, at least 3,000 corners

| # | Number (best start) | Type | Period | Round | Corners |
|--:|---|---|--:|--:|--:|
| 1 | [318/305](https://vincentbounce.github.io/Walking-Pi/#x=318/305&w=hexSphereGrid&d=10000&s=32&st=3) (start 3) | chain | 60 | 9,600 | 7,985 |
| 2 | [166/157](https://vincentbounce.github.io/Walking-Pi/#x=166/157&w=hexSphereGrid&d=10000&s=32&st=3) (start 3) | chain | 52 | 8,320 | 7,305 |
| 3 | [326/325](https://vincentbounce.github.io/Walking-Pi/#x=326/325&w=hexSphereGrid&d=10000&s=32&st=4) (start 4) | band | 60 | 9,600 | 6,880 |
| 4 | [332/325](https://vincentbounce.github.io/Walking-Pi/#x=332/325&w=hexSphereGrid&d=10000&s=32) (start 1) | band | 60 | 9,600 | 6,870 |
| 5 | [62/61](https://vincentbounce.github.io/Walking-Pi/#x=62/61&w=hexSphereGrid&d=10000&s=32) (start 1) | band | 60 | 9,600 | 6,665 |
| 6 | [406/403](https://vincentbounce.github.io/Walking-Pi/#x=406/403&w=hexSphereGrid&d=10000&s=32&st=8) (start 8) | band | 60 | 9,600 | 6,640 |
| 7 | [418/397](https://vincentbounce.github.io/Walking-Pi/#x=418/397&w=hexSphereGrid&d=10000&s=32&st=3) (start 3) | chain | 44 | 7,040 | 6,105 |
| 8 | [336/325](https://vincentbounce.github.io/Walking-Pi/#x=336/325&w=hexSphereGrid&d=10000&s=32&st=3) (start 3) | band | 60 | 9,600 | 6,015 |
| 9 | [484/471](https://vincentbounce.github.io/Walking-Pi/#x=484/471&w=hexSphereGrid&d=10000&s=32&st=2) (start 2) | band | 52 | 8,320 | 5,985 |
| 10 | [182/177](https://vincentbounce.github.io/Walking-Pi/#x=182/177&w=hexSphereGrid&d=10000&s=32) (start 1) | band | 58 | 9,280 | 5,695 |
| 11 | [448/445](https://vincentbounce.github.io/Walking-Pi/#x=448/445&w=hexSphereGrid&d=10000&s=32&st=2) (start 2) | band | 44 | 7,040 | 5,375 |
| 12 | [266/265](https://vincentbounce.github.io/Walking-Pi/#x=266/265&w=hexSphereGrid&d=10000&s=32&st=6) (start 6) | band | 52 | 8,320 | 5,120 |
| 13 | [412/397](https://vincentbounce.github.io/Walking-Pi/#x=412/397&w=hexSphereGrid&d=10000&s=32&st=4) (start 4) | band | 44 | 7,040 | 5,050 |
| 14 | [98/97](https://vincentbounce.github.io/Walking-Pi/#x=98/97&w=hexSphereGrid&d=10000&s=32&st=2) (start 2) | band | 48 | 7,680 | 5,015 |
| 15 | [118/109](https://vincentbounce.github.io/Walking-Pi/#x=118/109&w=hexSphereGrid&d=10000&s=32&st=3) (start 3) | chain | 36 | 5,760 | 4,990 |
| 16 | [204/185](https://vincentbounce.github.io/Walking-Pi/#x=204/185&w=hexSphereGrid&d=10000&s=32&st=6) (start 6) | chain | 36 | 5,760 | 4,760 |
| 17 | [434/425](https://vincentbounce.github.io/Walking-Pi/#x=434/425&w=hexSphereGrid&d=10000&s=32&st=4) (start 4) | band | 40 | 6,400 | 4,760 |
| 18 | [372/365](https://vincentbounce.github.io/Walking-Pi/#x=372/365&w=hexSphereGrid&d=10000&s=32&st=4) (start 4) | band | 36 | 5,760 | 4,670 |
| 19 | [296/285](https://vincentbounce.github.io/Walking-Pi/#x=296/285&w=hexSphereGrid&d=10000&s=32&st=3) (start 3) | band | 36 | 5,760 | 4,650 |
| 20 | [352/351](https://vincentbounce.github.io/Walking-Pi/#x=352/351&w=hexSphereGrid&d=10000&s=32&st=2) (start 2) | band | 36 | 5,760 | 4,565 |
| 21 | [368/365](https://vincentbounce.github.io/Walking-Pi/#x=368/365&w=hexSphereGrid&d=10000&s=32&st=6) (start 6) | band | 36 | 5,760 | 4,480 |
| 22 | [286/285](https://vincentbounce.github.io/Walking-Pi/#x=286/285&w=hexSphereGrid&d=10000&s=32&st=2) (start 2) | band | 36 | 5,760 | 3,960 |
| 23 | [122/113](https://vincentbounce.github.io/Walking-Pi/#x=122/113&w=hexSphereGrid&d=10000&s=32&st=7) (start 7) | chain | 28 | 4,480 | 3,835 |
| 24 | [232/231](https://vincentbounce.github.io/Walking-Pi/#x=232/231&w=hexSphereGrid&d=10000&s=32) (start 1) | band | 30 | 4,800 | 3,790 |
| 25 | [434/429](https://vincentbounce.github.io/Walking-Pi/#x=434/429&w=hexSphereGrid&d=10000&s=32&st=4) (start 4) | band | 60 | 4,800 | 3,690 |
| 26 | [424/397](https://vincentbounce.github.io/Walking-Pi/#x=424/397&w=hexSphereGrid&d=10000&s=32&st=2) (start 2) | band | 44 | 7,040 | 3,565 |
| 27 | [350/339](https://vincentbounce.github.io/Walking-Pi/#x=350/339&w=hexSphereGrid&d=10000&s=32&st=3) (start 3) | band | 28 | 4,480 | 3,490 |
| 28 | [268/251](https://vincentbounce.github.io/Walking-Pi/#x=268/251&w=hexSphereGrid&d=10000&s=32&st=3) (start 3) | band | 50 | 8,000 | 3,475 |
| 29 | [54/53](https://vincentbounce.github.io/Walking-Pi/#x=54/53&w=hexSphereGrid&d=10000&s=32) (start 1) | band | 52 | 8,320 | 3,435 |
| 30 | [398/385](https://vincentbounce.github.io/Walking-Pi/#x=398/385&w=hexSphereGrid&d=10000&s=32) (start 1) | band | 60 | 9,600 | 3,405 |
| 31 | [148/145](https://vincentbounce.github.io/Walking-Pi/#x=148/145&w=hexSphereGrid&d=10000&s=32&st=4) (start 4) | band | 28 | 4,480 | 3,360 |
| 32 | [188/185](https://vincentbounce.github.io/Walking-Pi/#x=188/185&w=hexSphereGrid&d=10000&s=32&st=2) (start 2) | band | 36 | 5,760 | 3,350 |
| 33 | [284/279](https://vincentbounce.github.io/Walking-Pi/#x=284/279&w=hexSphereGrid&d=10000&s=32&st=3) (start 3) | band | 30 | 4,800 | 3,335 |
| 34 | [388/387](https://vincentbounce.github.io/Walking-Pi/#x=388/387&w=hexSphereGrid&d=10000&s=32) (start 1) | band | 42 | 6,720 | 3,335 |
| 35 | [226/221](https://vincentbounce.github.io/Walking-Pi/#x=226/221&w=hexSphereGrid&d=10000&s=32&st=7) (start 7) | band | 24 | 3,840 | 3,255 |
| 36 | [100/99](https://vincentbounce.github.io/Walking-Pi/#x=100/99&w=hexSphereGrid&d=10000&s=32&st=2) (start 2) | band | 30 | 4,800 | 3,245 |
| 37 | [120/119](https://vincentbounce.github.io/Walking-Pi/#x=120/119&w=hexSphereGrid&d=10000&s=32&st=5) (start 5) | band | 24 | 3,840 | 3,180 |
| 38 | [158/157](https://vincentbounce.github.io/Walking-Pi/#x=158/157&w=hexSphereGrid&d=10000&s=32) (start 1) | band | 52 | 4,160 | 3,175 |
| 39 | [272/267](https://vincentbounce.github.io/Walking-Pi/#x=272/267&w=hexSphereGrid&d=10000&s=32&st=8) (start 8) | band | 22 | 3,520 | 3,095 |
| 40 | [266/241](https://vincentbounce.github.io/Walking-Pi/#x=266/241&w=hexSphereGrid&d=10000&s=32&st=2) (start 2) | chain | 24 | 3,840 | 3,070 |
| 41 | [340/339](https://vincentbounce.github.io/Walking-Pi/#x=340/339&w=hexSphereGrid&d=10000&s=32&st=4) (start 4) | band | 28 | 4,480 | 3,050 |

### Chains, by width over step (80)

| # | Number | Period | Word | Width / step | Round | Corners | Area | Symmetry (start) |
|--:|---|--:|---|--:|--:|--:|--:|--:|
| 1 | [268/257](https://vincentbounce.github.io/Walking-Pi/#x=268/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0000101011110101` | 2.02 | 1,536 | 1,515 | 34.6 % | 3 ([6](https://vincentbounce.github.io/Walking-Pi/#x=268/257&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 2 | [318/305](https://vincentbounce.github.io/Walking-Pi/#x=318/305&w=hexSphereGrid&d=10000&s=32) | 60 | `000010101110100101…` | 1.83 | 9,600 | 7,930 | 88.4 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=318/305&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 3 | [360/331](https://vincentbounce.github.io/Walking-Pi/#x=360/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000101100110110111…` | 1.83 | 1,920 | 1,854 | 35.8 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=360/331&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 4 | [166/157](https://vincentbounce.github.io/Walking-Pi/#x=166/157&w=hexSphereGrid&d=10000&s=32) | 52 | `000011101010110011…` | 1.64 | 8,320 | 6,910 | 89.3 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=166/157&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 5 | [134/129](https://vincentbounce.github.io/Walking-Pi/#x=134/129&w=hexSphereGrid&d=10000&s=32) | 14 | `00001001111011` | 1.45 | 1,120 | 1,105 | 25.0 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=134/129&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 6 | [68/65](https://vincentbounce.github.io/Walking-Pi/#x=68/65&w=hexSphereGrid&d=10000&s=32) | 12 | `000010111101` | 1.44 | 1,152 | 1,146 | 35.5 % | 3 ([5](https://vincentbounce.github.io/Walking-Pi/#x=68/65&w=hexSphereGrid&d=10000&s=32&st=5)) |
| 7 | [156/145](https://vincentbounce.github.io/Walking-Pi/#x=156/145&w=hexSphereGrid&d=10000&s=32) | 28 | `000100110110101110…` | 1.44 | 1,344 | 1,317 | 32.5 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=156/145&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 8 | [20/19](https://vincentbounce.github.io/Walking-Pi/#x=20/19&w=hexSphereGrid&d=10000&s=32) | 18 | `000011010111100101` | 1.25 | 1,152 | 1,146 | 41.0 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=20/19&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 9 | [184/171](https://vincentbounce.github.io/Walking-Pi/#x=184/171&w=hexSphereGrid&d=10000&s=32) | 18 | `000100110111011001` | 1.25 | 1,152 | 1,136 | 39.1 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=184/171&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 10 | [44/41](https://vincentbounce.github.io/Walking-Pi/#x=44/41&w=hexSphereGrid&d=10000&s=32) | 20 | `00010010101110110101` | 1.16 | 960 | 948 | 34.1 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=44/41&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 11 | [214/205](https://vincentbounce.github.io/Walking-Pi/#x=214/205&w=hexSphereGrid&d=10000&s=32) | 20 | `00001011001111010011` | 1.16 | 960 | 954 | 34.1 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=214/205&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 12 | [250/241](https://vincentbounce.github.io/Walking-Pi/#x=250/241&w=hexSphereGrid&d=10000&s=32) | 24 | `000010011000111101…` | 1.16 | 1,152 | 1,128 | 33.2 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=250/241&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 13 | [118/109](https://vincentbounce.github.io/Walking-Pi/#x=118/109&w=hexSphereGrid&d=10000&s=32) | 36 | `000101010010001100…` | 1.06 | 5,760 | 4,595 | 86.2 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=118/109&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 14 | [356/331](https://vincentbounce.github.io/Walking-Pi/#x=356/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000100110101010111…` | 1.06 | 960 | 950 | 43.9 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=356/331&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 15 | [502/481](https://vincentbounce.github.io/Walking-Pi/#x=502/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000010110010110100…` | 1.01 | 864 | 852 | 31.3 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=502/481&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 16 | [484/465](https://vincentbounce.github.io/Walking-Pi/#x=484/465&w=hexSphereGrid&d=10000&s=32) | 20 | `00001010011101011101` | 0.91 | 1,920 | 1,848 | 51.7 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=484/465&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 17 | [332/315](https://vincentbounce.github.io/Walking-Pi/#x=332/315&w=hexSphereGrid&d=10000&s=32) | 12 | `000011011101` | 0.91 | 768 | 768 | 40.3 % | 2 ([1](https://vincentbounce.github.io/Walking-Pi/#x=332/315&w=hexSphereGrid&d=10000&s=32)) |
| 18 | [18/17](https://vincentbounce.github.io/Walking-Pi/#x=18/17&w=hexSphereGrid&d=10000&s=32) | 8 | `00001111` | 0.87 | 768 | 768 | 36.4 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=18/17&w=hexSphereGrid&d=10000&s=32)) |
| 19 | [26/25](https://vincentbounce.github.io/Walking-Pi/#x=26/25&w=hexSphereGrid&d=10000&s=32) | 20 | `00001010001111010111` | 0.87 | 960 | 951 | 34.1 % | 3 ([3](https://vincentbounce.github.io/Walking-Pi/#x=26/25&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 20 | [254/241](https://vincentbounce.github.io/Walking-Pi/#x=254/241&w=hexSphereGrid&d=10000&s=32) | 24 | `000011011100111100…` | 0.87 | 1,152 | 1,137 | 34.1 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=254/241&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 21 | [270/257](https://vincentbounce.github.io/Walking-Pi/#x=270/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0000110011110011` | 0.87 | 768 | 768 | 35.0 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=270/257&w=hexSphereGrid&d=10000&s=32)) |
| 22 | [276/257](https://vincentbounce.github.io/Walking-Pi/#x=276/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0001001011101101` | 0.87 | 768 | 768 | 35.0 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=276/257&w=hexSphereGrid&d=10000&s=32)) |
| 23 | [122/113](https://vincentbounce.github.io/Walking-Pi/#x=122/113&w=hexSphereGrid&d=10000&s=32) | 28 | `000101000110001110…` | 0.87 | 4,480 | 3,830 | 85.4 % | 5 ([7](https://vincentbounce.github.io/Walking-Pi/#x=122/113&w=hexSphereGrid&d=10000&s=32&st=7)) |
| 24 | [122/117](https://vincentbounce.github.io/Walking-Pi/#x=122/117&w=hexSphereGrid&d=10000&s=32) | 12 | `000010101111` | 0.78 | 768 | 768 | 40.3 % | 2 ([1](https://vincentbounce.github.io/Walking-Pi/#x=122/117&w=hexSphereGrid&d=10000&s=32)) |
| 25 | [200/189](https://vincentbounce.github.io/Walking-Pi/#x=200/189&w=hexSphereGrid&d=10000&s=32) | 18 | `000011101110011001` | 0.78 | 1,728 | 1,680 | 52.2 % | 3 ([7](https://vincentbounce.github.io/Walking-Pi/#x=200/189&w=hexSphereGrid&d=10000&s=32&st=7)) |
| 26 | [346/331](https://vincentbounce.github.io/Walking-Pi/#x=346/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000010111001100111…` | 0.77 | 960 | 960 | 41.9 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=346/331&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 27 | [348/331](https://vincentbounce.github.io/Walking-Pi/#x=348/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000011010010010111…` | 0.77 | 960 | 954 | 38.1 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=348/331&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 28 | [354/331](https://vincentbounce.github.io/Walking-Pi/#x=354/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000100011100100111…` | 0.77 | 960 | 960 | 41.9 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=354/331&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 29 | [118/113](https://vincentbounce.github.io/Walking-Pi/#x=118/113&w=hexSphereGrid&d=10000&s=32) | 28 | `000010110101001111…` | 0.72 | 672 | 672 | 33.1 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=118/113&w=hexSphereGrid&d=10000&s=32)) |
| 30 | [140/129](https://vincentbounce.github.io/Walking-Pi/#x=140/129&w=hexSphereGrid&d=10000&s=32) | 14 | `00010101110101` | 0.72 | 560 | 560 | 25.0 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=140/129&w=hexSphereGrid&d=10000&s=32)) |
| 31 | [398/381](https://vincentbounce.github.io/Walking-Pi/#x=398/381&w=hexSphereGrid&d=10000&s=32) | 14 | `00001011011011` | 0.71 | 1,344 | 1,320 | 53.2 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=398/381&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 32 | [12/11](https://vincentbounce.github.io/Walking-Pi/#x=12/11&w=hexSphereGrid&d=10000&s=32) | 10 | `0001011101` | 0.67 | 640 | 640 | 40.9 % | 5 ([5](https://vincentbounce.github.io/Walking-Pi/#x=12/11&w=hexSphereGrid&d=10000&s=32&st=5)) |
| 33 | [46/43](https://vincentbounce.github.io/Walking-Pi/#x=46/43&w=hexSphereGrid&d=10000&s=32) | 14 | `00010001110111` | 0.67 | 896 | 888 | 39.1 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=46/43&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 34 | [478/455](https://vincentbounce.github.io/Walking-Pi/#x=478/455&w=hexSphereGrid&d=10000&s=32) | 12 | `000011001111` | 0.67 | 768 | 764 | 41.0 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=478/455&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 35 | [98/93](https://vincentbounce.github.io/Walking-Pi/#x=98/93&w=hexSphereGrid&d=10000&s=32) | 10 | `0000110111` | 0.66 | 640 | 640 | 40.9 % | 2 ([1](https://vincentbounce.github.io/Walking-Pi/#x=98/93&w=hexSphereGrid&d=10000&s=32)) |
| 36 | [204/185](https://vincentbounce.github.io/Walking-Pi/#x=204/185&w=hexSphereGrid&d=10000&s=32) | 36 | `000110100100101010…` | 0.64 | 2,304 | 2,222 | 72.0 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=204/185&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 37 | [10/9](https://vincentbounce.github.io/Walking-Pi/#x=10/9&w=hexSphereGrid&d=10000&s=32) | 6 | `000111` | 0.58 | 480 | 480 | 26.6 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=10/9&w=hexSphereGrid&d=10000&s=32)) |
| 38 | [276/241](https://vincentbounce.github.io/Walking-Pi/#x=276/241&w=hexSphereGrid&d=10000&s=32) | 24 | `001001010010110110…` | 0.58 | 576 | 576 | 35.0 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=276/241&w=hexSphereGrid&d=10000&s=32)) |
| 39 | [14/13](https://vincentbounce.github.io/Walking-Pi/#x=14/13&w=hexSphereGrid&d=10000&s=32) | 12 | `000100111011` | 0.58 | 576 | 576 | 35.9 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=14/13&w=hexSphereGrid&d=10000&s=32)) |
| 40 | [278/255](https://vincentbounce.github.io/Walking-Pi/#x=278/255&w=hexSphereGrid&d=10000&s=32) | 8 | `00010111` | 0.54 | 512 | 512 | 41.6 % | 2 ([1](https://vincentbounce.github.io/Walking-Pi/#x=278/255&w=hexSphereGrid&d=10000&s=32)) |
| 41 | [62/57](https://vincentbounce.github.io/Walking-Pi/#x=62/57&w=hexSphereGrid&d=10000&s=32) | 18 | `000101100111010011` | 0.48 | 576 | 576 | 40.0 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=62/57&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 42 | [196/171](https://vincentbounce.github.io/Walking-Pi/#x=196/171&w=hexSphereGrid&d=10000&s=32) | 18 | `001001010110110101` | 0.48 | 576 | 576 | 40.0 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=196/171&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 43 | [278/257](https://vincentbounce.github.io/Walking-Pi/#x=278/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0001010011101011` | 0.48 | 2,560 | 2,160 | 84.2 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=278/257&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 44 | [294/257](https://vincentbounce.github.io/Walking-Pi/#x=294/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0010010011011011` | 0.48 | 2,560 | 2,270 | 84.2 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=294/257&w=hexSphereGrid&d=10000&s=32)) |
| 45 | [506/481](https://vincentbounce.github.io/Walking-Pi/#x=506/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000011010100111000…` | 0.48 | 2,880 | 2,560 | 84.7 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=506/481&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 46 | [532/481](https://vincentbounce.github.io/Walking-Pi/#x=532/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000110110010010010…` | 0.48 | 576 | 576 | 36.9 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=532/481&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 47 | [386/357](https://vincentbounce.github.io/Walking-Pi/#x=386/357&w=hexSphereGrid&d=10000&s=32) | 24 | `000101001100101110…` | 0.46 | 1,536 | 1,514 | 73.3 % | 2 ([2](https://vincentbounce.github.io/Walking-Pi/#x=386/357&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 48 | [418/397](https://vincentbounce.github.io/Walking-Pi/#x=418/397&w=hexSphereGrid&d=10000&s=32) | 44 | `000011011000101010…` | 0.45 | 7,040 | 6,030 | 92.8 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=418/397&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 49 | [206/195](https://vincentbounce.github.io/Walking-Pi/#x=206/195&w=hexSphereGrid&d=10000&s=32) | 12 | `000011100111` | 0.43 | 576 | 576 | 35.9 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=206/195&w=hexSphereGrid&d=10000&s=32)) |
| 50 | [222/205](https://vincentbounce.github.io/Walking-Pi/#x=222/205&w=hexSphereGrid&d=10000&s=32) | 20 | `00010101001110101011` | 0.43 | 480 | 480 | 35.0 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=222/205&w=hexSphereGrid&d=10000&s=32)) |
| 51 | [236/205](https://vincentbounce.github.io/Walking-Pi/#x=236/205&w=hexSphereGrid&d=10000&s=32) | 20 | `00100110101101100101` | 0.43 | 480 | 480 | 34.1 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=236/205&w=hexSphereGrid&d=10000&s=32)) |
| 52 | [370/341](https://vincentbounce.github.io/Walking-Pi/#x=370/341&w=hexSphereGrid&d=10000&s=32) | 10 | `0001010111` | 0.43 | 480 | 480 | 36.4 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=370/341&w=hexSphereGrid&d=10000&s=32)) |
| 53 | [418/381](https://vincentbounce.github.io/Walking-Pi/#x=418/381&w=hexSphereGrid&d=10000&s=32) | 14 | `00011000110111` | 0.43 | 2,240 | 2,180 | 68.9 % | 5 ([8](https://vincentbounce.github.io/Walking-Pi/#x=418/381&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 54 | [142/129](https://vincentbounce.github.io/Walking-Pi/#x=142/129&w=hexSphereGrid&d=10000&s=32) | 14 | `00011001110011` | 0.40 | 2,240 | 2,030 | 75.7 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=142/129&w=hexSphereGrid&d=10000&s=32)) |
| 55 | [148/129](https://vincentbounce.github.io/Walking-Pi/#x=148/129&w=hexSphereGrid&d=10000&s=32) | 14 | `00100101101101` | 0.40 | 2,240 | 2,030 | 75.4 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=148/129&w=hexSphereGrid&d=10000&s=32)) |
| 56 | [94/85](https://vincentbounce.github.io/Walking-Pi/#x=94/85&w=hexSphereGrid&d=10000&s=32) | 8 | `00011011` | 0.38 | 1,280 | 640 | 27.3 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=94/85&w=hexSphereGrid&d=10000&s=32)) |
| 57 | [116/105](https://vincentbounce.github.io/Walking-Pi/#x=116/105&w=hexSphereGrid&d=10000&s=32) | 12 | `000110101101` | 0.37 | 1,920 | 1,880 | 81.4 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=116/105&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 58 | [522/455](https://vincentbounce.github.io/Walking-Pi/#x=522/455&w=hexSphereGrid&d=10000&s=32) | 12 | `001001011011` | 0.37 | 1,920 | 1,885 | 82.3 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=522/455&w=hexSphereGrid&d=10000&s=32)) |
| 59 | [302/273](https://vincentbounce.github.io/Walking-Pi/#x=302/273&w=hexSphereGrid&d=10000&s=32) | 12 | `000110110011` | 0.33 | 1,920 | 1,880 | 81.7 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=302/273&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 60 | [238/219](https://vincentbounce.github.io/Walking-Pi/#x=238/219&w=hexSphereGrid&d=10000&s=32) | 18 | `000101100011010111` | 0.31 | 2,880 | 2,770 | 78.3 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=238/219&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 61 | [6/5](https://vincentbounce.github.io/Walking-Pi/#x=6/5&w=hexSphereGrid&d=10000&s=32) | 4 | `0011` | 0.29 | 384 | 384 | 36.4 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=6/5&w=hexSphereGrid&d=10000&s=32)) |
| 62 | [4/3](https://vincentbounce.github.io/Walking-Pi/#x=4/3&w=hexSphereGrid&d=10000&s=32) | 2 | `01` | 0.29 | 320 | 320 | 25.8 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=4/3&w=hexSphereGrid&d=10000&s=32)) |
| 63 | [76/65](https://vincentbounce.github.io/Walking-Pi/#x=76/65&w=hexSphereGrid&d=10000&s=32) | 12 | `001010110101` | 0.29 | 1,920 | 1,680 | 83.8 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=76/65&w=hexSphereGrid&d=10000&s=32)) |
| 64 | [282/257](https://vincentbounce.github.io/Walking-Pi/#x=282/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0001100011100111` | 0.29 | 512 | 512 | 36.4 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=282/257&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 65 | [522/481](https://vincentbounce.github.io/Walking-Pi/#x=522/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000101011101001000…` | 0.29 | 576 | 576 | 37.8 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=522/481&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 66 | [194/185](https://vincentbounce.github.io/Walking-Pi/#x=194/185&w=hexSphereGrid&d=10000&s=32) | 36 | `000011000111010000…` | 0.29 | 3,456 | 2,457 | 67.1 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=194/185&w=hexSphereGrid&d=10000&s=32)) |
| 67 | [262/241](https://vincentbounce.github.io/Walking-Pi/#x=262/241&w=hexSphereGrid&d=10000&s=32) | 24 | `000101100100111010…` | 0.29 | 1,536 | 1,506 | 73.9 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=262/241&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 68 | [266/241](https://vincentbounce.github.io/Walking-Pi/#x=266/241&w=hexSphereGrid&d=10000&s=32) | 24 | `000110101000111001…` | 0.29 | 2,304 | 1,152 | 39.2 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=266/241&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 69 | [38/33](https://vincentbounce.github.io/Walking-Pi/#x=38/33&w=hexSphereGrid&d=10000&s=32) | 10 | `0010011011` | 0.29 | 400 | 400 | 26.6 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=38/33&w=hexSphereGrid&d=10000&s=32)) |
| 70 | [502/455](https://vincentbounce.github.io/Walking-Pi/#x=502/455&w=hexSphereGrid&d=10000&s=32) | 12 | `000110100111` | 0.29 | 1,920 | 1,870 | 82.3 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=502/455&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 71 | [20/17](https://vincentbounce.github.io/Walking-Pi/#x=20/17&w=hexSphereGrid&d=10000&s=32) | 8 | `00101101` | 0.29 | 384 | 384 | 35.9 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=20/17&w=hexSphereGrid&d=10000&s=32)) |
| 72 | [226/205](https://vincentbounce.github.io/Walking-Pi/#x=226/205&w=hexSphereGrid&d=10000&s=32) | 20 | `00011010001110010111` | 0.29 | 480 | 480 | 36.9 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=226/205&w=hexSphereGrid&d=10000&s=32)) |
| 73 | [300/257](https://vincentbounce.github.io/Walking-Pi/#x=300/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0010101011010101` | 0.29 | 384 | 384 | 35.0 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=300/257&w=hexSphereGrid&d=10000&s=32)) |
| 74 | [74/63](https://vincentbounce.github.io/Walking-Pi/#x=74/63&w=hexSphereGrid&d=10000&s=32) | 6 | `001011` | 0.29 | 384 | 384 | 41.6 % | 2 ([1](https://vincentbounce.github.io/Walking-Pi/#x=74/63&w=hexSphereGrid&d=10000&s=32)) |
| 75 | [298/255](https://vincentbounce.github.io/Walking-Pi/#x=298/255&w=hexSphereGrid&d=10000&s=32) | 8 | `00101011` | 0.25 | 768 | 759 | 55.2 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=298/255&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 76 | [350/331](https://vincentbounce.github.io/Walking-Pi/#x=350/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000011101011000111…` | 0.22 | 1,920 | 1,796 | 79.5 % | 5 ([5](https://vincentbounce.github.io/Walking-Pi/#x=350/331&w=hexSphereGrid&d=10000&s=32&st=5)) |
| 77 | [420/397](https://vincentbounce.github.io/Walking-Pi/#x=420/397&w=hexSphereGrid&d=10000&s=32) | 44 | `000011101101010011…` | 0.22 | 528 | 528 | 35.0 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=420/397&w=hexSphereGrid&d=10000&s=32)) |
| 78 | [398/341](https://vincentbounce.github.io/Walking-Pi/#x=398/341&w=hexSphereGrid&d=10000&s=32) | 10 | `0010101011` | 0.21 | 1,600 | 1,570 | 82.3 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=398/341&w=hexSphereGrid&d=10000&s=32)) |
| 79 | [50/43](https://vincentbounce.github.io/Walking-Pi/#x=50/43&w=hexSphereGrid&d=10000&s=32) | 14 | `00101001101011` | 0.19 | 1,120 | 640 | 27.3 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=50/43&w=hexSphereGrid&d=10000&s=32)) |
| 80 | [302/257](https://vincentbounce.github.io/Walking-Pi/#x=302/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0010110011010011` | 0.14 | 384 | 384 | 35.9 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=302/257&w=hexSphereGrid&d=10000&s=32)) |

### Bands, by corners walked (128)

| # | Number | Period | Word | Step | Round | Corners | Area | Symmetry (start) |
|--:|---|--:|---|--:|--:|--:|--:|--:|
| 1 | [332/325](https://vincentbounce.github.io/Walking-Pi/#x=332/325&w=hexSphereGrid&d=10000&s=32) | 60 | `000001011000001110…` | 15.00 | 9,600 | 6,870 | 92.1 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=332/325&w=hexSphereGrid&d=10000&s=32)) |
| 2 | [62/61](https://vincentbounce.github.io/Walking-Pi/#x=62/61&w=hexSphereGrid&d=10000&s=32) | 60 | `000001000011001001…` | 21.00 | 9,600 | 6,665 | 93.9 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=62/61&w=hexSphereGrid&d=10000&s=32)) |
| 3 | [406/403](https://vincentbounce.github.io/Walking-Pi/#x=406/403&w=hexSphereGrid&d=10000&s=32) | 60 | `000000011110011111…` | 7.94 | 9,600 | 6,620 | 86.1 % | 5 ([8](https://vincentbounce.github.io/Walking-Pi/#x=406/403&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 4 | [484/471](https://vincentbounce.github.io/Walking-Pi/#x=484/471&w=hexSphereGrid&d=10000&s=32) | 52 | `000001110001000011…` | 19.52 | 8,320 | 5,975 | 87.0 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=484/471&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 5 | [182/177](https://vincentbounce.github.io/Walking-Pi/#x=182/177&w=hexSphereGrid&d=10000&s=32) | 58 | `000001110011101101…` | 22.52 | 9,280 | 5,695 | 79.0 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=182/177&w=hexSphereGrid&d=10000&s=32)) |
| 6 | [448/445](https://vincentbounce.github.io/Walking-Pi/#x=448/445&w=hexSphereGrid&d=10000&s=32) | 44 | `000000011011100111…` | 10.82 | 7,040 | 5,345 | 74.2 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=448/445&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 7 | [336/325](https://vincentbounce.github.io/Walking-Pi/#x=336/325&w=hexSphereGrid&d=10000&s=32) | 60 | `000010001010101000…` | 9.00 | 9,600 | 5,075 | 85.5 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=336/325&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 8 | [412/397](https://vincentbounce.github.io/Walking-Pi/#x=412/397&w=hexSphereGrid&d=10000&s=32) | 44 | `000010011010110000…` | 9.00 | 7,040 | 4,835 | 85.5 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=412/397&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 9 | [266/265](https://vincentbounce.github.io/Walking-Pi/#x=266/265&w=hexSphereGrid&d=10000&s=32) | 52 | `000000001111011101…` | 9.00 | 8,320 | 4,820 | 85.6 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=266/265&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 10 | [372/365](https://vincentbounce.github.io/Walking-Pi/#x=372/365&w=hexSphereGrid&d=10000&s=32) | 36 | `000001001110100011…` | 10.82 | 5,760 | 4,655 | 80.3 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=372/365&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 11 | [296/285](https://vincentbounce.github.io/Walking-Pi/#x=296/285&w=hexSphereGrid&d=10000&s=32) | 36 | `000010011110000101…` | 7.94 | 5,760 | 4,600 | 77.9 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=296/285&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 12 | [326/325](https://vincentbounce.github.io/Walking-Pi/#x=326/325&w=hexSphereGrid&d=10000&s=32) | 60 | `000000001100100110…` | 27.00 | 5,760 | 4,572 | 88.4 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=326/325&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 13 | [352/351](https://vincentbounce.github.io/Walking-Pi/#x=352/351&w=hexSphereGrid&d=10000&s=32) | 36 | `000000001011101010…` | 10.54 | 5,760 | 4,530 | 79.0 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=352/351&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 14 | [434/425](https://vincentbounce.github.io/Walking-Pi/#x=434/425&w=hexSphereGrid&d=10000&s=32) | 40 | `000001010110101111…` | 9.00 | 6,400 | 4,525 | 84.9 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=434/425&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 15 | [496/495](https://vincentbounce.github.io/Walking-Pi/#x=496/495&w=hexSphereGrid&d=10000&s=32) | 60 | `000000001000010001…` | 12.12 | 5,760 | 4,197 | 83.0 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=496/495&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 16 | [368/365](https://vincentbounce.github.io/Walking-Pi/#x=368/365&w=hexSphereGrid&d=10000&s=32) | 36 | `000000100001101010…` | 9.00 | 5,760 | 4,010 | 85.2 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=368/365&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 17 | [286/285](https://vincentbounce.github.io/Walking-Pi/#x=286/285&w=hexSphereGrid&d=10000&s=32) | 36 | `000000001110010111…` | 10.82 | 5,760 | 3,910 | 78.5 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=286/285&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 18 | [232/231](https://vincentbounce.github.io/Walking-Pi/#x=232/231&w=hexSphereGrid&d=10000&s=32) | 30 | `000000010001101110…` | 9.00 | 4,800 | 3,790 | 84.7 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=232/231&w=hexSphereGrid&d=10000&s=32)) |
| 19 | [254/251](https://vincentbounce.github.io/Walking-Pi/#x=254/251&w=hexSphereGrid&d=10000&s=32) | 50 | `000000110000111101…` | 5.20 | 4,800 | 3,735 | 27.9 % | 5 ([8](https://vincentbounce.github.io/Walking-Pi/#x=254/251&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 20 | [54/53](https://vincentbounce.github.io/Walking-Pi/#x=54/53&w=hexSphereGrid&d=10000&s=32) | 52 | `000001001101010010…` | 3.00 | 8,320 | 3,435 | 25.9 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=54/53&w=hexSphereGrid&d=10000&s=32)) |
| 21 | [398/385](https://vincentbounce.github.io/Walking-Pi/#x=398/385&w=hexSphereGrid&d=10000&s=32) | 60 | `000010001010010011…` | 3.00 | 9,600 | 3,405 | 25.3 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=398/385&w=hexSphereGrid&d=10000&s=32)) |
| 22 | [388/387](https://vincentbounce.github.io/Walking-Pi/#x=388/387&w=hexSphereGrid&d=10000&s=32) | 42 | `000000001010100101…` | 19.05 | 6,720 | 3,335 | 77.2 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=388/387&w=hexSphereGrid&d=10000&s=32)) |
| 23 | [188/185](https://vincentbounce.github.io/Walking-Pi/#x=188/185&w=hexSphereGrid&d=10000&s=32) | 36 | `000001000010011010…` | 9.00 | 5,760 | 3,250 | 84.8 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=188/185&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 24 | [226/221](https://vincentbounce.github.io/Walking-Pi/#x=226/221&w=hexSphereGrid&d=10000&s=32) | 24 | `000001011100101010…` | 10.82 | 3,840 | 3,240 | 79.2 % | 5 ([7](https://vincentbounce.github.io/Walking-Pi/#x=226/221&w=hexSphereGrid&d=10000&s=32&st=7)) |
| 25 | [158/157](https://vincentbounce.github.io/Walking-Pi/#x=158/157&w=hexSphereGrid&d=10000&s=32) | 52 | `000000011010000101…` | 18.00 | 4,160 | 3,175 | 84.8 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=158/157&w=hexSphereGrid&d=10000&s=32)) |
| 26 | [272/267](https://vincentbounce.github.io/Walking-Pi/#x=272/267&w=hexSphereGrid&d=10000&s=32) | 22 | `000001001100101101…` | 10.54 | 3,520 | 3,075 | 83.0 % | 5 ([8](https://vincentbounce.github.io/Walking-Pi/#x=272/267&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 27 | [346/345](https://vincentbounce.github.io/Walking-Pi/#x=346/345&w=hexSphereGrid&d=10000&s=32) | 44 | `000000001011110111…` | 12.12 | 4,224 | 3,057 | 75.8 % | 3 ([7](https://vincentbounce.github.io/Walking-Pi/#x=346/345&w=hexSphereGrid&d=10000&s=32&st=7)) |
| 28 | [120/119](https://vincentbounce.github.io/Walking-Pi/#x=120/119&w=hexSphereGrid&d=10000&s=32) | 24 | `000000100010011010…` | 9.00 | 3,840 | 2,970 | 84.4 % | 5 ([5](https://vincentbounce.github.io/Walking-Pi/#x=120/119&w=hexSphereGrid&d=10000&s=32&st=5)) |
| 29 | [500/481](https://vincentbounce.github.io/Walking-Pi/#x=500/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000010100001110010…` | 3.00 | 5,760 | 2,880 | 23.1 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=500/481&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 30 | [258/251](https://vincentbounce.github.io/Walking-Pi/#x=258/251&w=hexSphereGrid&d=10000&s=32) | 50 | `000001110010001110…` | 10.39 | 4,000 | 2,870 | 34.4 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=258/251&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 31 | [386/385](https://vincentbounce.github.io/Walking-Pi/#x=386/385&w=hexSphereGrid&d=10000&s=32) | 60 | `000000001010101000…` | 13.08 | 3,840 | 2,856 | 73.1 % | 3 ([4](https://vincentbounce.github.io/Walking-Pi/#x=386/385&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 32 | [268/251](https://vincentbounce.github.io/Walking-Pi/#x=268/251&w=hexSphereGrid&d=10000&s=32) | 50 | `000100010101011010…` | 5.20 | 3,200 | 2,740 | 48.6 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=268/251&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 33 | [292/291](https://vincentbounce.github.io/Walking-Pi/#x=292/291&w=hexSphereGrid&d=10000&s=32) | 48 | `000000001110000100…` | 21.00 | 3,072 | 2,726 | 91.3 % | 2 ([5](https://vincentbounce.github.io/Walking-Pi/#x=292/291&w=hexSphereGrid&d=10000&s=32&st=5)) |
| 34 | [430/429](https://vincentbounce.github.io/Walking-Pi/#x=430/429&w=hexSphereGrid&d=10000&s=32) | 60 | `000000001001100011…` | 13.75 | 3,840 | 2,674 | 63.2 % | 2 ([4](https://vincentbounce.github.io/Walking-Pi/#x=430/429&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 35 | [102/97](https://vincentbounce.github.io/Walking-Pi/#x=102/97&w=hexSphereGrid&d=10000&s=32) | 48 | `000011010011001000…` | 3.00 | 4,608 | 2,661 | 43.0 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=102/97&w=hexSphereGrid&d=10000&s=32)) |
| 36 | [308/305](https://vincentbounce.github.io/Walking-Pi/#x=308/305&w=hexSphereGrid&d=10000&s=32) | 60 | `000000101000010010…` | 3.00 | 5,760 | 2,631 | 38.3 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=308/305&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 37 | [116/115](https://vincentbounce.github.io/Walking-Pi/#x=116/115&w=hexSphereGrid&d=10000&s=32) | 44 | `000000100011100111…` | 18.00 | 3,520 | 2,625 | 84.2 % | 5 ([8](https://vincentbounce.github.io/Walking-Pi/#x=116/115&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 38 | [166/165](https://vincentbounce.github.io/Walking-Pi/#x=166/165&w=hexSphereGrid&d=10000&s=32) | 20 | `00000001100011010011` | 9.64 | 3,200 | 2,585 | 90.4 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=166/165&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 39 | [78/77](https://vincentbounce.github.io/Walking-Pi/#x=78/77&w=hexSphereGrid&d=10000&s=32) | 30 | `000000110101001100…` | 9.00 | 4,800 | 2,525 | 84.2 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=78/77&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 40 | [290/287](https://vincentbounce.github.io/Walking-Pi/#x=290/287&w=hexSphereGrid&d=10000&s=32) | 60 | `000000101010110100…` | 10.39 | 4,800 | 2,400 | 34.4 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=290/287&w=hexSphereGrid&d=10000&s=32)) |
| 41 | [424/397](https://vincentbounce.github.io/Walking-Pi/#x=424/397&w=hexSphereGrid&d=10000&s=32) | 44 | `000100010110100100…` | 3.00 | 4,224 | 2,400 | 37.3 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=424/397&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 42 | [498/493](https://vincentbounce.github.io/Walking-Pi/#x=498/493&w=hexSphereGrid&d=10000&s=32) | 56 | `000000101001100010…` | 13.75 | 3,584 | 2,354 | 46.6 % | 2 ([4](https://vincentbounce.github.io/Walking-Pi/#x=498/493&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 43 | [498/481](https://vincentbounce.github.io/Walking-Pi/#x=498/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000010010000110000…` | 3.00 | 5,760 | 2,340 | 21.2 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=498/481&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 44 | [148/145](https://vincentbounce.github.io/Walking-Pi/#x=148/145&w=hexSphereGrid&d=10000&s=32) | 28 | `000001010100101111…` | 3.00 | 2,688 | 2,298 | 39.2 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=148/145&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 45 | [358/345](https://vincentbounce.github.io/Walking-Pi/#x=358/345&w=hexSphereGrid&d=10000&s=32) | 44 | `000010011010010101…` | 4.58 | 2,816 | 2,242 | 39.7 % | 2 ([2](https://vincentbounce.github.io/Walking-Pi/#x=358/345&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 46 | [248/247](https://vincentbounce.github.io/Walking-Pi/#x=248/247&w=hexSphereGrid&d=10000&s=32) | 36 | `000000010000100101…` | 5.20 | 5,760 | 2,195 | 30.5 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=248/247&w=hexSphereGrid&d=10000&s=32)) |
| 47 | [350/339](https://vincentbounce.github.io/Walking-Pi/#x=350/339&w=hexSphereGrid&d=10000&s=32) | 28 | `000010000100111010…` | 7.55 | 2,688 | 2,172 | 57.0 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=350/339&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 48 | [496/485](https://vincentbounce.github.io/Walking-Pi/#x=496/485&w=hexSphereGrid&d=10000&s=32) | 48 | `000001011100111001…` | 13.75 | 3,072 | 2,170 | 46.6 % | 2 ([4](https://vincentbounce.github.io/Walking-Pi/#x=496/485&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 49 | [406/387](https://vincentbounce.github.io/Walking-Pi/#x=406/387&w=hexSphereGrid&d=10000&s=32) | 42 | `000011001001000110…` | 1.73 | 6,720 | 2,160 | 28.9 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=406/387&w=hexSphereGrid&d=10000&s=32)) |
| 50 | [338/327](https://vincentbounce.github.io/Walking-Pi/#x=338/327&w=hexSphereGrid&d=10000&s=32) | 36 | `000010001001110010…` | 13.08 | 2,304 | 2,134 | 74.3 % | 2 ([3](https://vincentbounce.github.io/Walking-Pi/#x=338/327&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 51 | [490/481](https://vincentbounce.github.io/Walking-Pi/#x=490/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000001001100101000…` | 3.00 | 3,456 | 2,112 | 44.8 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=490/481&w=hexSphereGrid&d=10000&s=32)) |
| 52 | [284/279](https://vincentbounce.github.io/Walking-Pi/#x=284/279&w=hexSphereGrid&d=10000&s=32) | 30 | `000001001001011001…` | 6.24 | 2,880 | 2,046 | 54.2 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=284/279&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 53 | [466/453](https://vincentbounce.github.io/Walking-Pi/#x=466/453&w=hexSphereGrid&d=10000&s=32) | 30 | `000001110101100010…` | 15.59 | 2,880 | 2,037 | 51.3 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=466/453&w=hexSphereGrid&d=10000&s=32)) |
| 54 | [186/185](https://vincentbounce.github.io/Walking-Pi/#x=186/185&w=hexSphereGrid&d=10000&s=32) | 36 | `000000010110001000…` | 3.00 | 3,456 | 1,920 | 43.0 % | 3 ([1](https://vincentbounce.github.io/Walking-Pi/#x=186/185&w=hexSphereGrid&d=10000&s=32)) |
| 55 | [116/113](https://vincentbounce.github.io/Walking-Pi/#x=116/113&w=hexSphereGrid&d=10000&s=32) | 28 | `000001101100101111…` | 3.00 | 2,688 | 1,911 | 38.3 % | 3 ([6](https://vincentbounce.github.io/Walking-Pi/#x=116/113&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 56 | [160/157](https://vincentbounce.github.io/Walking-Pi/#x=160/157&w=hexSphereGrid&d=10000&s=32) | 52 | `000001001110010001…` | 6.00 | 2,496 | 1,911 | 39.2 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=160/157&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 57 | [272/265](https://vincentbounce.github.io/Walking-Pi/#x=272/265&w=hexSphereGrid&d=10000&s=32) | 52 | `000001101100001100…` | 3.00 | 4,992 | 1,869 | 36.4 % | 3 ([8](https://vincentbounce.github.io/Walking-Pi/#x=272/265&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 58 | [340/339](https://vincentbounce.github.io/Walking-Pi/#x=340/339&w=hexSphereGrid&d=10000&s=32) | 28 | `000000001100000101…` | 6.24 | 2,688 | 1,857 | 54.7 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=340/339&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 59 | [260/251](https://vincentbounce.github.io/Walking-Pi/#x=260/251&w=hexSphereGrid&d=10000&s=32) | 50 | `000010010010110111…` | 5.20 | 3,200 | 1,768 | 23.5 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=260/251&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 60 | [252/251](https://vincentbounce.github.io/Walking-Pi/#x=252/251&w=hexSphereGrid&d=10000&s=32) | 50 | `000000010000010100…` | 10.39 | 2,400 | 1,764 | 24.4 % | 5 ([8](https://vincentbounce.github.io/Walking-Pi/#x=252/251&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 61 | [142/141](https://vincentbounce.github.io/Walking-Pi/#x=142/141&w=hexSphereGrid&d=10000&s=32) | 46 | `000000011101000011…` | 12.12 | 2,944 | 1,736 | 43.3 % | 5 ([8](https://vincentbounce.github.io/Walking-Pi/#x=142/141&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 62 | [356/351](https://vincentbounce.github.io/Walking-Pi/#x=356/351&w=hexSphereGrid&d=10000&s=32) | 36 | `000000111010010110…` | 4.58 | 2,304 | 1,722 | 45.3 % | 2 ([4](https://vincentbounce.github.io/Walking-Pi/#x=356/351&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 63 | [398/397](https://vincentbounce.github.io/Walking-Pi/#x=398/397&w=hexSphereGrid&d=10000&s=32) | 44 | `000000001010010100…` | 6.00 | 2,112 | 1,716 | 37.3 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=398/397&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 64 | [394/387](https://vincentbounce.github.io/Walking-Pi/#x=394/387&w=hexSphereGrid&d=10000&s=32) | 42 | `000001001010000101…` | 3.46 | 3,360 | 1,690 | 25.8 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=394/387&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 65 | [284/265](https://vincentbounce.github.io/Walking-Pi/#x=284/265&w=hexSphereGrid&d=10000&s=32) | 52 | `000100100101101011…` | 12.00 | 2,080 | 1,675 | 22.2 % | 5 ([8](https://vincentbounce.github.io/Walking-Pi/#x=284/265&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 66 | [260/259](https://vincentbounce.github.io/Walking-Pi/#x=260/259&w=hexSphereGrid&d=10000&s=32) | 36 | `000000001111110100…` | 10.39 | 2,880 | 1,655 | 50.1 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=260/259&w=hexSphereGrid&d=10000&s=32)) |
| 67 | [334/331](https://vincentbounce.github.io/Walking-Pi/#x=334/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000000100101000111…` | 5.20 | 4,800 | 1,600 | 32.0 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=334/331&w=hexSphereGrid&d=10000&s=32)) |
| 68 | [28/27](https://vincentbounce.github.io/Walking-Pi/#x=28/27&w=hexSphereGrid&d=10000&s=32) | 18 | `000010010111101101` | 1.73 | 2,880 | 1,555 | 27.3 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=28/27&w=hexSphereGrid&d=10000&s=32)) |
| 69 | [146/145](https://vincentbounce.github.io/Walking-Pi/#x=146/145&w=hexSphereGrid&d=10000&s=32) | 28 | `000000011100001111…` | 3.00 | 2,688 | 1,536 | 41.1 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=146/145&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 70 | [302/301](https://vincentbounce.github.io/Walking-Pi/#x=302/301&w=hexSphereGrid&d=10000&s=32) | 42 | `000000001101100110…` | 6.00 | 2,016 | 1,536 | 43.4 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=302/301&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 71 | [486/481](https://vincentbounce.github.io/Walking-Pi/#x=486/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000000101010100100…` | 6.00 | 1,728 | 1,536 | 41.1 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=486/481&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 72 | [42/41](https://vincentbounce.github.io/Walking-Pi/#x=42/41&w=hexSphereGrid&d=10000&s=32) | 20 | `00000110001111100111` | 3.00 | 1,920 | 1,530 | 37.3 % | 3 ([8](https://vincentbounce.github.io/Walking-Pi/#x=42/41&w=hexSphereGrid&d=10000&s=32&st=8)) |
| 73 | [492/481](https://vincentbounce.github.io/Walking-Pi/#x=492/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000001011101101010…` | 3.00 | 3,456 | 1,530 | 39.2 % | 3 ([3](https://vincentbounce.github.io/Walking-Pi/#x=492/481&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 74 | [404/397](https://vincentbounce.github.io/Walking-Pi/#x=404/397&w=hexSphereGrid&d=10000&s=32) | 44 | `000001001000001110…` | 3.00 | 4,224 | 1,515 | 36.4 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=404/397&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 75 | [466/465](https://vincentbounce.github.io/Walking-Pi/#x=466/465&w=hexSphereGrid&d=10000&s=32) | 20 | `00000000100011001111` | 6.24 | 1,920 | 1,509 | 55.7 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=466/465&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 76 | [216/205](https://vincentbounce.github.io/Walking-Pi/#x=216/205&w=hexSphereGrid&d=10000&s=32) | 20 | `00001101101111001001` | 3.00 | 1,920 | 1,506 | 36.4 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=216/205&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 77 | [252/241](https://vincentbounce.github.io/Walking-Pi/#x=252/241&w=hexSphereGrid&d=10000&s=32) | 24 | `000010111010111101…` | 3.00 | 2,304 | 1,506 | 36.4 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=252/241&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 78 | [344/333](https://vincentbounce.github.io/Walking-Pi/#x=344/333&w=hexSphereGrid&d=10000&s=32) | 36 | `000010000111010011…` | 15.87 | 1,728 | 1,461 | 52.3 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=344/333&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 79 | [452/441](https://vincentbounce.github.io/Walking-Pi/#x=452/441&w=hexSphereGrid&d=10000&s=32) | 42 | `000001100110001010…` | 3.46 | 3,360 | 1,405 | 26.6 % | 5 ([5](https://vincentbounce.github.io/Walking-Pi/#x=452/441&w=hexSphereGrid&d=10000&s=32&st=5)) |
| 80 | [100/99](https://vincentbounce.github.io/Walking-Pi/#x=100/99&w=hexSphereGrid&d=10000&s=32) | 30 | `000000101001010111…` | 12.12 | 1,920 | 1,394 | 43.1 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=100/99&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 81 | [178/177](https://vincentbounce.github.io/Walking-Pi/#x=178/177&w=hexSphereGrid&d=10000&s=32) | 58 | `000000010111001001…` | 6.93 | 2,320 | 1,360 | 29.7 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=178/177&w=hexSphereGrid&d=10000&s=32)) |
| 82 | [328/325](https://vincentbounce.github.io/Walking-Pi/#x=328/325&w=hexSphereGrid&d=10000&s=32) | 60 | `000000100101110011…` | 12.00 | 1,440 | 1,344 | 36.2 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=328/325&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 83 | [314/305](https://vincentbounce.github.io/Walking-Pi/#x=314/305&w=hexSphereGrid&d=10000&s=32) | 60 | `000001111000110111…` | 12.00 | 1,440 | 1,338 | 34.3 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=314/305&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 84 | [112/109](https://vincentbounce.github.io/Walking-Pi/#x=112/109&w=hexSphereGrid&d=10000&s=32) | 36 | `000001110000101110…` | 6.00 | 1,728 | 1,335 | 36.4 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=112/109&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 85 | [280/267](https://vincentbounce.github.io/Walking-Pi/#x=280/267&w=hexSphereGrid&d=10000&s=32) | 22 | `000011000111011011…` | 4.58 | 1,408 | 1,272 | 38.5 % | 2 ([2](https://vincentbounce.github.io/Walking-Pi/#x=280/267&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 86 | [236/231](https://vincentbounce.github.io/Walking-Pi/#x=236/231&w=hexSphereGrid&d=10000&s=32) | 30 | `000001011000101010…` | 6.00 | 1,440 | 1,248 | 40.6 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=236/231&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 87 | [38/37](https://vincentbounce.github.io/Walking-Pi/#x=38/37&w=hexSphereGrid&d=10000&s=32) | 36 | `000001101110101100…` | 6.00 | 1,728 | 1,242 | 38.3 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=38/37&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 88 | [454/451](https://vincentbounce.github.io/Walking-Pi/#x=454/451&w=hexSphereGrid&d=10000&s=32) | 20 | `00000001101100111111` | 5.20 | 1,920 | 1,218 | 22.8 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=454/451&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 89 | [222/215](https://vincentbounce.github.io/Walking-Pi/#x=222/215&w=hexSphereGrid&d=10000&s=32) | 28 | `000010000101010110…` | 3.00 | 2,688 | 1,164 | 37.3 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=222/215&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 90 | [98/97](https://vincentbounce.github.io/Walking-Pi/#x=98/97&w=hexSphereGrid&d=10000&s=32) | 48 | `000000101010001110…` | 9.00 | 1,536 | 1,152 | 40.8 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=98/97&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 91 | [242/241](https://vincentbounce.github.io/Walking-Pi/#x=242/241&w=hexSphereGrid&d=10000&s=32) | 24 | `000000010000111111…` | 3.00 | 2,304 | 1,152 | 39.2 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=242/241&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 92 | [260/257](https://vincentbounce.github.io/Walking-Pi/#x=260/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0000001011111101` | 3.00 | 1,536 | 1,146 | 36.4 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=260/257&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 93 | [208/205](https://vincentbounce.github.io/Walking-Pi/#x=208/205&w=hexSphereGrid&d=10000&s=32) | 20 | `00000011101111110001` | 3.00 | 1,920 | 1,140 | 36.4 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=208/205&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 94 | [266/257](https://vincentbounce.github.io/Walking-Pi/#x=266/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0000100011110111` | 3.00 | 1,536 | 1,140 | 36.4 % | 3 ([7](https://vincentbounce.github.io/Walking-Pi/#x=266/257&w=hexSphereGrid&d=10000&s=32&st=7)) |
| 95 | [400/397](https://vincentbounce.github.io/Walking-Pi/#x=400/397&w=hexSphereGrid&d=10000&s=32) | 44 | `000000011110111100…` | 6.00 | 2,112 | 1,137 | 35.9 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=400/397&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 96 | [482/481](https://vincentbounce.github.io/Walking-Pi/#x=482/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000000001000100000…` | 3.00 | 3,456 | 1,134 | 36.4 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=482/481&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 97 | [172/171](https://vincentbounce.github.io/Walking-Pi/#x=172/171&w=hexSphereGrid&d=10000&s=32) | 18 | `000000010111111101` | 5.20 | 1,728 | 1,125 | 21.6 % | 5 ([7](https://vincentbounce.github.io/Walking-Pi/#x=172/171&w=hexSphereGrid&d=10000&s=32&st=7)) |
| 98 | [332/331](https://vincentbounce.github.io/Walking-Pi/#x=332/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000000001100010111…` | 10.39 | 2,400 | 1,120 | 28.1 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=332/331&w=hexSphereGrid&d=10000&s=32)) |
| 99 | [70/69](https://vincentbounce.github.io/Walking-Pi/#x=70/69&w=hexSphereGrid&d=10000&s=32) | 22 | `000000111011010111…` | 4.58 | 1,408 | 1,084 | 42.8 % | 2 ([2](https://vincentbounce.github.io/Walking-Pi/#x=70/69&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 100 | [244/241](https://vincentbounce.github.io/Walking-Pi/#x=244/241&w=hexSphereGrid&d=10000&s=32) | 24 | `000000110010111111…` | 6.00 | 1,152 | 960 | 37.3 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=244/241&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 101 | [464/451](https://vincentbounce.github.io/Walking-Pi/#x=464/451&w=hexSphereGrid&d=10000&s=32) | 20 | `00000111011000010001` | 3.00 | 1,920 | 957 | 37.3 % | 3 ([2](https://vincentbounce.github.io/Walking-Pi/#x=464/451&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 102 | [464/455](https://vincentbounce.github.io/Walking-Pi/#x=464/455&w=hexSphereGrid&d=10000&s=32) | 12 | `000001010001` | 3.00 | 1,152 | 948 | 35.5 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=464/455&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 103 | [382/381](https://vincentbounce.github.io/Walking-Pi/#x=382/381&w=hexSphereGrid&d=10000&s=32) | 14 | `00000000101011` | 6.24 | 1,344 | 942 | 55.2 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=382/381&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 104 | [34/33](https://vincentbounce.github.io/Walking-Pi/#x=34/33&w=hexSphereGrid&d=10000&s=32) | 10 | `0000011111` | 1.73 | 1,600 | 940 | 25.8 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=34/33&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 105 | [60/59](https://vincentbounce.github.io/Walking-Pi/#x=60/59&w=hexSphereGrid&d=10000&s=32) | 58 | `000001000101011011…` | 20.78 | 928 | 864 | 40.2 % | 2 ([1](https://vincentbounce.github.io/Walking-Pi/#x=60/59&w=hexSphereGrid&d=10000&s=32)) |
| 106 | [196/195](https://vincentbounce.github.io/Walking-Pi/#x=196/195&w=hexSphereGrid&d=10000&s=32) | 12 | `000000010101` | 5.20 | 1,152 | 849 | 20.9 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=196/195&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 107 | [486/485](https://vincentbounce.github.io/Walking-Pi/#x=486/485&w=hexSphereGrid&d=10000&s=32) | 48 | `000000001000011100…` | 12.00 | 1,152 | 846 | 35.7 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=486/485&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 108 | [88/87](https://vincentbounce.github.io/Walking-Pi/#x=88/87&w=hexSphereGrid&d=10000&s=32) | 28 | `000000101111000101…` | 9.17 | 896 | 832 | 41.6 % | 2 ([1](https://vincentbounce.github.io/Walking-Pi/#x=88/87&w=hexSphereGrid&d=10000&s=32)) |
| 109 | [476/465](https://vincentbounce.github.io/Walking-Pi/#x=476/465&w=hexSphereGrid&d=10000&s=32) | 20 | `00000110000011100101` | 4.58 | 1,280 | 832 | 41.6 % | 2 ([4](https://vincentbounce.github.io/Walking-Pi/#x=476/465&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 110 | [472/471](https://vincentbounce.github.io/Walking-Pi/#x=472/471&w=hexSphereGrid&d=10000&s=32) | 52 | `000000001000101100…` | 6.93 | 1,248 | 804 | 6.8 % | 5 ([6](https://vincentbounce.github.io/Walking-Pi/#x=472/471&w=hexSphereGrid&d=10000&s=32&st=6)) |
| 111 | [118/117](https://vincentbounce.github.io/Walking-Pi/#x=118/117&w=hexSphereGrid&d=10000&s=32) | 12 | `000000100011` | 3.46 | 960 | 800 | 26.6 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=118/117&w=hexSphereGrid&d=10000&s=32)) |
| 112 | [434/429](https://vincentbounce.github.io/Walking-Pi/#x=434/429&w=hexSphereGrid&d=10000&s=32) | 60 | `000000101111101111…` | 18.00 | 960 | 800 | 40.9 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=434/429&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 113 | [110/109](https://vincentbounce.github.io/Walking-Pi/#x=110/109&w=hexSphereGrid&d=10000&s=32) | 36 | `000000100101100100…` | 12.00 | 864 | 768 | 39.9 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=110/109&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 114 | [258/257](https://vincentbounce.github.io/Walking-Pi/#x=258/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0000000011111111` | 3.00 | 1,536 | 768 | 37.3 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=258/257&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 115 | [344/341](https://vincentbounce.github.io/Walking-Pi/#x=344/341&w=hexSphereGrid&d=10000&s=32) | 10 | `0000001001` | 3.00 | 960 | 762 | 35.5 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=344/341&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 116 | [392/387](https://vincentbounce.github.io/Walking-Pi/#x=392/387&w=hexSphereGrid&d=10000&s=32) | 42 | `000000110100111010…` | 13.86 | 840 | 760 | 25.2 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=392/387&w=hexSphereGrid&d=10000&s=32)) |
| 117 | [398/387](https://vincentbounce.github.io/Walking-Pi/#x=398/387&w=hexSphereGrid&d=10000&s=32) | 42 | `000001110100011011…` | 13.86 | 840 | 760 | 28.3 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=398/387&w=hexSphereGrid&d=10000&s=32)) |
| 118 | [82/81](https://vincentbounce.github.io/Walking-Pi/#x=82/81&w=hexSphereGrid&d=10000&s=32) | 54 | `000000110010100100…` | 3.46 | 2,592 | 729 | 5.6 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=82/81&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 119 | [484/481](https://vincentbounce.github.io/Walking-Pi/#x=484/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000000011001100010…` | 12.00 | 864 | 720 | 39.0 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=484/481&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 120 | [206/205](https://vincentbounce.github.io/Walking-Pi/#x=206/205&w=hexSphereGrid&d=10000&s=32) | 20 | `00000001001111111011` | 6.00 | 960 | 672 | 37.3 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=206/205&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 121 | [442/435](https://vincentbounce.github.io/Walking-Pi/#x=442/435&w=hexSphereGrid&d=10000&s=32) | 28 | `000001000001111010…` | 9.17 | 896 | 608 | 41.3 % | 2 ([1](https://vincentbounce.github.io/Walking-Pi/#x=442/435&w=hexSphereGrid&d=10000&s=32)) |
| 122 | [342/341](https://vincentbounce.github.io/Walking-Pi/#x=342/341&w=hexSphereGrid&d=10000&s=32) | 10 | `0000000011` | 3.00 | 960 | 576 | 36.4 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=342/341&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 123 | [130/129](https://vincentbounce.github.io/Walking-Pi/#x=130/129&w=hexSphereGrid&d=10000&s=32) | 14 | `00000001111111` | 1.73 | 1,344 | 573 | 6.4 % | 5 ([7](https://vincentbounce.github.io/Walking-Pi/#x=130/129&w=hexSphereGrid&d=10000&s=32&st=7)) |
| 124 | [104/99](https://vincentbounce.github.io/Walking-Pi/#x=104/99&w=hexSphereGrid&d=10000&s=32) | 30 | `000011001110110111…` | 1.73 | 1,920 | 556 | 2.3 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=104/99&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 125 | [316/315](https://vincentbounce.github.io/Walking-Pi/#x=316/315&w=hexSphereGrid&d=10000&s=32) | 12 | `000000001101` | 4.58 | 768 | 512 | 40.9 % | 2 ([1](https://vincentbounce.github.io/Walking-Pi/#x=316/315&w=hexSphereGrid&d=10000&s=32)) |
| 126 | [220/219](https://vincentbounce.github.io/Walking-Pi/#x=220/219&w=hexSphereGrid&d=10000&s=32) | 18 | `000000010010101101` | 9.00 | 576 | 480 | 36.4 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=220/219&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 127 | [256/255](https://vincentbounce.github.io/Walking-Pi/#x=256/255&w=hexSphereGrid&d=10000&s=32) | 8 | `00000001` | 1.73 | 768 | 378 | 5.5 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=256/255&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 128 | [400/387](https://vincentbounce.github.io/Walking-Pi/#x=400/387&w=hexSphereGrid&d=10000&s=32) | 42 | `000010001001100101…` | 13.86 | 504 | 375 | 4.3 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=400/387&w=hexSphereGrid&d=10000&s=32&st=3)) |

### In place (19)

| # | Number | Period | Word | — | Round | Corners | Area | Symmetry (start) |
|--:|---|--:|---|--:|--:|--:|--:|--:|
| 1 | [66/65](https://vincentbounce.github.io/Walking-Pi/#x=66/65&w=hexSphereGrid&d=10000&s=32) | 12 | `000000111111` | 0 | 12 | 10 | 0.0 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=66/65&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 2 | [44/43](https://vincentbounce.github.io/Walking-Pi/#x=44/43&w=hexSphereGrid&d=10000&s=32) | 14 | `00000101111101` | 0 | 14 | 12 | 0.0 % | 5 ([3](https://vincentbounce.github.io/Walking-Pi/#x=44/43&w=hexSphereGrid&d=10000&s=32&st=3)) |
| 3 | [262/257](https://vincentbounce.github.io/Walking-Pi/#x=262/257&w=hexSphereGrid&d=10000&s=32) | 16 | `0000010011111011` | 0 | 16 | 13 | 0.0 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=262/257&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 4 | [58/57](https://vincentbounce.github.io/Walking-Pi/#x=58/57&w=hexSphereGrid&d=10000&s=32) | 18 | `000001000111110111` | 0 | 18 | 14 | 0.0 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=58/57&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 5 | [212/205](https://vincentbounce.github.io/Walking-Pi/#x=212/205&w=hexSphereGrid&d=10000&s=32) | 20 | `00001000101111011101` | 0 | 100 | 35 | 0.1 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=212/205&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 6 | [246/241](https://vincentbounce.github.io/Walking-Pi/#x=246/241&w=hexSphereGrid&d=10000&s=32) | 24 | `000001010100111110…` | 0 | 24 | 17 | 0.0 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=246/241&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 7 | [248/241](https://vincentbounce.github.io/Walking-Pi/#x=248/241&w=hexSphereGrid&d=10000&s=32) | 24 | `000001110110111110…` | 0 | 24 | 15 | 0.0 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=248/241&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 8 | [30/29](https://vincentbounce.github.io/Walking-Pi/#x=30/29&w=hexSphereGrid&d=10000&s=32) | 28 | `000010001101001111…` | 0 | 140 | 75 | 0.2 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=30/29&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 9 | [114/113](https://vincentbounce.github.io/Walking-Pi/#x=114/113&w=hexSphereGrid&d=10000&s=32) | 28 | `000000100100001111…` | 0 | 28 | 19 | 0.0 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=114/113&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 10 | [152/145](https://vincentbounce.github.io/Walking-Pi/#x=152/145&w=hexSphereGrid&d=10000&s=32) | 28 | `000011000101101111…` | 0 | 140 | 65 | 0.2 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=152/145&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 11 | [336/331](https://vincentbounce.github.io/Walking-Pi/#x=336/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000000111101110111…` | 0 | 30 | 12 | 0.0 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=336/331&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 12 | [338/331](https://vincentbounce.github.io/Walking-Pi/#x=338/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000001010110100111…` | 0 | 30 | 20 | 0.0 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=338/331&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 13 | [340/331](https://vincentbounce.github.io/Walking-Pi/#x=340/331&w=hexSphereGrid&d=10000&s=32) | 30 | `000001101111010111…` | 0 | 30 | 16 | 0.0 % | 1 ([4](https://vincentbounce.github.io/Walking-Pi/#x=340/331&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 14 | [340/333](https://vincentbounce.github.io/Walking-Pi/#x=340/333&w=hexSphereGrid&d=10000&s=32) | 36 | `000001010110000110…` | 0 | 36 | 32 | 0.1 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=340/333&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 15 | [488/481](https://vincentbounce.github.io/Walking-Pi/#x=488/481&w=hexSphereGrid&d=10000&s=32) | 36 | `000000111011100110…` | 0 | 36 | 27 | 0.1 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=488/481&w=hexSphereGrid&d=10000&s=32&st=2)) |
| 16 | [402/397](https://vincentbounce.github.io/Walking-Pi/#x=402/397&w=hexSphereGrid&d=10000&s=32) | 44 | `000000110011100101…` | 0 | 44 | 33 | 0.1 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=402/397&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 17 | [406/397](https://vincentbounce.github.io/Walking-Pi/#x=406/397&w=hexSphereGrid&d=10000&s=32) | 44 | `000001011100110110…` | 0 | 44 | 31 | 0.0 % | 5 ([4](https://vincentbounce.github.io/Walking-Pi/#x=406/397&w=hexSphereGrid&d=10000&s=32&st=4)) |
| 18 | [268/265](https://vincentbounce.github.io/Walking-Pi/#x=268/265&w=hexSphereGrid&d=10000&s=32) | 52 | `000000101110010111…` | 0 | 260 | 90 | 0.3 % | 5 ([1](https://vincentbounce.github.io/Walking-Pi/#x=268/265&w=hexSphereGrid&d=10000&s=32)) |
| 19 | [306/305](https://vincentbounce.github.io/Walking-Pi/#x=306/305&w=hexSphereGrid&d=10000&s=32) | 60 | `000000001101011011…` | 0 | 60 | 37 | 0.1 % | 5 ([2](https://vincentbounce.github.io/Walking-Pi/#x=306/305&w=hexSphereGrid&d=10000&s=32&st=2)) |

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
