# Walking π

A walk driven by the digits of **π** and other famous constants: on square, triangle or hexagonal tiles, or in 3D. Each digit, written in base 2 to 6, tells the walker where to go next.

**▶ Live demo: https://vincentbounce.github.io/Walking-Pi/**

π₃ = 10.0102110122220102110021111102212222201112012121212001…

## Numbers

π, e, φ (golden ratio), √2, √3, √5, ln 2, ζ(3) (Apéry's constant) and E (Erdős–Borwein constant).

The digits are computed exactly in the browser, in any base, using `BigInt` arithmetic in a Web Worker. You can get up to 1,000,000 digits.

| Constant | Method |
|---|---|
| π | Machin: 16·arctan(1/5) − 4·arctan(1/239) |
| e | Σ 1/k! |
| φ, √2, √3, √5 | Integer square root (Newton) |
| ln 2 | 18·artanh(1/26) − 2·artanh(1/4801) + 8·artanh(1/8749) |
| ζ(3) | Amdeberhan–Zeilberger series |
| E | Σ 2^(−n²)·(2ⁿ+1)/(2ⁿ−1) |

## Walk modes

The walker starts at the origin, heading north (up). The mode sets both the base the digits are written in and the rule that turns each digit into a move.

| Mode | Base | Rule |
|---|:-:|---|
| Squares — turtle | 3 | `0` turn left + step · `1` step forward · `2` turn right + step |
| Squares — cardinal | 4 | `0` north · `1` east · `2` south · `3` west |
| Triangles — left / right | 2 | Exit the triangle through the edge on your `0` left or `1` right |
| Triangles — fixed edges | 3 | Cross the `0` horizontal · `1` “/” · `2` “\” edge |
| Hexagons — relative | 5 | `0` sharp left · `1` left · `2` straight · `3` right · `4` sharp right |
| Hexagons — fixed | 6 | `0` N · `1` NE · `2` SE · `3` S · `4` SW · `5` NW |
| 3D cubes — relative | 5 | `0` turn left · `1` turn up · `2` straight · `3` turn down · `4` turn right |
| 3D cubes — fixed | 6 | `0` north · `1` east · `2` up · `3` south · `4` west · `5` down |

In the relative modes you can never step back the way you came.

## Features

- Adjustable animation from a few steps to 600,000 steps per second, with step-by-step and jump-to-end
- Zoom with the mouse wheel, pan by dragging, and auto-fit
- 3D view: drag to rotate, Shift+drag to pan, with optional auto-rotate
- Colors: gradient along the walk, by digit, or monochrome
- Square, triangle and hexagon grids; a bounding box and axes in 3D
- Stats: position, distance from the origin, max distance, distinct cells visited, and digit counts
- Option to include the integer part of the number in the walk

Keyboard: `Space` play/pause · `→` one step · `R` restart · `E` jump to end · `F` fit view

## Run locally

There are no dependencies and no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Files

- `index.html` — page layout
- `style.css` — styles
- `main.js` — digit computation (Web Worker), walk modes and canvas rendering
