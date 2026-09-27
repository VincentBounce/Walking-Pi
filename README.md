# Walking π

A walk driven by the digits of **π**, other famous numbers and large primes. The walker moves on square, triangle or hexagonal tiles, through a 3D lattice, or across the surface of a cube, a polyhedron or a sphere. Each digit tells it where to go next.

**▶ Live demo: https://vincentbounce.github.io/Walking-Pi/**

π₃ = 10.0102110122220102110021111102212222201112012121212001…

## Numbers

All digits are computed exactly in the browser, in the base the walk needs, using `BigInt` arithmetic in a Web Worker. You can get up to 1,000,000 digits. The integer part is always part of the walk.

**Constants**

| Number | Method |
|---|---|
| π | Machin: 16·arctan(1/5) − 4·arctan(1/239) |
| e | Σ 1/k! |
| φ (golden ratio) | (1 + √5) / 2 |
| ln 2 | 18·artanh(1/26) − 2·artanh(1/4801) + 8·artanh(1/8749) |
| ζ(3) (Apéry's constant) | Amdeberhan–Zeilberger series |
| E (Erdős–Borwein constant) | Σ 2^(−n²)·(2ⁿ+1)/(2ⁿ−1) |
| G (Catalan's constant) | Lupaș series, by binary splitting |
| γ (Euler–Mascheroni constant) | Brent–McMillan, by binary splitting |

**Roots:** √2, √3, √5, √6, √7, √8 (integer square root, Newton) and ∛2 (integer cube root).

**Comparisons**
- **Random digits:** a new draw from the browser's cryptographic generator on each Compute.
- **Champernowne constant:** 0.1 2 3 4 … written one after another in the walk's base.
- **Fraction p/q:** any fraction you type, 22/7 by default. Its digits eventually repeat.

**Primes**
- **Mersenne primes 2ᵖ − 1:** all 41 known ones from M₁₂₇ to M₁₃₆₂₇₉₈₄₁. Note that in base 2 or 4 their digits are trivial (111…1 and 1333…3).
- **Primorial primes p# ± 1**, where p# is the product of all primes up to p. The values of p come from OEIS A005234 and A006794, up to 9,562,633# + 1.
- **Random prime:** a random probable prime of 100 to 2,000 decimal digits (sieve, then Miller–Rabin).
- **Prime constant ρ (Ulam):** digit k is 0 if k is not prime, else k mod b. In base 2 this is ρ = 0.0110101000101…
- **Prime gaps Δp:** one digit per gap between consecutive odd primes, (gap / 2) mod b.

## Walk modes

The walker starts at the origin, heading north (up). Each mode sets the base the digits are written in and the rule that turns a digit into a move. In the relative modes you never step back the way you came.

### 2D

| Mode | Base | Rule |
|---|:-:|---|
| Squares — turtle | 3 | `0` turn left + step · `1` step forward · `2` turn right + step |
| Squares — cardinal | 4 | `0` north · `1` east · `2` south · `3` west |
| Triangles — left / right | 2 | Exit the triangle through the edge on your `0` left or `1` right |
| Triangles — fixed edges | 3 | Cross the `0` horizontal · `1` “/” · `2` “\” edge |
| Hexagons — relative | 5 | `0` sharp left · `1` left · `2` straight · `3` right · `4` sharp right |
| Hexagons — fixed | 6 | `0` N · `1` NE · `2` SE · `3` S · `4` SW · `5` NW |

### 3D

| Mode | Base | Rule |
|---|:-:|---|
| Cubes — relative | 5 | `0` turn left · `1` turn up · `2` straight · `3` turn down · `4` turn right |
| Cubes — fixed | 6 | `0` north · `1` east · `2` up · `3` south · `4` west · `5` down |
| Cube surface | 3 | Squares on the faces of a cube: `0` turn left · `1` straight on · `2` turn right |
| Tetrahedron | 2 | Triangles on its 4 faces: exit through the `0` left or `1` right edge |
| Octahedron | 2 | Triangles on its 8 faces: exit through the `0` left or `1` right edge |
| Icosahedron | 2 | Triangles on its 20 faces: exit through the `0` left or `1` right edge |
| Geodesic sphere | 2 | Subdivided icosahedron pushed onto a sphere: exit through the `0` left or `1` right edge |

On the surfaces (cube, polyhedra and sphere) the walk keeps coming back to the same tiles, so each tile is coloured by its number of visits, on a log scale. The stats show the coverage and the step at which every tile has been visited. You can choose the number of tiles, from a few hundred to about 130,000.

### Experimental

| Mode | Base | Rule |
|---|:-:|---|
| Binary spiral — squares | 2 | Follow the Ulam square spiral; `1` draw the step, `0` move without drawing |
| Binary spiral — triangles | 2 | Same, along a spiral of triangles |
| Binary spiral — hexagons | 2 | Same, along a spiral of hexagons |
| Ulam spiral jumps | 10 or 64 | Jump ahead digit + 1 cells along the Ulam spiral and mark the landing cell |
| Ulam spiral search | 10 or 64 | Mark cell n when the digits of n appear somewhere in the number's digits |

With the prime constant ρ, the square binary spiral draws the classic Ulam spiral of the primes. The search mode shows where a number stops containing every sequence of digits: all short numbers are found, then the coverage drops at each new digit length.

## Features

- **Animation** from a few steps to 600,000 steps per second, with step-by-step and jump-to-end.
- **Navigation:** zoom with the mouse wheel, pan by dragging, and auto-fit.
- **3D view:** perspective (can be turned off), drag to rotate, Shift+drag to pan, optional auto-rotate. Rotation is around the centre of the scene.
- **Surfaces:** in auto-fit, the camera turns to keep the walker in the middle, and a small arrow lying on the surface shows its heading.
- **Colours:** gradient along the walk, by digit, or monochrome.
- **Grids:** squares, triangles and hexagons in 2D, and a bounding box with axes in 3D.
- **Stats:** position, distance from the start, max distance, distinct cells visited and digit counts.

Keyboard: `Space` play/pause · `→` one step · `R` restart · `E` jump to end · `F` fit view

## Run locally

There are no dependencies and no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Files

- `index.html` — page layout
- `style.css` — styles
- `main.js` — digit computation (Web Worker), walk modes, meshes and canvas rendering
