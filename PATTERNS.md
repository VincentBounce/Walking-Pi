# Regular patterns of fractions

An irrational number like π walks at random. A fraction's digits repeat: after a few digits (its integer part, and a few more when its denominator shares a factor with the base), the same word of digits, its **period**, comes back again and again, and each round of it makes the same moves again. The walks then draw regular patterns, and many of them close: they come back to where they started, heading the same way, with the same digits ahead. Walking Pi sees it and stops after a few rounds of it (`… digits max ↻` under the digits; one round on a surface), or, when each round goes further on for ever (`→`), as far as what it drew before is wide.

This file lists the most striking ones found so far, by walk, each opening the live page. The **Gallery** tab of the app holds a curated choice of them.

- [🌸 2D walks: rosettes](#-2d-walks-rosettes)
- [🐜 Langton's ant by the digits: late highways](#-langtons-ant-by-the-digits-late-highways)
- [🌐 Walks on surfaces](#-walks-on-surfaces)
- [💠 Along the grid of the sphere of hexagons](#-along-the-grid-of-the-sphere-of-hexagons)

<br>

<p align="center">⁂</p>

<br>

## 🌸 2D walks: rosettes

On a walk that turns relative to its heading (a turtle), what counts is the period's total turn. When it is not a whole turn, each round of the period starts turned by the same angle, and after 4 rounds (on squares), 3 or 6 (on triangles and hexagons) the walk is back where it started, heading the same way: a **rosette** with that many-fold symmetry. When the total turn is 0, each round shifts the walk by the same step and it never closes: a frieze.

The tables list every fraction p/q below 1 with q ≤ 999, one per denominator, ranked for big rosettes drawn with few overlaps (**new edges**: the share of steps that draw an edge for the first time). **Steps**: the rosette's length. The walks on cells of the same tab draw the same rosettes (Squares turtle on cells takes the same steps; Triangles on cells, left / right, those of Hexagons turtle; Hexagons on cells, 5 relative turns, those of Triangles turtle).

### Squares turtle (base 3, left / forward / right)

| # | Number | Symmetry | Steps | New edges |
|--:|---|--:|--:|--:|
| 1 | [1/983](https://vincentbounce.github.io/Walking-Pi/#x=1/983&w=turtle&d=1965) | 4-fold | 1,964 | 81 % |
| 2 | [1/839](https://vincentbounce.github.io/Walking-Pi/#x=1/839&w=turtle&d=1677) | 4-fold | 1,676 | 82 % |
| 3 | [1/743](https://vincentbounce.github.io/Walking-Pi/#x=1/743&w=turtle&d=1485) | 4-fold | 1,484 | 81 % |
| 4 | [1/829](https://vincentbounce.github.io/Walking-Pi/#x=1/829&w=turtle&d=829) | 4-fold | 828 | 88 % |
| 5 | [2/733](https://vincentbounce.github.io/Walking-Pi/#x=2/733&w=turtle&d=733) | 4-fold | 732 | 89 % |
| 6 | [5/913](https://vincentbounce.github.io/Walking-Pi/#x=5/913&w=turtle&d=821) | 4-fold | 820 | 87 % |
| 7 | [1/827](https://vincentbounce.github.io/Walking-Pi/#x=1/827&w=turtle&d=1653) | 4-fold | 1,652 | 78 % |
| 8 | [1/923](https://vincentbounce.github.io/Walking-Pi/#x=1/923&w=turtle&d=421) | 4-fold | 420 | 94 % |
| 9 | [2/541](https://vincentbounce.github.io/Walking-Pi/#x=2/541&w=turtle&d=541) | 4-fold | 540 | 90 % |
| 10 | [1/419](https://vincentbounce.github.io/Walking-Pi/#x=1/419&w=turtle&d=837) | 4-fold | 836 | 84 % |

### Hexagons turtle (base 2, left / right)

| # | Number | Symmetry | Steps | New edges |
|--:|---|--:|--:|--:|
| 1 | [1/383](https://vincentbounce.github.io/Walking-Pi/#x=1/383&w=hexTurtle&d=1147) | 6-fold | 1,146 | 90 % |
| 2 | [1/359](https://vincentbounce.github.io/Walking-Pi/#x=1/359&w=hexTurtle&d=1075) | 6-fold | 1,074 | 90 % |
| 3 | [1/991](https://vincentbounce.github.io/Walking-Pi/#x=1/991&w=hexTurtle&d=2971) | 6-fold | 2,970 | 78 % |
| 4 | [3/497](https://vincentbounce.github.io/Walking-Pi/#x=3/497&w=hexTurtle&d=631) | 6-fold | 630 | 94 % |
| 5 | [1/607](https://vincentbounce.github.io/Walking-Pi/#x=1/607&w=hexTurtle&d=1819) | 6-fold | 1,818 | 81 % |
| 6 | [1/271](https://vincentbounce.github.io/Walking-Pi/#x=1/271&w=hexTurtle&d=811) | 6-fold | 810 | 90 % |
| 7 | [23/911](https://vincentbounce.github.io/Walking-Pi/#x=23/911&w=hexTurtle&d=547) | 6-fold | 546 | 93 % |
| 8 | [1/463](https://vincentbounce.github.io/Walking-Pi/#x=1/463&w=hexTurtle&d=1387) | 6-fold | 1,386 | 81 % |
| 9 | [1/647](https://vincentbounce.github.io/Walking-Pi/#x=1/647&w=hexTurtle&d=1939) | 6-fold | 1,938 | 77 % |
| 10 | [1/943](https://vincentbounce.github.io/Walking-Pi/#x=1/943&w=hexTurtle&d=661) | 3-fold | 660 | 90 % |

### Triangles turtle (base 5, 5 relative turns)

| # | Number | Symmetry | Steps | New edges |
|--:|---|--:|--:|--:|
| 1 | [1/599](https://vincentbounce.github.io/Walking-Pi/#x=1/599&w=triTurtle&d=898) | 3-fold | 897 | 89 % |
| 2 | [1/856](https://vincentbounce.github.io/Walking-Pi/#x=1/856&w=triTurtle&d=637) | 6-fold | 636 | 92 % |
| 3 | [11/604](https://vincentbounce.github.io/Walking-Pi/#x=11/604&w=triTurtle&d=451) | 6-fold | 450 | 96 % |
| 4 | [1/892](https://vincentbounce.github.io/Walking-Pi/#x=1/892&w=triTurtle&d=667) | 3-fold | 666 | 90 % |
| 5 | [1/944](https://vincentbounce.github.io/Walking-Pi/#x=1/944&w=triTurtle&d=697) | 6-fold | 696 | 89 % |
| 6 | [1/919](https://vincentbounce.github.io/Walking-Pi/#x=1/919&w=triTurtle&d=1378) | 3-fold | 1,377 | 80 % |
| 7 | [1/867](https://vincentbounce.github.io/Walking-Pi/#x=1/867&w=triTurtle&d=817) | 3-fold | 816 | 86 % |
| 8 | [1/847](https://vincentbounce.github.io/Walking-Pi/#x=1/847&w=triTurtle&d=991) | 3-fold | 990 | 82 % |
| 9 | [1/512](https://vincentbounce.github.io/Walking-Pi/#x=1/512&w=triTurtle&d=769) | 6-fold | 768 | 85 % |
| 10 | [1/803](https://vincentbounce.github.io/Walking-Pi/#x=1/803&w=triTurtle&d=1081) | 3-fold | 1,080 | 81 % |

### Walks in fixed directions

There the period's moves add up to a fixed step: a fraction drifts away as a frieze, unless that step is 0 and the period's figure closes on itself at once. Such closed figures are rare and look like closed scribbles, with no symmetry: on Triangles, 6 fixed directions, the biggest are [1/991](https://vincentbounce.github.io/Walking-Pi/#x=1/991&w=triFixed&d=991) and [1/823](https://vincentbounce.github.io/Walking-Pi/#x=1/823&w=triFixed&d=823).

### Pivot walks: Koch's curve

On a Pivot walk, 0 steps forward and 1 turns right on the spot by one notch. Read this way, the Thue–Morse constant draws Koch's curve along the lines of a triangle grid ([τ, Triangles pivot](https://vincentbounce.github.io/Walking-Pi/#x=thuemorse&w=triPivot&d=4096)); this is a known result, not one of ours. It is still Koch's curve on the triangle sphere ([icosahedron](https://vincentbounce.github.io/Walking-Pi/#x=thuemorse&w=icosaPivotGrid&d=10000&s=32)). With quarter turns (squares) it closes into a small square at once.

The rabbit constant (the Fibonacci word) on Squares parity, where a 1 turns right at an odd digit and left at an even one, draws the Fibonacci word fractal of Monnerot-Dumaine ([F, Squares parity](https://vincentbounce.github.io/Walking-Pi/#x=rabbit&w=squareParity&d=4181)), known too. The Rudin–Shapiro sequence along the lines of a hexagon grid (Hexagons turtle, left or right) draws a branching fractal, a dragon of sorts ([RS, Hexagons turtle](https://vincentbounce.github.io/Walking-Pi/#x=rudinshapiro&w=hexTurtle&d=16384)); on the squares it only drifts along a diagonal.

<br>

<p align="center">⁂</p>

<br>

## 🐜 Langton's ant by the digits: late highways

**Ant**, beside Grid and Cells, walks a turtle's cells as [Langton's ant](https://en.wikipedia.org/wiki/Langton%27s_ant); with **Digits** each digit turns it (0 left, 1 right; L1 / R1 on the Cairo pentagons), the other way on a dark cell, which then flips. A fraction's digits repeat, yet the ant first wanders in the mess it makes, for hundreds or millions of steps, until it may slip out into fresh cells on a **highway**: the same stretch of steps for ever, each one further on (its stretch is a whole number of the digits' period). When it starts cannot be foreseen: even for Langton's own ant, no one has proved that it always builds one. A highway may also be a **bridge**: it runs across a bay of the cloud and lands back in it, and the chaos goes on.

Walking Pi finds a highway (its stretch up to 100,000 steps, repeated over 1,000 steps and 8 stretches at least, its last stretch on cells first walked on it), follows it, and stops the ant as far along it as the cloud before it is wide (8 stretches at least); one that breaks before was a bridge. The search below ran apart, with the same rules and stops: every fraction 1/q with q ≤ 1,000 and every a/q with a ≤ 99 and q ≤ 9, in base 2, up to 50 million steps, each highway then followed until it was **endless for sure** (farther from the start than anything the ant walked before it, and going away). Fractions that walk the same digits from some point on (the sevenths, or 1/q and 1/2q) often meet the same highway: they share a row. The app walks up to 50 million digits: each link shows the whole walk, up to its stop.

**Surprise** ranks how much order comes out of how little: the steps of chaos before the highway, over its stretch times the number's own digits, and more for each bridge before it, by its stretches over 8 (a bridge of 8 doubles it):

> Surprise = chaos steps ÷ (stretch × digits) × (1 + bridge stretches ÷ 8)

1/244: 6,369,167 ÷ (60 × 4) = 26,538. 1/67: 46,633,629 ÷ (462 × 3) × (1 + (57 + 14) ÷ 8) ≈ 333,000. A short number, a long chaos, a short stretch, and long bridges of short stretches make the switch from a huge cloud to a straight road the most striking. Studies of Langton's ant measure the steps before the highway (its *transient*) and the highway's period, not the seed's size nor its bridges: this ratio is Walking Pi's own.

### Squares ant

1,471 fractions: 1,289 build an endless highway, 158 none within 50 million steps, 24 unknown.

**The most surprising**:

| # | Numbers | Highway from step | Stretch | Bridges | Stops at | Surprise |
|--:|---|--:|--:|--:|--:|--:|
| 1 | [1/67](https://vincentbounce.github.io/Walking-Pi/#x=1/67&w=antSquare&d=46811499&r=digits) | 46,633,629 | 462 | 2 | 46,811,499 | 333,476 |
| 2 | [1/889](https://vincentbounce.github.io/Walking-Pi/#x=1/889&w=antSquare&d=35107844&r=digits) | 35,051,396 | 42 |  | 35,107,844 | 208,639 |
| 3 | [1/589](https://vincentbounce.github.io/Walking-Pi/#x=1/589&w=antSquare&d=38752220&r=digits) | 38,673,200 | 90 |  | 38,752,220 | 107,426 |
| 4 | [1/976](https://vincentbounce.github.io/Walking-Pi/#x=1/976&w=antSquare&d=1447309&r=digits) | 1,414,849 | 60 | 1 | 1,447,309 | 58,719 |
| 5 | [1/244](https://vincentbounce.github.io/Walking-Pi/#x=1/244&w=antSquare&d=6431687&r=digits) | 6,369,167 | 60 |  | 6,431,687 | 26,538 |
| 6 | [1/355](https://vincentbounce.github.io/Walking-Pi/#x=1/355&w=antSquare&d=31860698&r=digits) | 30,852,698 | 6,300 | 2 | 31,860,698 | 9,515 |
| 7 | [1/444](https://vincentbounce.github.io/Walking-Pi/#x=1/444&w=antSquare&d=1391606&r=digits) | 1,367,594 | 36 |  | 1,391,606 | 9,497 |
| 8 | [1/62](https://vincentbounce.github.io/Walking-Pi/#x=1/62&w=antSquare&d=3878574&r=digits) | 3,846,924 | 150 |  | 3,878,574 | 8,549 |
| 9 | [1/699](https://vincentbounce.github.io/Walking-Pi/#x=1/699&w=antSquare&d=37657820&r=digits) | 37,385,220 | 1,160 |  | 37,657,820 | 8,057 |
| 10 | [1/488](https://vincentbounce.github.io/Walking-Pi/#x=1/488&w=antSquare&d=1855218&r=digits) | 1,814,118 | 60 |  | 1,855,218 | 7,559 |
| 11 | [1/438](https://vincentbounce.github.io/Walking-Pi/#x=1/438&w=antSquare&d=540989&r=digits) | 534,473 | 18 |  | 540,989 | 7,423 |
| 12 | [1/527](https://vincentbounce.github.io/Walking-Pi/#x=1/527&w=antSquare&d=41801259&r=digits) | 41,545,659 | 1,800 |  | 41,801,259 | 5,770 |
| 13 | [1/124](https://vincentbounce.github.io/Walking-Pi/#x=1/124&w=antSquare&d=3422617&r=digits) | 3,403,567 | 150 |  | 3,422,617 | 5,673 |
| 14 | [1/695](https://vincentbounce.github.io/Walking-Pi/#x=1/695&w=antSquare&d=17465366&r=digits) | 17,387,534 | 828 |  | 17,465,366 | 5,250 |
| 15 | [1/876](https://vincentbounce.github.io/Walking-Pi/#x=1/876&w=antSquare&d=371592&r=digits) | 362,952 | 18 |  | 371,592 | 5,041 |

**The latest**:

| # | Numbers | Highway from step | Stretch | Bridges | Stops at | Surprise |
|--:|---|--:|--:|--:|--:|--:|
| 1 | [1/67](https://vincentbounce.github.io/Walking-Pi/#x=1/67&w=antSquare&d=46811499&r=digits) | 46,633,629 | 462 | 2 | 46,811,499 | 333,476 |
| 2 | [61/7](https://vincentbounce.github.io/Walking-Pi/#x=61/7&w=antSquare&d=43401767&r=digits) | 42,757,367 | 16,110 |  | 43,401,767 | 885 |
| 3 | [1/527](https://vincentbounce.github.io/Walking-Pi/#x=1/527&w=antSquare&d=41801259&r=digits) | 41,545,659 | 1,800 |  | 41,801,259 | 5,770 |
| 4 | [1/49](https://vincentbounce.github.io/Walking-Pi/#x=1/49&w=antSquare&d=41720282&r=digits) | 41,279,786 | 7,728 |  | 41,720,282 | 1,781 |
| 5 | [1/589](https://vincentbounce.github.io/Walking-Pi/#x=1/589&w=antSquare&d=38752220&r=digits) | 38,673,200 | 90 |  | 38,752,220 | 107,426 |
| 6 | [1/699](https://vincentbounce.github.io/Walking-Pi/#x=1/699&w=antSquare&d=37657820&r=digits) | 37,385,220 | 1,160 |  | 37,657,820 | 8,057 |
| 7 | [1/889](https://vincentbounce.github.io/Walking-Pi/#x=1/889&w=antSquare&d=35107844&r=digits) | 35,051,396 | 42 |  | 35,107,844 | 208,639 |
| 8 | [1/651](https://vincentbounce.github.io/Walking-Pi/#x=1/651&w=antSquare&d=32568645&r=digits) | 32,239,185 | 9,690 |  | 32,568,645 | 832 |
| 9 | [1/355](https://vincentbounce.github.io/Walking-Pi/#x=1/355&w=antSquare&d=31860698&r=digits) | 30,852,698 | 6,300 | 2 | 31,860,698 | 9,515 |
| 10 | [1/851](https://vincentbounce.github.io/Walking-Pi/#x=1/851&w=antSquare&d=27844991&r=digits) | 26,818,559 | 85,536 |  | 27,844,991 | 78 |
| 11 | [1/784](https://vincentbounce.github.io/Walking-Pi/#x=1/784&w=antSquare&d=25798615&r=digits) | 25,389,031 | 7,728 |  | 25,798,615 | 821 |
| 12 | [1/691](https://vincentbounce.github.io/Walking-Pi/#x=1/691&w=antSquare&d=25419617&r=digits) | 24,054,797 | 31,740 |  | 25,419,617 | 189 |
| 13 | [1/660](https://vincentbounce.github.io/Walking-Pi/#x=1/660&w=antSquare&d=22332436&r=digits) | 21,676,356 | 4,720 |  | 22,332,436 | 1,148 |
| 14 | [1/224](https://vincentbounce.github.io/Walking-Pi/#x=1/224&w=antSquare&d=21289789&r=digits) | 20,677,609 | 16,110 |  | 21,289,789 | 321 |
| 15 | [1/165](https://vincentbounce.github.io/Walking-Pi/#x=1/165&w=antSquare&d=18286994&r=digits) | 17,890,514 | 4,720 |  | 18,286,994 | 948 |
| 16 | [1/417](https://vincentbounce.github.io/Walking-Pi/#x=1/417&w=antSquare&d=18153110&r=digits) | 17,570,750 | 29,118 |  | 18,153,110 | 151 |
| 17 | [1/695](https://vincentbounce.github.io/Walking-Pi/#x=1/695&w=antSquare&d=17465366&r=digits) | 17,387,534 | 828 |  | 17,465,366 | 5,250 |
| 18 | [33/7](https://vincentbounce.github.io/Walking-Pi/#x=33/7&w=antSquare&d=17342237&r=digits), [51/7](https://vincentbounce.github.io/Walking-Pi/#x=51/7&w=antSquare&d=17342237&r=digits), [66/7](https://vincentbounce.github.io/Walking-Pi/#x=66/7&w=antSquare&d=17342237&r=digits) | 16,842,827 | 16,110 |  | 17,342,237 | 348 |
| 19 | [17/7](https://vincentbounce.github.io/Walking-Pi/#x=17/7&w=antSquare&d=16618934&r=digits), [25/7](https://vincentbounce.github.io/Walking-Pi/#x=25/7&w=antSquare&d=16618934&r=digits), [34/7](https://vincentbounce.github.io/Walking-Pi/#x=34/7&w=antSquare&d=16618934&r=digits), [50/7](https://vincentbounce.github.io/Walking-Pi/#x=50/7&w=antSquare&d=16618934&r=digits), [68/7](https://vincentbounce.github.io/Walking-Pi/#x=68/7&w=antSquare&d=16618934&r=digits) | 16,264,514 | 16,110 |  | 16,618,934 | 337 |
| 20 | [29/7](https://vincentbounce.github.io/Walking-Pi/#x=29/7&w=antSquare&d=15301914&r=digits), [55/7](https://vincentbounce.github.io/Walking-Pi/#x=55/7&w=antSquare&d=15301914&r=digits), [58/7](https://vincentbounce.github.io/Walking-Pi/#x=58/7&w=antSquare&d=15301914&r=digits), [1/56](https://vincentbounce.github.io/Walking-Pi/#x=1/56&w=antSquare&d=15301914&r=digits) | 14,786,394 | 16,110 |  | 15,301,914 | 306 |
| 21 | [75/7](https://vincentbounce.github.io/Walking-Pi/#x=75/7&w=antSquare&d=14320301&r=digits), [93/7](https://vincentbounce.github.io/Walking-Pi/#x=93/7&w=antSquare&d=14320301&r=digits) | 13,885,331 | 16,110 |  | 14,320,301 | 287 |
| 22 | [83/7](https://vincentbounce.github.io/Walking-Pi/#x=83/7&w=antSquare&d=14447633&r=digits), [85/7](https://vincentbounce.github.io/Walking-Pi/#x=85/7&w=antSquare&d=14447633&r=digits) | 13,754,903 | 16,110 |  | 14,447,633 | 285 |
| 23 | [1/807](https://vincentbounce.github.io/Walking-Pi/#x=1/807&w=antSquare&d=14011299&r=digits) | 13,662,899 | 13,400 |  | 14,011,299 | 255 |
| 24 | [1/830](https://vincentbounce.github.io/Walking-Pi/#x=1/830&w=antSquare&d=13432153&r=digits) | 13,280,617 | 984 |  | 13,432,153 | 3,374 |
| 25 | [1/466](https://vincentbounce.github.io/Walking-Pi/#x=1/466&w=antSquare&d=11800143&r=digits) | 11,638,439 | 2,378 |  | 11,800,143 | 1,224 |

**Bridges** back into the cloud, 8 stretches at least (7 in 5 walks):

| Number | Bridges: from step (stretches) | Then |
|---|---|---|
| [1/67](https://vincentbounce.github.io/Walking-Pi/#x=1/67&w=antSquare&d=46811499&r=digits) | 14,905,581 (57), 40,107,483 (14) | an endless highway from step 46,633,629 |
| [1/355](https://vincentbounce.github.io/Walking-Pi/#x=1/355&w=antSquare&d=31860698&r=digits) | 1,909,717 (14), 21,523,021 (40) | an endless highway from step 30,852,698 |
| [1/610](https://vincentbounce.github.io/Walking-Pi/#x=1/610&w=antSquare&d=50000000&r=digits) | 53,912,889 (13) | chaos again, up to 60 million steps |
| [1/764](https://vincentbounce.github.io/Walking-Pi/#x=1/764&w=antSquare&d=50000000&r=digits) | 35,730,571 (17) | chaos again, up to 60 million steps |
| [1/976](https://vincentbounce.github.io/Walking-Pi/#x=1/976&w=antSquare&d=1447309&r=digits) | 1,303,699 (72) | an endless highway from step 1,414,849 |

<details><summary>No highway within 50 million steps (158)</summary>

1/11, 1/17, 1/22, 1/44, 1/87, 1/88, 1/89, 1/98, 1/103, 1/143, 1/147, 1/151, 1/161, 1/167, 1/171, 1/174, 1/176, 1/178, 1/187, 1/191, 1/199, 1/201, 1/206, 1/223, 1/243, 1/283, 1/286, 1/293, 1/294, 1/302, 1/305, 1/311, 1/315, 1/322, 1/323, 1/329, 1/334, 1/337, 1/342, 1/348, 1/351, 1/352, 1/353, 1/356, 1/359, 1/367, 1/371, 1/374, 1/382, 1/383, 1/391, 1/398, 1/402, 1/407, 1/412, 1/423, 1/426, 1/431, 1/439, 1/446, 1/453, 1/459, 1/463, 1/467, 1/483, 1/486, 1/487, 1/495, 1/497, 1/503, 1/517, 1/543, 1/544, 1/557, 1/559, 1/566, 1/571, 1/572, 1/573, 1/575, 1/579, 1/581, 1/585, 1/586, 1/588, 1/595, 1/599, 1/604, 1/607, 1/610, 1/615, 1/617, 1/622, 1/623, 1/630, 1/631, 1/639, 1/644, 1/646, 1/647, 1/657, 1/658, 1/667, 1/668, 1/674, 1/684, 1/696, 1/702, 1/703, 1/704, 1/706, 1/707, 1/712, 1/718, 1/727, 1/734, 1/742, 1/748, 1/764, 1/766, 1/779, 1/782, 1/796, 1/799, 1/804, 1/805, 1/814, 1/815, 1/819, 1/821, 1/823, 1/824, 1/827, 1/835, 1/846, 1/862, 1/867, 1/878, 1/887, 1/892, 1/906, 1/918, 1/919, 1/926, 1/934, 1/943, 1/947, 1/951, 1/966, 1/967, 1/972, 1/974, 1/975, 1/981, 1/990, 1/991, 1/994, 1/999.

</details>

<details><summary>Unknown (24): the cloud grew wider than the search's grid (16,384 cells across) first</summary>

1/101 (step 3,375,446), 1/202 (step 3,408,815), 1/213 (step 8,678,722), 1/253 (step 17,847,736), 1/303 (step 4,149,386), 1/377 (step 8,131,617), 1/404 (step 3,983,936), 1/443 (step 3,710,769), 1/475 (step 25,199,893), 1/491 (step 17,577,602), 1/506 (step 17,341,399), 1/531 (step 6,070,947), 1/606 (step 7,514,979), 1/713 (step 36,526,654), 1/754 (step 20,553,228), 1/808 (step 3,922,427), 1/829 (step 13,517,534), 1/847 (step 6,408,017), 1/852 (step 8,567,876), 1/886 (step 6,611,913), 1/911 (step 6,809,228), 1/950 (step 18,011,204), 1/982 (step 17,611,318), 1/987 (step 5,121,758).

</details>

### Cairo pentagons ant

1,471 fractions: 923 build an endless highway, 527 none within 50 million steps, 21 unknown.

**The most surprising**:

| # | Numbers | Highway from step | Stretch | Bridges | Stops at | Surprise |
|--:|---|--:|--:|--:|--:|--:|
| 1 | [1/763](https://vincentbounce.github.io/Walking-Pi/#x=1/763&w=antCairo&d=32129003&r=digits) | 32,070,035 | 72 | 1 | 32,129,003 | 788,566 |
| 2 | [1/378](https://vincentbounce.github.io/Walking-Pi/#x=1/378&w=antCairo&d=13300565&r=digits) | 13,267,805 | 72 | 1 | 13,300,565 | 359,272 |
| 3 | [1/356](https://vincentbounce.github.io/Walking-Pi/#x=1/356&w=antCairo&d=42758814&r=digits) | 42,716,629 | 55 |  | 42,758,814 | 194,166 |
| 4 | [1/624](https://vincentbounce.github.io/Walking-Pi/#x=1/624&w=antCairo&d=3009796&r=digits) | 3,000,172 | 24 |  | 3,009,796 | 31,252 |
| 5 | [1/202](https://vincentbounce.github.io/Walking-Pi/#x=1/202&w=antCairo&d=31811380&r=digits) | 31,641,880 | 300 |  | 31,811,380 | 26,368 |
| 6 | [1/457](https://vincentbounce.github.io/Walking-Pi/#x=1/457&w=antCairo&d=14701623&r=digits) | 14,548,407 | 532 | 2 | 14,701,623 | 26,258 |
| 7 | [1/925](https://vincentbounce.github.io/Walking-Pi/#x=1/925&w=antCairo&d=45981280&r=digits) | 45,588,160 | 540 |  | 45,981,280 | 21,106 |
| 8 | [1/301](https://vincentbounce.github.io/Walking-Pi/#x=1/301&w=antCairo&d=11368844&r=digits) | 11,262,668 | 672 | 1 | 11,368,844 | 12,338 |
| 9 | [1/556](https://vincentbounce.github.io/Walking-Pi/#x=1/556&w=antCairo&d=4462694&r=digits) | 4,385,690 | 138 |  | 4,462,694 | 7,945 |
| 10 | [1/914](https://vincentbounce.github.io/Walking-Pi/#x=1/914&w=antCairo&d=16423822&r=digits) | 16,301,994 | 532 |  | 16,423,822 | 7,661 |
| 11 | [1/692](https://vincentbounce.github.io/Walking-Pi/#x=1/692&w=antCairo&d=24896586&r=digits) | 24,579,246 | 860 |  | 24,896,586 | 7,145 |
| 12 | [1/153](https://vincentbounce.github.io/Walking-Pi/#x=1/153&w=antCairo&d=3436278&r=digits) | 3,426,198 | 120 |  | 3,436,278 | 7,138 |
| 13 | [1/612](https://vincentbounce.github.io/Walking-Pi/#x=1/612&w=antCairo&d=3438602&r=digits) | 3,425,402 | 120 |  | 3,438,602 | 7,136 |
| 14 | [1/346](https://vincentbounce.github.io/Walking-Pi/#x=1/346&w=antCairo&d=21518324&r=digits) | 21,188,084 | 860 |  | 21,518,324 | 6,159 |
| 15 | [1/360](https://vincentbounce.github.io/Walking-Pi/#x=1/360&w=antCairo&d=18781480&r=digits) | 18,650,152 | 768 |  | 18,781,480 | 6,071 |

**The latest**:

| # | Numbers | Highway from step | Stretch | Bridges | Stops at | Surprise |
|--:|---|--:|--:|--:|--:|--:|
| 1 | [1/925](https://vincentbounce.github.io/Walking-Pi/#x=1/925&w=antCairo&d=45981280&r=digits) | 45,588,160 | 540 |  | 45,981,280 | 21,106 |
| 2 | [1/335](https://vincentbounce.github.io/Walking-Pi/#x=1/335&w=antCairo&d=45779594&r=digits) | 45,028,778 | 3,168 |  | 45,779,594 | 3,553 |
| 3 | [1/356](https://vincentbounce.github.io/Walking-Pi/#x=1/356&w=antCairo&d=42758814&r=digits) | 42,716,629 | 55 |  | 42,758,814 | 194,166 |
| 4 | [1/763](https://vincentbounce.github.io/Walking-Pi/#x=1/763&w=antCairo&d=32129003&r=digits) | 32,070,035 | 72 | 1 | 32,129,003 | 788,566 |
| 5 | [1/202](https://vincentbounce.github.io/Walking-Pi/#x=1/202&w=antCairo&d=31811380&r=digits) | 31,641,880 | 300 |  | 31,811,380 | 26,368 |
| 6 | [1/283](https://vincentbounce.github.io/Walking-Pi/#x=1/283&w=antCairo&d=31109964&r=digits) | 30,818,564 | 2,914 |  | 31,109,964 | 2,644 |
| 7 | [1/974](https://vincentbounce.github.io/Walking-Pi/#x=1/974&w=antCairo&d=27330852&r=digits) | 26,475,735 | 12,393 |  | 27,330,852 | 534 |
| 8 | [1/692](https://vincentbounce.github.io/Walking-Pi/#x=1/692&w=antCairo&d=24896586&r=digits) | 24,579,246 | 860 |  | 24,896,586 | 7,145 |
| 9 | [1/478](https://vincentbounce.github.io/Walking-Pi/#x=1/478&w=antCairo&d=24058502&r=digits) | 23,439,464 | 6,069 | 1 | 24,058,502 | 2,308 |
| 10 | [1/777](https://vincentbounce.github.io/Walking-Pi/#x=1/777&w=antCairo&d=23268364&r=digits) | 22,976,332 | 7,488 |  | 23,268,364 | 767 |
| 11 | [1/854](https://vincentbounce.github.io/Walking-Pi/#x=1/854&w=antCairo&d=22830116&r=digits) | 22,720,916 | 1,200 |  | 22,830,116 | 4,734 |
| 12 | [1/346](https://vincentbounce.github.io/Walking-Pi/#x=1/346&w=antCairo&d=21518324&r=digits) | 21,188,084 | 860 |  | 21,518,324 | 6,159 |
| 13 | [1/360](https://vincentbounce.github.io/Walking-Pi/#x=1/360&w=antCairo&d=18781480&r=digits) | 18,650,152 | 768 |  | 18,781,480 | 6,071 |
| 14 | [1/986](https://vincentbounce.github.io/Walking-Pi/#x=1/986&w=antCairo&d=18648929&r=digits) | 18,385,897 | 3,416 |  | 18,648,929 | 1,346 |
| 15 | [1/914](https://vincentbounce.github.io/Walking-Pi/#x=1/914&w=antCairo&d=16423822&r=digits) | 16,301,994 | 532 |  | 16,423,822 | 7,661 |
| 16 | [1/978](https://vincentbounce.github.io/Walking-Pi/#x=1/978&w=antCairo&d=14793714&r=digits) | 14,713,524 | 810 |  | 14,793,714 | 4,541 |
| 17 | [1/457](https://vincentbounce.github.io/Walking-Pi/#x=1/457&w=antCairo&d=14701623&r=digits) | 14,548,407 | 532 | 2 | 14,701,623 | 26,258 |
| 18 | [1/378](https://vincentbounce.github.io/Walking-Pi/#x=1/378&w=antCairo&d=13300565&r=digits) | 13,267,805 | 72 | 1 | 13,300,565 | 359,272 |
| 19 | [1/301](https://vincentbounce.github.io/Walking-Pi/#x=1/301&w=antCairo&d=11368844&r=digits) | 11,262,668 | 672 | 1 | 11,368,844 | 12,338 |
| 20 | [1/485](https://vincentbounce.github.io/Walking-Pi/#x=1/485&w=antCairo&d=10147963&r=digits) | 10,001,419 | 3,408 |  | 10,147,963 | 734 |
| 21 | [1/602](https://vincentbounce.github.io/Walking-Pi/#x=1/602&w=antCairo&d=9854661&r=digits) | 9,713,541 | 672 |  | 9,854,661 | 3,614 |
| 22 | [1/278](https://vincentbounce.github.io/Walking-Pi/#x=1/278&w=antCairo&d=7744937&r=digits) | 7,475,009 | 22,494 |  | 7,744,937 | 83 |
| 23 | [1/45](https://vincentbounce.github.io/Walking-Pi/#x=1/45&w=antCairo&d=6290301&r=digits) | 6,218,109 | 768 |  | 6,290,301 | 2,699 |
| 24 | [1/785](https://vincentbounce.github.io/Walking-Pi/#x=1/785&w=antCairo&d=5860062&r=digits) | 5,812,586 | 572 |  | 5,860,062 | 2,540 |
| 25 | [1/453](https://vincentbounce.github.io/Walking-Pi/#x=1/453&w=antCairo&d=5848713&r=digits) | 5,328,213 | 20,820 |  | 5,848,713 | 64 |

**Bridges** back into the cloud, 8 stretches at least (9 in 7 walks):

| Number | Bridges: from step (stretches) | Then |
|---|---|---|
| [1/301](https://vincentbounce.github.io/Walking-Pi/#x=1/301&w=antCairo&d=11368844&r=digits) | 10,013,546 (16) | an endless highway from step 11,262,668 |
| [1/378](https://vincentbounce.github.io/Walking-Pi/#x=1/378&w=antCairo&d=13300565&r=digits) | 13,256,084 (54) | an endless highway from step 13,267,805 |
| [1/404](https://vincentbounce.github.io/Walking-Pi/#x=1/404&w=antCairo&d=50000000&r=digits) | 11,855,520 (22) | chaos again, up to 60 million steps |
| [1/457](https://vincentbounce.github.io/Walking-Pi/#x=1/457&w=antCairo&d=14701623&r=digits) | 3,487,885 (11), 4,000,025 (11) | an endless highway from step 14,548,407 |
| [1/478](https://vincentbounce.github.io/Walking-Pi/#x=1/478&w=antCairo&d=24058502&r=digits) | 13,488,507 (11) | an endless highway from step 23,439,464 |
| [1/763](https://vincentbounce.github.io/Walking-Pi/#x=1/763&w=antCairo&d=32129003&r=digits) | 15,328,497 (49) | an endless highway from step 32,070,035 |
| [1/831](https://vincentbounce.github.io/Walking-Pi/#x=1/831&w=antCairo&d=50000000&r=digits) | 27,508,206 (45), 43,414,681 (50) | chaos again, up to 60 million steps |

<details><summary>No highway within 50 million steps (527)</summary>

1/2, 3/2, 5/2, 7/2, 9/2, 11/2, 13/2, 15/2, 17/2, 19/2, 21/2, 23/2, 25/2, 27/2, 29/2, 31/2, 33/2, 35/2, 37/2, 39/2, 41/2, 43/2, 45/2, 47/2, 49/2, 51/2, 53/2, 55/2, 57/2, 59/2, 61/2, 63/2, 65/2, 67/2, 69/2, 71/2, 73/2, 75/2, 77/2, 79/2, 81/2, 83/2, 85/2, 87/2, 89/2, 91/2, 93/2, 95/2, 97/2, 99/2, 1/4, 3/4, 5/4, 7/4, 9/4, 11/4, 13/4, 15/4, 17/4, 19/4, 21/4, 23/4, 25/4, 27/4, 29/4, 31/4, 33/4, 35/4, 37/4, 39/4, 41/4, 43/4, 45/4, 47/4, 49/4, 51/4, 53/4, 55/4, 57/4, 59/4, 61/4, 63/4, 65/4, 67/4, 69/4, 71/4, 73/4, 75/4, 77/4, 79/4, 81/4, 83/4, 85/4, 87/4, 89/4, 91/4, 93/4, 95/4, 97/4, 99/4, 1/8, 3/8, 5/8, 7/8, 9/8, 11/8, 13/8, 15/8, 17/8, 19/8, 21/8, 23/8, 25/8, 27/8, 29/8, 31/8, 33/8, 35/8, 37/8, 39/8, 41/8, 43/8, 45/8, 47/8, 49/8, 51/8, 53/8, 55/8, 57/8, 59/8, 61/8, 63/8, 65/8, 67/8, 69/8, 71/8, 73/8, 75/8, 77/8, 79/8, 81/8, 83/8, 85/8, 87/8, 89/8, 91/8, 93/8, 95/8, 97/8, 99/8, 1/15, 1/16, 1/21, 1/23, 1/30, 1/31, 1/32, 1/35, 1/42, 1/46, 1/51, 1/55, 1/60, 1/62, 1/63, 1/64, 1/70, 1/71, 1/73, 1/75, 1/79, 1/84, 1/87, 1/89, 1/91, 1/92, 1/93, 1/99, 1/102, 1/103, 1/105, 1/110, 1/113, 1/115, 1/117, 1/119, 1/120, 1/123, 1/124, 1/126, 1/127, 1/128, 1/133, 1/140, 1/141, 1/142, 1/143, 1/146, 1/150, 1/151, 1/155, 1/158, 1/161, 1/168, 1/174, 1/178, 1/182, 1/184, 1/186, 1/187, 1/195, 1/197, 1/198, 1/204, 1/205, 1/206, 1/207, 1/210, 1/215, 1/217, 1/220, 1/225, 1/226, 1/230, 1/231, 1/234, 1/235, 1/237, 1/238, 1/240, 1/245, 1/246, 1/248, 1/249, 1/251, 1/252, 1/253, 1/254, 1/255, 1/256, 1/257, 1/261, 1/263, 1/266, 1/269, 1/273, 1/279, 1/280, 1/282, 1/284, 1/285, 1/286, 1/287, 1/291, 1/292, 1/300, 1/302, 1/303, 1/309, 1/310, 1/311, 1/313, 1/315, 1/316, 1/319, 1/322, 1/323, 1/329, 1/333, 1/336, 1/337, 1/341, 1/343, 1/345, 1/348, 1/349, 1/357, 1/359, 1/364, 1/367, 1/368, 1/369, 1/372, 1/374, 1/381, 1/383, 1/390, 1/391, 1/394, 1/395, 1/396, 1/403, 1/404, 1/407, 1/408, 1/410, 1/411, 1/412, 1/413, 1/414, 1/415, 1/417, 1/420, 1/423, 1/430, 1/431, 1/434, 1/439, 1/440, 1/443, 1/445, 1/450, 1/452, 1/455, 1/460, 1/462, 1/463, 1/465, 1/468, 1/469, 1/470, 1/471, 1/473, 1/474, 1/475, 1/476, 1/480, 1/489, 1/490, 1/492, 1/493, 1/495, 1/496, 1/498, 1/501, 1/502, 1/503, 1/504, 1/506, 1/508, 1/510, 1/511, 1/512, 1/513, 1/514, 1/517, 1/519, 1/521, 1/522, 1/526, 1/527, 1/529, 1/531, 1/532, 1/535, 1/538, 1/546, 1/547, 1/553, 1/558, 1/559, 1/560, 1/561, 1/564, 1/566, 1/568, 1/570, 1/571, 1/572, 1/574, 1/575, 1/577, 1/578, 1/582, 1/583, 1/584, 1/589, 1/600, 1/604, 1/605, 1/606, 1/607, 1/609, 1/611, 1/618, 1/620, 1/621, 1/622, 1/623, 1/626, 1/630, 1/632, 1/635, 1/638, 1/644, 1/645, 1/646, 1/653, 1/657, 1/658, 1/666, 1/667, 1/672, 1/674, 1/682, 1/686, 1/695, 1/696, 1/698, 1/699, 1/707, 1/710, 1/712, 1/714, 1/718, 1/719, 1/723, 1/728, 1/730, 1/731, 1/735, 1/736, 1/738, 1/741, 1/744, 1/747, 1/748, 1/751, 1/757, 1/759, 1/762, 1/765, 1/766, 1/771, 1/779, 1/780, 1/782, 1/788, 1/789, 1/790, 1/792, 1/793, 1/795, 1/799, 1/801, 1/806, 1/807, 1/808, 1/811, 1/814, 1/815, 1/816, 1/820, 1/822, 1/823, 1/824, 1/825, 1/826, 1/828, 1/830, 1/831, 1/833, 1/834, 1/837, 1/840, 1/843, 1/846, 1/847, 1/851, 1/855, 1/860, 1/862, 1/863, 1/868, 1/869, 1/873, 1/878, 1/880, 1/886, 1/889, 1/890, 1/893, 1/895, 1/897, 1/899, 1/900, 1/901, 1/904, 1/910, 1/920, 1/924, 1/926, 1/927, 1/930, 1/933, 1/936, 1/938, 1/940, 1/941, 1/942, 1/943, 1/945, 1/946, 1/947, 1/948, 1/950, 1/951, 1/952, 1/953, 1/954, 1/957, 1/959, 1/960, 1/969, 1/979, 1/980, 1/981, 1/983, 1/984, 1/987, 1/989, 1/990, 1/991, 1/992, 1/995, 1/996, 1/999.

</details>

<details><summary>Unknown (21): the cloud grew wider than the search's grid (16,384 cells across) first</summary>

1/167 (step 14,668,051), 1/289 (step 49,991,386), 1/299 (step 29,496,978), 1/334 (step 18,964,559), 1/355 (step 30,157,352), 1/365 (step 43,695,103), 1/477 (step 35,948,283), 1/487 (step 39,278,120), 1/509 (step 42,167,651), 1/598 (step 40,801,166), 1/613 (step 7,934,834), 1/668 (step 17,483,729), 1/670 (step 19,142,755), 1/734 (step 19,346,284), 1/857 (step 40,151,534), 1/903 (step 11,106,550), 1/905 (step 38,032,082), 1/913 (step 12,632,729), 1/919 (step 30,218,092), 1/923 (step 41,221,322), 1/931 (step 43,520,204).

</details>

### Hexagons ant, Digits L1 N R1 (base 3, with straight on)

Each base-3 digit turns the ant: 0 left, 1 straight on, 2 right, mirrored on a dark cell (left and right swap, straight on stays). 6,265 fractions (every 1/q with q ≤ 2,000, every a/q with q ≤ 120), up to 50 million steps: 3,777 build a highway (no bridge before any), 2,369 none within 50 million steps, 119 unknown (the cloud grew wider than the search's grid, 16,384 cells across, first).

**The most surprising**:

| # | Numbers | Highway from step | Stretch | Stops at | Surprise |
|--:|---|--:|--:|--:|--:|
| 1 | [1/437](https://vincentbounce.github.io/Walking-Pi/#x=1/437&w=antHex&d=14776499&r=digits%20L1%20N%20R1) | 14,721,059 | 198 | 14,776,499 | 18,587 |
| 2 | [2/77](https://vincentbounce.github.io/Walking-Pi/#x=2/77&w=antHex&d=3258490&r=digits%20L1%20N%20R1) | 3,247,810 | 60 | 3,258,490 | 18,043 |
| 3 | [75/77](https://vincentbounce.github.io/Walking-Pi/#x=75/77&w=antHex&d=3258490&r=digits%20L1%20N%20R1) | 3,247,810 | 60 | 3,258,490 | 13,533 |
| 4 | [1/468](https://vincentbounce.github.io/Walking-Pi/#x=1/468&w=antHex&d=6792440&r=digits%20L1%20N%20R1) | 6,774,548 | 126 | 6,792,440 | 13,442 |
| 5 | [1/658](https://vincentbounce.github.io/Walking-Pi/#x=1/658&w=antHex&d=6178283&r=digits%20L1%20N%20R1) | 6,135,089 | 138 | 6,178,283 | 11,114 |
| 6 | [9/52](https://vincentbounce.github.io/Walking-Pi/#x=9/52&w=antHex&d=3566290&r=digits%20L1%20N%20R1) | 3,550,792 | 126 | 3,566,290 | 9,394 |
| 7 | [1/905](https://vincentbounce.github.io/Walking-Pi/#x=1/905&w=antHex&d=18928266&r=digits%20L1%20N%20R1) | 18,841,866 | 540 | 18,928,266 | 8,723 |
| 8 | [34/77](https://vincentbounce.github.io/Walking-Pi/#x=34/77&w=antHex&d=1893405&r=digits%20L1%20N%20R1) | 1,883,205 | 60 | 1,893,405 | 7,847 |
| 9 | [43/77](https://vincentbounce.github.io/Walking-Pi/#x=43/77&w=antHex&d=1893405&r=digits%20L1%20N%20R1) | 1,883,205 | 60 | 1,893,405 | 7,847 |
| 10 | [36/77](https://vincentbounce.github.io/Walking-Pi/#x=36/77&w=antHex&d=1796785&r=digits%20L1%20N%20R1) | 1,783,105 | 60 | 1,796,785 | 7,430 |
| 11 | [41/77](https://vincentbounce.github.io/Walking-Pi/#x=41/77&w=antHex&d=1796785&r=digits%20L1%20N%20R1) | 1,783,105 | 60 | 1,796,785 | 7,430 |
| 12 | [43/52](https://vincentbounce.github.io/Walking-Pi/#x=43/52&w=antHex&d=3566290&r=digits%20L1%20N%20R1) | 3,550,792 | 126 | 3,566,290 | 7,045 |
| 13 | [1/1763](https://vincentbounce.github.io/Walking-Pi/#x=1/1763&w=antHex&d=11128820&r=digits%20L1%20N%20R1) | 11,039,444 | 336 | 11,128,820 | 6,571 |
| 14 | [1/606](https://vincentbounce.github.io/Walking-Pi/#x=1/606&w=antHex&d=2177199&r=digits%20L1%20N%20R1) | 2,148,899 | 100 | 2,177,199 | 5,372 |
| 15 | [1/1468](https://vincentbounce.github.io/Walking-Pi/#x=1/1468&w=antHex&d=3012839&r=digits%20L1%20N%20R1) | 2,997,101 | 122 | 3,012,839 | 4,913 |

**The latest**:

| # | Numbers | Highway from step | Stretch | Stops at | Surprise |
|--:|---|--:|--:|--:|--:|
| 1 | [1/1435](https://vincentbounce.github.io/Walking-Pi/#x=1/1435&w=antHex&d=29125870&r=digits%20L1%20N%20R1) | 28,816,990 | 9,360 | 29,125,870 | 616 |
| 2 | [1/822](https://vincentbounce.github.io/Walking-Pi/#x=1/822&w=antHex&d=23052910&r=digits%20L1%20N%20R1) | 22,726,510 | 3,400 | 23,052,910 | 1,671 |
| 3 | [1/263](https://vincentbounce.github.io/Walking-Pi/#x=1/263&w=antHex&d=23236101&r=digits%20L1%20N%20R1) | 22,568,001 | 19,650 | 23,236,101 | 287 |
| 4 | [1/905](https://vincentbounce.github.io/Walking-Pi/#x=1/905&w=antHex&d=18928266&r=digits%20L1%20N%20R1) | 18,841,866 | 540 | 18,928,266 | 8,723 |
| 5 | [1/437](https://vincentbounce.github.io/Walking-Pi/#x=1/437&w=antHex&d=14776499&r=digits%20L1%20N%20R1) | 14,721,059 | 198 | 14,776,499 | 18,587 |
| 6 | [1/1839](https://vincentbounce.github.io/Walking-Pi/#x=1/1839&w=antHex&d=14108381&r=digits%20L1%20N%20R1) | 13,780,043 | 8,874 | 14,108,381 | 311 |
| 7 | [1/1763](https://vincentbounce.github.io/Walking-Pi/#x=1/1763&w=antHex&d=11128820&r=digits%20L1%20N%20R1) | 11,039,444 | 336 | 11,128,820 | 6,571 |
| 8 | [1/896](https://vincentbounce.github.io/Walking-Pi/#x=1/896&w=antHex&d=11240295&r=digits%20L1%20N%20R1) | 10,972,647 | 6,528 | 11,240,295 | 420 |
| 9 | [1/1725](https://vincentbounce.github.io/Walking-Pi/#x=1/1725&w=antHex&d=11218600&r=digits%20L1%20N%20R1) | 10,855,600 | 12,100 | 11,218,600 | 179 |
| 10 | [1/680](https://vincentbounce.github.io/Walking-Pi/#x=1/680&w=antHex&d=10367246&r=digits%20L1%20N%20R1) | 10,285,934 | 2,464 | 10,367,246 | 1,044 |
| 11 | [1/692](https://vincentbounce.github.io/Walking-Pi/#x=1/692&w=antHex&d=11076450&r=digits%20L1%20N%20R1) | 10,243,110 | 55,556 | 11,076,450 | 46 |
| 12 | [1/1734](https://vincentbounce.github.io/Walking-Pi/#x=1/1734&w=antHex&d=9466927&r=digits%20L1%20N%20R1) | 8,690,095 | 55,488 | 9,466,927 | 31 |
| 13 | [1/379](https://vincentbounce.github.io/Walking-Pi/#x=1/379&w=antHex&d=8715113&r=digits%20L1%20N%20R1) | 8,374,157 | 4,158 | 8,715,113 | 503 |
| 14 | [1/1675](https://vincentbounce.github.io/Walking-Pi/#x=1/1675&w=antHex&d=8359402&r=digits%20L1%20N%20R1) | 8,218,162 | 1,320 | 8,359,402 | 1,245 |
| 15 | [1/1811](https://vincentbounce.github.io/Walking-Pi/#x=1/1811&w=antHex&d=8618261&r=digits%20L1%20N%20R1) | 8,066,211 | 9,050 | 8,618,261 | 178 |

### Tokarz's ant: straight on every N-th step

In 2018, K. Tokarz studied a Langton's ant that goes straight on every N-th step ([arXiv 1807.08789](https://arxiv.org/abs/1807.08789)): for most N it ends in a bounded pattern that oscillates for ever, for some it builds a highway. With **Digits LNR** (base 3: 0 left, 1 straight on, 2 right, mirrored on a dark cell), it is the fraction (3<sup>N</sup> − 2) / (3<sup>N</sup> − 1), whose digits are N − 1 twos and a one, again and again: Langton's ant (right on a light cell, left on a dark one), straight on every N-th step. N from 2 to 30, up to 50 million steps:

| N | Number | Then |
|--:|---|---|
| 2 | [7/8](https://vincentbounce.github.io/Walking-Pi/#x=7/8&w=antSquare&d=25152&r=digits%20LNR) | a highway from step 19,952, every 208 steps |
| 3 | [25/26](https://vincentbounce.github.io/Walking-Pi/#x=25/26&w=antSquare&d=18552&r=digits%20LNR) | a highway from step 14,964, every 156 steps |
| 4 | [79/80](https://vincentbounce.github.io/Walking-Pi/#x=79/80&w=antSquare&d=64&r=digits%20LNR) | a highway from step 0, every 8 steps |
| 5 | [241/242](https://vincentbounce.github.io/Walking-Pi/#x=241/242&w=antSquare&d=885&r=digits%20LNR) | a highway from step 5, every 110 steps |
| 6 | [727/728](https://vincentbounce.github.io/Walking-Pi/#x=727/728&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 69 cells of its start, up to 50 million steps |
| 7 | [2185/2186](https://vincentbounce.github.io/Walking-Pi/#x=2185/2186&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 50 cells of its start, up to 50 million steps |
| 8 | [6559/6560](https://vincentbounce.github.io/Walking-Pi/#x=6559/6560&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 54 cells of its start, up to 50 million steps |
| 9 | [19681/19682](https://vincentbounce.github.io/Walking-Pi/#x=19681/19682&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 36 cells of its start, up to 50 million steps |
| 10 | [59047/59048](https://vincentbounce.github.io/Walking-Pi/#x=59047/59048&w=antSquare&d=1447&r=digits%20LNR) | a highway from step 1,267, every 20 steps |
| 11 | [177145/177146](https://vincentbounce.github.io/Walking-Pi/#x=177145/177146&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 67 cells of its start, up to 50 million steps |
| 12 | [531439/531440](https://vincentbounce.github.io/Walking-Pi/#x=531439/531440&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 60 cells of its start, up to 50 million steps |
| 13 | [1594321/1594322](https://vincentbounce.github.io/Walking-Pi/#x=1594321/1594322&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 63 cells of its start, up to 50 million steps |
| 14 | [4782967/4782968](https://vincentbounce.github.io/Walking-Pi/#x=4782967/4782968&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 28 cells of its start, up to 50 million steps |
| 15 | [14348905/14348906](https://vincentbounce.github.io/Walking-Pi/#x=14348905/14348906&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 28 cells of its start, up to 50 million steps |
| 16 | [43046719/43046720](https://vincentbounce.github.io/Walking-Pi/#x=43046719/43046720&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 26 cells of its start, up to 50 million steps |
| 17 | [129140161/129140162](https://vincentbounce.github.io/Walking-Pi/#x=129140161/129140162&w=antSquare&d=273339&r=digits%20LNR) | a highway from step 271,384, every 85 steps |
| 18 | [387420487/387420488](https://vincentbounce.github.io/Walking-Pi/#x=387420487/387420488&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 61 cells of its start, up to 50 million steps |
| 19 | [1162261465/1162261466](https://vincentbounce.github.io/Walking-Pi/#x=1162261465/1162261466&w=antSquare&d=38780&r=digits%20LNR) | a highway from step 34,980, every 475 steps |
| 20 | [3486784399/3486784400](https://vincentbounce.github.io/Walking-Pi/#x=3486784399/3486784400&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 50 cells of its start, up to 50 million steps |
| 21 | [10460353201/10460353202](https://vincentbounce.github.io/Walking-Pi/#x=10460353201/10460353202&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 69 cells of its start, up to 50 million steps |
| 22 | [31381059607/31381059608](https://vincentbounce.github.io/Walking-Pi/#x=31381059607/31381059608&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 61 cells of its start, up to 50 million steps |
| 23 | [94143178825/94143178826](https://vincentbounce.github.io/Walking-Pi/#x=94143178825/94143178826&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 67 cells of its start, up to 50 million steps |
| 24 | [282429536479/282429536480](https://vincentbounce.github.io/Walking-Pi/#x=282429536479/282429536480&w=antSquare&d=50641&r=digits%20LNR) | a highway from step 48,913, every 96 steps |
| 25 | [847288609441/847288609442](https://vincentbounce.github.io/Walking-Pi/#x=847288609441/847288609442&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 44 cells of its start, up to 50 million steps |
| 26 | [2541865828327/2541865828328](https://vincentbounce.github.io/Walking-Pi/#x=2541865828327/2541865828328&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 65 cells of its start, up to 50 million steps |
| 27 | [7625597484985/7625597484986](https://vincentbounce.github.io/Walking-Pi/#x=7625597484985/7625597484986&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 49 cells of its start, up to 50 million steps |
| 28 | [22876792454959/22876792454960](https://vincentbounce.github.io/Walking-Pi/#x=22876792454959/22876792454960&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 38 cells of its start, up to 50 million steps |
| 29 | [68630377364881/68630377364882](https://vincentbounce.github.io/Walking-Pi/#x=68630377364881/68630377364882&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 75 cells of its start, up to 50 million steps |
| 30 | [205891132094647/205891132094648](https://vincentbounce.github.io/Walking-Pi/#x=205891132094647/205891132094648&w=antSquare&d=200000&r=digits%20LNR) | bounded: it stays within 21 cells of its start, up to 50 million steps |

The latest highway: N = 17, after 271,384 steps of chaos. The links of the bounded ones show 200,000 steps.

<br>

<p align="center">⁂</p>

<br>

## 🌐 Walks on surfaces

On a surface, the walk can only be in finitely many states (where it is, and which way it heads), so a fraction's walk always comes back to a state it had at the same point of its period, and goes round again from there. On a torus a period shifts the walk by a fixed step on its sheet, so every fraction closes, after turning round the ring and the tube a number of times; on the solids the period's figure is turned at each corner it passes, and the walk closes too (or not within the steps tried).

The tables list every fraction p/q between 1 and 2 with q ≤ 256 and a period of at most 64 digits, walked from start 1 at the size given above each table, up to 12,000 steps; one per pattern (same corners walked and same round). They are ranked for big patterns drawn with few overlaps: **visited**, corners (along the grid) or cells (on cells) the walk passes through; **new edges**, the share of steps that walk an edge or cross a cell side for the first time. **Round**: the steps of one round of the closed walk. The torus's own loop hunt (the − / + under the size) finds the sizes where a fraction closes in fewest laps.

### Square torus

**Along the grid** (base 3), size 48:

| # | Number | Period | Round | Corners visited (of 5,760) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [207/200](https://vincentbounce.github.io/Walking-Pi/#x=207/200&w=torusGrid&d=4801&s=48) | 20 | 4,800 | 4,080 | 90 % |
| 2 | [156/155](https://vincentbounce.github.io/Walking-Pi/#x=156/155&w=torusGrid&d=7201&s=48) | 60 | 7,200 | 5,040 | 80 % |
| 3 | [233/232](https://vincentbounce.github.io/Walking-Pi/#x=233/232&w=torusGrid&d=6721&s=48) | 28 | 6,720 | 4,320 | 86 % |
| 4 | [189/188](https://vincentbounce.github.io/Walking-Pi/#x=189/188&w=torusGrid&d=11041&s=48) | 46 | 11,040 | 5,760 | 74 % |
| 5 | [93/92](https://vincentbounce.github.io/Walking-Pi/#x=93/92&w=torusGrid&d=5281&s=48) | 22 | 5,280 | 4,080 | 86 % |
| 6 | [231/230](https://vincentbounce.github.io/Walking-Pi/#x=231/230&w=torusGrid&d=5281&s=48) | 44 | 5,280 | 3,840 | 84 % |
| 7 | [149/142](https://vincentbounce.github.io/Walking-Pi/#x=149/142&w=torusGrid&d=8401&s=48) | 35 | 8,400 | 4,560 | 74 % |
| 8 | [143/142](https://vincentbounce.github.io/Walking-Pi/#x=143/142&w=torusGrid&d=4201&s=48) | 35 | 4,200 | 3,000 | 86 % |

**On cells** (base 3), size 48:

| # | Number | Period | Round | Cells visited (of 5,760) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [211/200](https://vincentbounce.github.io/Walking-Pi/#x=211/200&w=torusWalk&d=4801&s=48) | 20 | 4,800 | 4,080 | 90 % |
| 2 | [156/155](https://vincentbounce.github.io/Walking-Pi/#x=156/155&w=torusWalk&d=7201&s=48) | 60 | 7,200 | 5,040 | 80 % |
| 3 | [233/232](https://vincentbounce.github.io/Walking-Pi/#x=233/232&w=torusWalk&d=6721&s=48) | 28 | 6,720 | 4,320 | 86 % |
| 4 | [93/92](https://vincentbounce.github.io/Walking-Pi/#x=93/92&w=torusWalk&d=5281&s=48) | 22 | 5,280 | 4,080 | 86 % |
| 5 | [237/230](https://vincentbounce.github.io/Walking-Pi/#x=237/230&w=torusWalk&d=5281&s=48) | 44 | 5,280 | 3,840 | 84 % |
| 6 | [143/142](https://vincentbounce.github.io/Walking-Pi/#x=143/142&w=torusWalk&d=8401&s=48) | 35 | 8,400 | 4,560 | 74 % |
| 7 | [149/142](https://vincentbounce.github.io/Walking-Pi/#x=149/142&w=torusWalk&d=4201&s=48) | 35 | 4,200 | 3,000 | 86 % |
| 8 | [264/247](https://vincentbounce.github.io/Walking-Pi/#x=264/247&w=torusWalk&d=2161&s=48) | 18 | 2,160 | 2,160 | 100 % |

### Triangle torus

**Along the grid** (base 5), size 48:

| # | Number | Period | Round | Corners visited (of 4,992) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [89/87](https://vincentbounce.github.io/Walking-Pi/#x=89/87&w=triTorusGrid&d=8737&s=48x208) | 14 | 8,736 | 4,992 | 100 % |
| 2 | [28/27](https://vincentbounce.github.io/Walking-Pi/#x=28/27&w=triTorusGrid&d=5617&s=48x208) | 18 | 5,616 | 4,368 | 100 % |
| 3 | [101/99](https://vincentbounce.github.io/Walking-Pi/#x=101/99&w=triTorusGrid&d=9361&s=48x208) | 30 | 9,360 | 4,680 | 93 % |
| 4 | [207/203](https://vincentbounce.github.io/Walking-Pi/#x=207/203&w=triTorusGrid&d=6553&s=48x208) | 42 | 6,552 | 4,368 | 95 % |
| 5 | [10/9](https://vincentbounce.github.io/Walking-Pi/#x=10/9&w=triTorusGrid&d=3745&s=48x208) | 6 | 3,744 | 3,744 | 100 % |
| 6 | [188/181](https://vincentbounce.github.io/Walking-Pi/#x=188/181&w=triTorusGrid&d=4681&s=48x208) | 15 | 4,680 | 3,744 | 100 % |
| 7 | [193/191](https://vincentbounce.github.io/Walking-Pi/#x=193/191&w=triTorusGrid&d=5929&s=48x208) | 19 | 5,928 | 4,056 | 95 % |
| 8 | [75/74](https://vincentbounce.github.io/Walking-Pi/#x=75/74&w=triTorusGrid&d=7489&s=48x208) | 36 | 7,488 | 4,576 | 89 % |

**On cells** (base 2), size 48:

| # | Number | Period | Round | Cells visited (of 9,984) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [68/65](https://vincentbounce.github.io/Walking-Pi/#x=68/65&w=triTorusWalk&d=7489&s=48x208) | 12 | 7,488 | 7,488 | 100 % |
| 2 | [254/251](https://vincentbounce.github.io/Walking-Pi/#x=254/251&w=triTorusWalk&d=10401&s=48x208) | 50 | 10,400 | 8,320 | 90 % |
| 3 | [44/41](https://vincentbounce.github.io/Walking-Pi/#x=44/41&w=triTorusWalk&d=6241&s=48x208) | 20 | 6,240 | 6,240 | 100 % |
| 4 | [112/109](https://vincentbounce.github.io/Walking-Pi/#x=112/109&w=triTorusWalk&d=11233&s=48x208) | 36 | 11,232 | 8,736 | 83 % |
| 5 | [202/189](https://vincentbounce.github.io/Walking-Pi/#x=202/189&w=triTorusWalk&d=5617&s=48x208) | 18 | 5,616 | 5,616 | 100 % |
| 6 | [38/37](https://vincentbounce.github.io/Walking-Pi/#x=38/37&w=triTorusWalk&d=11233&s=48x208) | 36 | 11,232 | 8,112 | 83 % |
| 7 | [116/105](https://vincentbounce.github.io/Walking-Pi/#x=116/105&w=triTorusWalk&d=7489&s=48x208) | 12 | 7,488 | 6,240 | 92 % |
| 8 | [156/145](https://vincentbounce.github.io/Walking-Pi/#x=156/145&w=triTorusWalk&d=8737&s=48x208) | 28 | 8,736 | 6,864 | 86 % |

### Hex torus

**Along the grid** (base 2), size 48:

| # | Number | Period | Round | Corners visited (of 13,248) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [46/43](https://vincentbounce.github.io/Walking-Pi/#x=46/43&w=hexTorusGrid&d=10305&s=48x138) | 14 | 10,304 | 10,304 | 100 % |
| 2 | [226/205](https://vincentbounce.github.io/Walking-Pi/#x=226/205&w=hexTorusGrid&d=11041&s=48x138) | 20 | 11,040 | 9,936 | 95 % |
| 3 | [6/5](https://vincentbounce.github.io/Walking-Pi/#x=6/5&w=hexTorusGrid&d=8833&s=48x138) | 4 | 8,832 | 8,832 | 100 % |
| 4 | [222/205](https://vincentbounce.github.io/Walking-Pi/#x=222/205&w=hexTorusGrid&d=11041&s=48x138) | 20 | 11,040 | 9,384 | 90 % |
| 5 | [88/87](https://vincentbounce.github.io/Walking-Pi/#x=88/87&w=hexTorusGrid&d=7729&s=48x138) | 28 | 7,728 | 7,176 | 96 % |
| 6 | [236/205](https://vincentbounce.github.io/Walking-Pi/#x=236/205&w=hexTorusGrid&d=11041&s=48x138) | 20 | 11,040 | 8,832 | 85 % |
| 7 | [76/65](https://vincentbounce.github.io/Walking-Pi/#x=76/65&w=hexTorusGrid&d=8833&s=48x138) | 12 | 8,832 | 7,360 | 92 % |
| 8 | [60/59](https://vincentbounce.github.io/Walking-Pi/#x=60/59&w=hexTorusGrid&d=10673&s=48x138) | 58 | 10,672 | 8,096 | 86 % |

**On cells** (base 5), size 48:

| # | Number | Period | Round | Cells visited (of 6,624) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [14/13](https://vincentbounce.github.io/Walking-Pi/#x=14/13&w=hexTorusWalk&d=8833&s=48x138) | 4 | 8,832 | 6,624 | 100 % |
| 2 | [19/18](https://vincentbounce.github.io/Walking-Pi/#x=19/18&w=hexTorusWalk&d=6625&s=48x138) | 6 | 6,624 | 6,624 | 100 % |
| 3 | [161/142](https://vincentbounce.github.io/Walking-Pi/#x=161/142&w=hexTorusWalk&d=11041&s=48x138) | 5 | 11,040 | 6,624 | 100 % |
| 4 | [185/183](https://vincentbounce.github.io/Walking-Pi/#x=185/183&w=hexTorusWalk&d=8281&s=48x138) | 30 | 8,280 | 6,348 | 100 % |
| 5 | [61/58](https://vincentbounce.github.io/Walking-Pi/#x=61/58&w=hexTorusWalk&d=10305&s=48x138) | 14 | 10,304 | 6,624 | 93 % |
| 6 | [8/7](https://vincentbounce.github.io/Walking-Pi/#x=8/7&w=hexTorusWalk&d=6625&s=48x138) | 6 | 6,624 | 5,520 | 100 % |
| 7 | [151/142](https://vincentbounce.github.io/Walking-Pi/#x=151/142&w=hexTorusWalk&d=5521&s=48x138) | 5 | 5,520 | 5,520 | 100 % |
| 8 | [35/34](https://vincentbounce.github.io/Walking-Pi/#x=35/34&w=hexTorusWalk&d=11777&s=48x138) | 16 | 11,776 | 6,624 | 88 % |

### Cube

**Along the grid** (base 3), size 48:

| # | Number | Period | Round | Corners visited (of 13,826) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [189/188](https://vincentbounce.github.io/Walking-Pi/#x=189/188&w=cubeGrid&d=6625&s=48) | 46 | 6,624 | 4,953 | 86 % |
| 2 | [195/194](https://vincentbounce.github.io/Walking-Pi/#x=195/194&w=cubeGrid&d=4609&s=48) | 48 | 4,608 | 3,332 | 83 % |
| 3 | [239/232](https://vincentbounce.github.io/Walking-Pi/#x=239/232&w=cubeGrid&d=4033&s=48) | 28 | 4,032 | 2,967 | 86 % |
| 4 | [233/232](https://vincentbounce.github.io/Walking-Pi/#x=233/232&w=cubeGrid&d=4033&s=48) | 28 | 4,032 | 2,955 | 86 % |
| 5 | [143/142](https://vincentbounce.github.io/Walking-Pi/#x=143/142&w=cubeGrid&d=3361&s=48) | 35 | 3,360 | 2,602 | 90 % |
| 6 | [149/142](https://vincentbounce.github.io/Walking-Pi/#x=149/142&w=cubeGrid&d=3361&s=48) | 35 | 3,360 | 2,596 | 90 % |
| 7 | [247/218](https://vincentbounce.github.io/Walking-Pi/#x=247/218&w=cubeGrid&d=5185&s=48) | 27 | 5,184 | 3,292 | 79 % |
| 8 | [219/218](https://vincentbounce.github.io/Walking-Pi/#x=219/218&w=cubeGrid&d=5185&s=48) | 27 | 5,184 | 3,268 | 79 % |

**On cells** (base 3), size 48:

| # | Number | Period | Round | Cells visited (of 13,824) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [193/188](https://vincentbounce.github.io/Walking-Pi/#x=193/188&w=cubeFlat&d=6625&s=48) | 46 | 6,624 | 5,013 | 87 % |
| 2 | [189/188](https://vincentbounce.github.io/Walking-Pi/#x=189/188&w=cubeFlat&d=6625&s=48) | 46 | 6,624 | 4,734 | 84 % |
| 3 | [239/232](https://vincentbounce.github.io/Walking-Pi/#x=239/232&w=cubeFlat&d=4033&s=48) | 28 | 4,032 | 3,039 | 88 % |
| 4 | [195/194](https://vincentbounce.github.io/Walking-Pi/#x=195/194&w=cubeFlat&d=4609&s=48) | 48 | 4,608 | 3,312 | 83 % |
| 5 | [233/232](https://vincentbounce.github.io/Walking-Pi/#x=233/232&w=cubeFlat&d=4033&s=48) | 28 | 4,032 | 2,964 | 86 % |
| 6 | [143/142](https://vincentbounce.github.io/Walking-Pi/#x=143/142&w=cubeFlat&d=3361&s=48) | 35 | 3,360 | 2,598 | 90 % |
| 7 | [149/142](https://vincentbounce.github.io/Walking-Pi/#x=149/142&w=cubeFlat&d=3361&s=48) | 35 | 3,360 | 2,592 | 90 % |
| 8 | [219/218](https://vincentbounce.github.io/Walking-Pi/#x=219/218&w=cubeFlat&d=5185&s=48) | 27 | 5,184 | 3,260 | 79 % |

### Tetrahedron

**Along the grid** (base 5), size 48:

| # | Number | Period | Round | Corners visited (of 4,610) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [101/99](https://vincentbounce.github.io/Walking-Pi/#x=101/99&w=tetraGrid&d=4321&s=48) | 30 | 4,320 | 2,787 | 90 % |
| 2 | [151/148](https://vincentbounce.github.io/Walking-Pi/#x=151/148&w=tetraGrid&d=5185&s=48) | 36 | 5,184 | 3,150 | 84 % |
| 3 | [100/99](https://vincentbounce.github.io/Walking-Pi/#x=100/99&w=tetraGrid&d=4321&s=48) | 30 | 4,320 | 2,790 | 89 % |
| 4 | [149/148](https://vincentbounce.github.io/Walking-Pi/#x=149/148&w=tetraGrid&d=5185&s=48) | 36 | 5,184 | 3,052 | 84 % |
| 5 | [248/231](https://vincentbounce.github.io/Walking-Pi/#x=248/231&w=tetraGrid&d=4321&s=48) | 30 | 4,320 | 2,817 | 87 % |
| 6 | [61/59](https://vincentbounce.github.io/Walking-Pi/#x=61/59&w=tetraGrid&d=4177&s=48) | 29 | 4,176 | 2,588 | 88 % |
| 7 | [111/109](https://vincentbounce.github.io/Walking-Pi/#x=111/109&w=tetraGrid&d=3889&s=48) | 27 | 3,888 | 2,448 | 88 % |
| 8 | [117/109](https://vincentbounce.github.io/Walking-Pi/#x=117/109&w=tetraGrid&d=3889&s=48) | 27 | 3,888 | 2,419 | 87 % |

**On cells** (base 2), size 48:

| # | Number | Period | Round | Cells visited (of 9,216) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [238/219](https://vincentbounce.github.io/Walking-Pi/#x=238/219&w=tetraLR&d=1729&s=48) | 18 | 1,728 | 1,728 | 100 % |
| 2 | [226/221](https://vincentbounce.github.io/Walking-Pi/#x=226/221&w=tetraLR&d=2305&s=48) | 24 | 2,304 | 1,824 | 88 % |
| 3 | [166/165](https://vincentbounce.github.io/Walking-Pi/#x=166/165&w=tetraLR&d=1921&s=48) | 20 | 1,920 | 1,632 | 90 % |
| 4 | [166/157](https://vincentbounce.github.io/Walking-Pi/#x=166/157&w=tetraLR&d=1665&s=48) | 52 | 1,664 | 1,472 | 92 % |
| 5 | [148/145](https://vincentbounce.github.io/Walking-Pi/#x=148/145&w=tetraLR&d=2689&s=48) | 28 | 2,688 | 1,824 | 80 % |
| 6 | [122/105](https://vincentbounce.github.io/Walking-Pi/#x=122/105&w=tetraLR&d=1153&s=48) | 12 | 1,152 | 1,152 | 100 % |
| 7 | [244/219](https://vincentbounce.github.io/Walking-Pi/#x=244/219&w=tetraLR&d=1729&s=48) | 18 | 1,728 | 1,440 | 89 % |
| 8 | [254/251](https://vincentbounce.github.io/Walking-Pi/#x=254/251&w=tetraLR&d=1601&s=48) | 50 | 1,600 | 1,312 | 91 % |

### Octahedron

**Along the grid** (base 5), size 48:

| # | Number | Period | Round | Corners visited (of 9,218) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [149/148](https://vincentbounce.github.io/Walking-Pi/#x=149/148&w=octaGrid&d=6913&s=48) | 36 | 6,912 | 4,660 | 87 % |
| 2 | [151/148](https://vincentbounce.github.io/Walking-Pi/#x=151/148&w=octaGrid&d=6913&s=48) | 36 | 6,912 | 4,604 | 87 % |
| 3 | [117/109](https://vincentbounce.github.io/Walking-Pi/#x=117/109&w=octaGrid&d=5185&s=48) | 27 | 5,184 | 3,616 | 91 % |
| 4 | [213/191](https://vincentbounce.github.io/Walking-Pi/#x=213/191&w=octaGrid&d=3649&s=48) | 19 | 3,648 | 3,008 | 96 % |
| 5 | [111/109](https://vincentbounce.github.io/Walking-Pi/#x=111/109&w=octaGrid&d=3889&s=48) | 27 | 3,888 | 2,799 | 92 % |
| 6 | [61/59](https://vincentbounce.github.io/Walking-Pi/#x=61/59&w=octaGrid&d=4177&s=48) | 29 | 4,176 | 2,724 | 92 % |
| 7 | [166/163](https://vincentbounce.github.io/Walking-Pi/#x=166/163&w=octaGrid&d=5185&s=48) | 54 | 5,184 | 3,074 | 86 % |
| 8 | [101/99](https://vincentbounce.github.io/Walking-Pi/#x=101/99&w=octaGrid&d=2881&s=48) | 30 | 2,880 | 2,334 | 98 % |

**On cells** (base 2), size 48:

| # | Number | Period | Round | Cells visited (of 18,432) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [202/189](https://vincentbounce.github.io/Walking-Pi/#x=202/189&w=octaLR&d=2593&s=48) | 18 | 2,592 | 2,460 | 96 % |
| 2 | [200/189](https://vincentbounce.github.io/Walking-Pi/#x=200/189&w=octaLR&d=2593&s=48) | 18 | 2,592 | 2,451 | 96 % |
| 3 | [204/185](https://vincentbounce.github.io/Walking-Pi/#x=204/185&w=octaLR&d=3457&s=48) | 36 | 3,456 | 2,782 | 87 % |
| 4 | [182/177](https://vincentbounce.github.io/Walking-Pi/#x=182/177&w=octaLR&d=8353&s=48) | 58 | 8,352 | 4,713 | 66 % |
| 5 | [148/145](https://vincentbounce.github.io/Walking-Pi/#x=148/145&w=octaLR&d=2689&s=48) | 28 | 2,688 | 2,292 | 92 % |
| 6 | [166/165](https://vincentbounce.github.io/Walking-Pi/#x=166/165&w=octaLR&d=2881&s=48) | 20 | 2,880 | 2,364 | 88 % |
| 7 | [194/165](https://vincentbounce.github.io/Walking-Pi/#x=194/165&w=octaLR&d=2881&s=48) | 20 | 2,880 | 2,355 | 88 % |
| 8 | [70/69](https://vincentbounce.github.io/Walking-Pi/#x=70/69&w=octaLR&d=3169&s=48) | 22 | 3,168 | 2,376 | 85 % |

### Triangle sphere (icosahedron)

**Along the grid** (base 5), size 48:

| # | Number | Period | Round | Corners visited (of 23,042) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [149/148](https://vincentbounce.github.io/Walking-Pi/#x=149/148&w=icosaGrid&d=8641&s=48) | 36 | 8,640 | 6,595 | 92 % |
| 2 | [151/148](https://vincentbounce.github.io/Walking-Pi/#x=151/148&w=icosaGrid&d=8641&s=48) | 36 | 8,640 | 6,535 | 92 % |
| 3 | [100/99](https://vincentbounce.github.io/Walking-Pi/#x=100/99&w=icosaGrid&d=7201&s=48) | 30 | 7,200 | 5,555 | 95 % |
| 4 | [193/191](https://vincentbounce.github.io/Walking-Pi/#x=193/191&w=icosaGrid&d=4561&s=48) | 19 | 4,560 | 4,085 | 98 % |
| 5 | [213/191](https://vincentbounce.github.io/Walking-Pi/#x=213/191&w=icosaGrid&d=4561&s=48) | 19 | 4,560 | 4,025 | 98 % |
| 6 | [101/99](https://vincentbounce.github.io/Walking-Pi/#x=101/99&w=icosaGrid&d=4321&s=48) | 30 | 4,320 | 3,597 | 99 % |
| 7 | [187/171](https://vincentbounce.github.io/Walking-Pi/#x=187/171&w=icosaGrid&d=4321&s=48) | 18 | 4,320 | 3,625 | 98 % |
| 8 | [170/169](https://vincentbounce.github.io/Walking-Pi/#x=170/169&w=icosaGrid&d=4993&s=48) | 52 | 4,992 | 3,952 | 93 % |

**On cells** (base 2), size 48:

| # | Number | Period | Round | Cells visited (of 46,080) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [182/177](https://vincentbounce.github.io/Walking-Pi/#x=182/177&w=icosaLR&d=8353&s=48) | 58 | 8,352 | 6,270 | 82 % |
| 2 | [244/219](https://vincentbounce.github.io/Walking-Pi/#x=244/219&w=icosaLR&d=4321&s=48) | 18 | 4,320 | 4,220 | 98 % |
| 3 | [238/219](https://vincentbounce.github.io/Walking-Pi/#x=238/219&w=icosaLR&d=4321&s=48) | 18 | 4,320 | 4,210 | 98 % |
| 4 | [226/221](https://vincentbounce.github.io/Walking-Pi/#x=226/221&w=icosaLR&d=5761&s=48) | 24 | 5,760 | 4,885 | 90 % |
| 5 | [204/185](https://vincentbounce.github.io/Walking-Pi/#x=204/185&w=icosaLR&d=3457&s=48) | 36 | 3,456 | 3,380 | 99 % |
| 6 | [166/165](https://vincentbounce.github.io/Walking-Pi/#x=166/165&w=icosaLR&d=4801&s=48) | 20 | 4,800 | 3,980 | 89 % |
| 7 | [194/165](https://vincentbounce.github.io/Walking-Pi/#x=194/165&w=icosaLR&d=4801&s=48) | 20 | 4,800 | 3,965 | 88 % |
| 8 | [148/145](https://vincentbounce.github.io/Walking-Pi/#x=148/145&w=icosaLR&d=4033&s=48) | 28 | 4,032 | 3,450 | 93 % |

### Hexagon sphere

Along the grid: see [the sphere of hexagons](#-along-the-grid-of-the-sphere-of-hexagons) below.

**On cells** (base 2), size 32:

| # | Number | Period | Round | Cells visited (of 10,242) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [182/177](https://vincentbounce.github.io/Walking-Pi/#x=182/177&w=hexSphereWalk&d=5569&s=32) | 58 | 5,568 | 3,912 | 86 % |
| 2 | [194/185](https://vincentbounce.github.io/Walking-Pi/#x=194/185&w=hexSphereWalk&d=5761&s=32) | 36 | 5,760 | 3,490 | 87 % |
| 3 | [202/189](https://vincentbounce.github.io/Walking-Pi/#x=202/189&w=hexSphereWalk&d=2881&s=32) | 18 | 2,880 | 2,695 | 99 % |
| 4 | [200/189](https://vincentbounce.github.io/Walking-Pi/#x=200/189&w=hexSphereWalk&d=2881&s=32) | 18 | 2,880 | 2,690 | 98 % |
| 5 | [204/185](https://vincentbounce.github.io/Walking-Pi/#x=204/185&w=hexSphereWalk&d=5761&s=32) | 36 | 5,760 | 3,795 | 82 % |
| 6 | [62/61](https://vincentbounce.github.io/Walking-Pi/#x=62/61&w=hexSphereWalk&d=5761&s=32) | 60 | 5,760 | 3,501 | 81 % |
| 7 | [20/19](https://vincentbounce.github.io/Walking-Pi/#x=20/19&w=hexSphereWalk&d=2881&s=32) | 18 | 2,880 | 2,486 | 96 % |
| 8 | [258/251](https://vincentbounce.github.io/Walking-Pi/#x=258/251&w=hexSphereWalk&d=4001&s=32) | 50 | 4,000 | 3,071 | 86 % |

<br>

<p align="center">⁂</p>

<br>

## 💠 Along the grid of the sphere of hexagons

In *Walks on surface grids*, the **Hexagon sphere** reads base-2 digits as turns: `0` left, `1` right. An irrational number like π draws noise; a fraction has digits that repeat, so each period of digits makes the same turns again. When the repeating word turns by 0° in total (its count of `0`s minus its count of `1`s is a multiple of 6), each period shifts the walker straight on, and on the sphere the walk comes back exactly onto itself after a while. The walk then stops after that first round (`… digits max ↻`), and Fill areas is set aside.

The tables below list every such fraction p/q between 1 and 2 with q ≤ 512 and a period of at most 64 digits: **227 different patterns** (a word, its rotations, its mirror `0`↔`1` and its reverse count as one), each under its fraction with the smallest denominator. They were measured on the sphere of 10,242 hexagons; each number opens the live page.

- **Round**: steps before the walk is back exactly where it started; **corners**: corners walked; **area**: share of the sphere enclosed, at start 1.
- **Symmetry**: how many of the sphere's 60 rotations map the drawing onto itself (5: around a pentagon, 3: around the centre of a face, 2: around the middle of an edge), at the best of starts 1 to 8, which the link opens. Almost every pattern closes into a symmetric drawing: that is what makes these braids.
- **Chains** (80): one period's figure moves on one notch without ever walking an edge twice.
- **Bands** (128): the figure moves on but walks over its own edges: braided bands.
- **In place** (19): no shift per period: a small closed figure.

#### The most striking (41): symmetry 5, at least 3,000 corners

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

#### Chains, by width over step (80)

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

#### Bands, by corners walked (128)

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

#### In place (19)

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


## 🧬 Life on Cairo pentagons: rules with dying states

Each pentagon of the Cairo tiling touches 7 others (5 by an edge, 2 by a corner). All the rules B ⊂ {2…7}, S ⊂ {0…6} with 2 to 6 states (40,320 rules) were run on soups 30 % alive (a torus of 32 × 32 squares, 2,048 pentagons, up to 2,000 generations); then the 1,493 that stay lively, or settle late, were given 300 small random starts each (the cells within 2 steps of one) on a 64 torus, looking for spaceships (the same cells again, moved by a whole tile of the tiling) and oscillators. **1,021 of them have spaceships**, most of period 2, as Brian's Brain does on squares.

The best, checked in the app (soups at 30 %, seed 7):

| Rule | States | Soup 64 | Soup 128 | Smallest ship | Try it |
|---|--:|---|---|---|---|
| **B24/S346/C4** | 4 | never settles (8,000+), ~6 % alive | never settles, ~7 % alive | 9 cells, period 2, diagonal | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B24/S346/C4&s=64&sd=random.30.7) · [ship](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B24/S346/C4&s=32&sd=draw&p=32,16:6.$2.AB.A$C.BCAB$2.C!) |
| **B23/S6/C3** | 3 | gen 1,974, period-6 loop | gen 2,934, period-18 loop | 6 cells, period 2 | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B23/S6/C3&s=64&sd=random.30.7) · [ship](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B23/S6/C3&s=32&sd=draw&p=32,16:3.B$A.BA.B$2.A!) |
| **B2347/S35/C3** | 3 | gen 5,592, period-3 loop | gen 3,376, period-90 loop | 8 cells, period 2 | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B2347/S35/C3&s=64&sd=random.30.7) · [ship](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B2347/S35/C3&s=32&sd=draw&p=32,16:8.$2.2A.B.A$A.2B2.B!) |
| **B245/S045/C4** | 4 | settles fast | settles fast | **5 cells**, period 4: the smallest found | [ship](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B245/S045/C4&s=32&sd=draw&p=32,16:2.AB.B$A2.B!) |
| **B2/S345/C4** (Star Wars) | 4 | gen 462 | | 9 cells, period 2; an oscillator of period 40 (46 cells) | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B2/S345/C4&s=64&sd=random.30.7) · [ship](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B2/S345/C4&s=32&sd=draw&p=32,16:3.A$2A2B.C$B.2C!) |
| B34/S23 (the 2-state default) | 2 | gen 283, period-4 loop | gen 334, period-12 loop | none found | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B34/S23&s=64&sd=random.30.7) |

A ship's cells are written as the plane's rows (two pentagons a square, `A` alive, `B` `C` dying), drawn at an even square: the tiling repeats every 2 squares, so a pattern fits every other square only.


## 🎨 Draw's patterns for the rules of each grid

For each rule offered (Life's own patterns on squares come from LifeWiki), 3,000 small random starts (the cells within 2 steps of one, half of them alive) on a 64 × 64 torus (triangles 48 × 48): the smallest spaceships of each speed, the oscillators, and the start lasting longest. Each was then checked in the app, on a 64 × 64 grid: a ship comes back moved after its period, an oscillator in place, and a methuselah's lifetime is the app's. In Draw, a rule shows its own patterns; a rule of your own shows all of its grid's.

### Squares

| Rule | Pattern | What it does | Try it |
|---|---|---|---|
| B3678/S34678 | Oscillator | period 16 · 5 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B3678/S34678&s=64&sd=draw&p=32,32:.A$.A$2A$A!) |
| B3678/S34678 | Methuselah | loops from generation 219 · 14 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B3678/S34678&s=64&sd=draw&p=32,32:2.A$2A2.A$2A2.A$A.2A$2A.2A!) |
| B36/S23 | Glider | flies, period 4 · 5 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B36/S23&s=64&sd=draw&p=32,32:A$A.A$2A!) |
| B36/S23 | Oscillator | period 10 · 12 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B36/S23&s=64&sd=draw&p=32,32:5.A2.A$2A2.A3.A$2A2.2A.2A!) |
| B36/S23 | Methuselah | loops from generation 2,652 · 12 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B36/S23&s=64&sd=draw&p=32,32:A.2A$3.2A$2A$3.2A$3A!) |
| B2/S/C3 | Glider | flies, period 1 · 4 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B2/S/C3&s=64&sd=draw&p=32,32:2A$2B!) |
| B2/S/C3 | Spaceship | flies, period 4 · 6 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B2/S/C3&s=64&sd=draw&p=32,32:.A$BAB$3.A$2.B!) |
| B2/S/C3 | Methuselah | loops from generation 2,595 · 12 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B2/S/C3&s=64&sd=draw&p=32,32:3.2A$A$.4A$4.A$3A.A!) |
| B2/S345/C4 | Glider | flies, period 1 · 6 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B2/S345/C4&s=64&sd=draw&p=32,32:CBA$CBA!) |
| B2/S345/C4 | Methuselah | loops from generation 3,739 · 12 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B2/S345/C4&s=64&sd=draw&p=32,32:3A$.3A$3.A$3A$2A!) |
| B3/S12345 | Methuselah | settles at generation 430 · 10 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B3/S12345&s=64&sd=draw&p=32,32:A3.A$2.A$2A$5A!) |
| B2/S | Glider | flies, period 1 · 4 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B2/S&s=64&sd=draw&p=32,32:A$.A$.A$A!) |

### Hexagons

| Rule | Pattern | What it does | Try it |
|---|---|---|---|
| B34/S123/C3 | Oscillator | period 8 · 6 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B34/S123/C3&s=64&sd=draw&p=32,32:2.A$.A$2A$A$A!) |
| B2/S34 | Oscillator | period 48 · 6 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2/S34&s=64&sd=draw&p=32,32:3.A$$2.A$.2A$$2A!) |
| B2/S34 | Methuselah | loops from generation 254 · 10 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2/S34&s=64&sd=draw&p=32,32:4.A$4.A$3.A$4A$3A!) |
| B24/S35 | Oscillator | period 6 · 4 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B24/S35&s=64&sd=draw&p=32,32:3.A$2.A$.A$A!) |
| B24/S134/C4 | Glider | flies, period 2 · 16 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B24/S134/C4&s=64&sd=draw&p=32,32:3.AC$.AB.B$ACACAC$AB.B$.AC!) |
| B24/S134/C4 | Methuselah | settles at generation 3,448 · 9 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B24/S134/C4&s=64&sd=draw&p=32,32:4.A$.A2.A$A.2A$A2.A$.A!) |
| B2o/S2m34 | Glider | flies, period 4 · 6 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2o/S2m34&s=64&sd=draw&p=32,32:.A$A$A2.A$A$A!) |
| B2o/S2m34 | Spaceship | flies, period 48 · 12 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2o/S2m34&s=64&sd=draw&p=32,32:3.A$2.A$$2.3A$4A$.2A$A!) |
| B2o/S2m34 | Oscillator | period 30 · 14 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2o/S2m34&s=64&sd=draw&p=32,32:4.A$3.2A$7A$.A2.A$.A2.A!) |
| B2o/S2m34 | Methuselah | loops from generation 352 · 12 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2o/S2m34&s=64&sd=draw&p=32,32:2.2A$.2A.A$2A2.A$A2.A$.2A!) |
| B2/S24/C3 | Glider | flies, period 6 · 10 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2/S24/C3&s=64&sd=draw&p=32,32:3.BA$4.B$4.A$2.AB$.A$2A$A!) |
| B2/S24/C3 | Spaceship | flies, period 6 · 10 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2/S24/C3&s=64&sd=draw&p=32,32:.ABA$B2.B$2.A$2.2A$2.2A!) |
| B2/S24/C3 | Oscillator | period 9 · 15 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2/S24/C3&s=64&sd=draw&p=32,32:.ABA$.B.BA$A2.A$B2A$A.B$BA!) |
| B2/S24/C3 | Methuselah | settles at generation 3,795 · 9 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2/S24/C3&s=64&sd=draw&p=32,32:4.A$4.A$2A2.A$4A!) |
| B234/S1234 | Methuselah | loops from generation 2,193 · 12 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B234/S1234&s=64&sd=draw&p=32,32:2.2A$.2A$A.3A$.2A$A.A!) |
| B234/S234 | Methuselah | loops from generation 2,885 · 8 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B234/S234&s=64&sd=draw&p=32,32:2.A.A$.A2.A$4.A$2A$2.A!) |

### Triangles

| Rule | Pattern | What it does | Try it |
|---|---|---|---|
| B3/S23 | Oscillator | period 8 · 4 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTri&r=B3/S23&s=64&sd=draw&p=64,32:4A!) |
| B3/S23 | Methuselah | loops from generation 1,166 · 19 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTri&r=B3/S23&s=64&sd=draw&p=64,32:4.A2.2A$.A3.2A.A$3A.A.3A$2.2A.A$.A.A!) |
| B34/S2/C4 | Methuselah | settles at generation 4,089 · 20 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTri&r=B34/S2/C4&s=64&sd=draw&p=64,32:3.A2.2A$.3A3.3A$2.A.3A$3A3.A$2.3A!) |
| B45/S345/C4 | Oscillator | period 4 · 10 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTri&r=B45/S345/C4&s=64&sd=draw&p=64,32:5.3A$2.C3.A$.A3.C$3A!) |
| B45/S345/C4 | Methuselah | settles at generation 1,847 · 17 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTri&r=B45/S345/C4&s=64&sd=draw&p=64,32:4.A.2A.A$2.2A2.2A.A$2.3A2.A$A3.A.A$.A!) |

### Cairo pentagons

| Rule | Pattern | What it does | Try it |
|---|---|---|---|
| B34/S23 | Oscillator | period 6 · 7 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B34/S23&s=64&sd=draw&p=64,32:3.A.A$A2.2A$3.A.A!) |
| B23/S6/C3 | Glider | flies, period 2 · 6 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B23/S6/C3&s=64&sd=draw&p=64,32:$3.A$B.AB.A$2.B!) |
| B23/S6/C3 | Oscillator | period 6 · 25 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B23/S6/C3&s=64&sd=draw&p=64,32:A.B2.AB2A$B3.BA.ABA$3.2A2B2.A$B2.A.A3B$2.B3.A!) |
| B23/S6/C3 | Methuselah | loops from generation 2,901 · 13 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B23/S6/C3&s=64&sd=draw&p=64,32:5.A.A$3.A2.A2.A$A.3A3.A$2.A2.2A!) |
| B24/S346/C4 | Glider | flies, period 2 · 9 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B24/S346/C4&s=64&sd=draw&p=64,32:$3.A$BCAB.A$C.BC!) |
| B24/S346/C4 | Spaceship | flies, period 16 · 28 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B24/S346/C4&s=64&sd=draw&p=64,32:3.A3.A$8A.A.A$B.ACBABC2A.C$A2.B2.B2.C$2.C$8.C!) |
| B24/S346/C4 | Methuselah | settles at generation 1,338 · 14 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B24/S346/C4&s=64&sd=draw&p=64,32:$3.A.A$2.A.A2.A$.3A2.2A$A.3A!) |
| B2347/S35/C3 | Glider | flies, period 2 · 6 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B2347/S35/C3&s=64&sd=draw&p=64,32:AB.A$B.AB!) |
| B2347/S35/C3 | Spaceship | flies, period 4 · 19 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B2347/S35/C3&s=64&sd=draw&p=64,32:7.A$2.3A2B2A2.B$A.2B2.B2A2.B$6.B.B2.A!) |
| B2347/S35/C3 | Oscillator | period 3 · 8 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B2347/S35/C3&s=64&sd=draw&p=64,32:B.2A$A.BA$B.A!) |
| B2347/S35/C3 | Methuselah | loops from generation 3,997 · 13 cells | [draw](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B2347/S35/C3&s=64&sd=draw&p=64,32:.3A3.A$.2A2.2A$A.4A!) |


## ⏳ Long deaths in a box

Found with the hunt's *Dies out* goal: a start that stays alive very long on a grid with dead edges (Walls), then dies out to the last cell.

| Grid | Rule | Start | Dies out at | Try it |
|---|---|---|--:|---|
| Cairo pentagons, 48 × 48, walls | Cairo Wars B24/S346/C4 | **7 cells** (5 alive, 2 dying), up to 392 alive | **48,318** | [play](https://vincentbounce.github.io/Walking-Pi/#x=random(99148459)&w=life2dCairo&r=B24/S346/C4&s=48&e=1&sd=random.30.828121311&ch=s4.1qr-2i-1-0_2-0-0-2k_2) |
| Cairo pentagons, 48 × 48, walls | Cairo Wars B24/S346/C4 | 33 cells (14 alive, 19 dying) | **28,079** | [play](https://vincentbounce.github.io/Walking-Pi/#x=random(99148459)&w=life2dCairo&r=B24/S346/C4&s=48&e=1&sd=random.30.828121311&ch=s4.1la_2-4_3-1-2e-0-3_3-0-1_3-2e-0-1_3-2_3-0_3-0_3-0-2_3-1_3-28-0-0_2-0_3-1-1_2-0_3-1_2-3_3-29-1-0-2_3-1_3-1_3-57) |

Cairo Wars never settles from a soup on a torus (sparks and gliders forever); in a closed box its activity wanders for tens of thousands of generations (86 to 338 cells alive), then wears itself out. On an infinite plane its gliders would fly away, so this is a methuselah of the box, not of the rule alone.


## 🧭 A glider along the edge of the Möbius strip

On the Möbius strip of Cairo pentagons, Cairo Wars (B24/S346/C4) has a glider that lives only **on the strip's edge**, a fold where each pentagon of the edge meets its own other face ([play](https://vincentbounce.github.io/Walking-Pi/#x=random(582644567)&w=lifeMobiusCairo&s=12&r=B24/S346/C4&k=3&sd=random.33.496705661&ch=s4.7h_2-m_2-1_2-0_2-j_2-0_2-0_2-0_2-0_2-1_2-f_2-0_2-1_2-2_2-2_2-a_2-0_2-0_2-0_2-0_2-0_2-0_2-0_2-1_2-0_2-0_2-1_2-1_2-7_2-0_2-0_2-0_2-0_2-2_2-0_2-0_2-5_2-2_2-0_2-0_2-2_2-0_2-1_2-3_2-0_2-3_2-0_2-0_2-2_2-1_2-1_2-0_2-3_2-1_2-0_2-0_2-0_2-0_2-0_2-1_2-2_2-1_2-1_2-0_2-0_2-2_2-2_2-0_2-1_2-0_2-1_2-0_2-0_2-0_2-2_2-0_2-0_2-0_2-0_2-0_2-2_2-1_2-1_2-0_2-0_2-0_2-2_2-4_2-0_2-0_2-0_2-0_2-0_2-0_2-0_2-0_2-4_2-0_2-1_2-2_2-0_2-2_2-0_2-2_2-2_2-9_2-0_2-0_2-0_2-0_2-2_2-0_2-0_2-0_2-0_2-0_2-c_2-0_2-3_2-0_2-0_2-1_2-h_2-1_2-0_2-0_2-0_2-j_2-0_2-ib-n-m-m-0-1-ix_3-0_3-1_3-g_3-0_3-0_3-0_3-0_3-0_3-0_3-0_3-0_3-e_3-0_3-0_3-0_3-1_3-0_3-1_3-0_3-0_3-0_3-0_3-8_3-0_3-0_3-0_3-0_3-2_3-2_3-0_3-b_3-0_3-0_3-0_3-0_3-0_3-2_3-1_3-0_3-0_3-0_3-1_3-3_3-0_3-1_3-1_3-0_3-1_3-0_3-0_3-2_3-0_3-0_3-0_3-4_3-1_3-5_3-0_3-0_3-0_3-0_3-1_3-0_3-0_3-1_3-0_3-1_3-0_3-0_3-0_3-2_3-1_3-0_3-0_3-1_3-2_3-0_3-0_3-1_3-0_3-0_3-0_3-2_3-0_3-0_3-1_3-1_3-0_3-1_3-0_3-0_3-0_3-0_3-0_3-0_3-1_3-0_3-0_3-0_3-1_3-4_3-0_3-0_3-0_3-3_3-1_3-0_3-1_3-0_3-1_3-0_3-0_3-1_3-1_3-0_3-0_3-0_3-0_3-8_3-0_3-0_3-1_3-0_3-0_3-0_3-3_3-0_3-0_3-b_3-2_3-0_3-1_3-0_3-0_3-i_3-1_3-0_3-1_3-0_3-i_3-0_3-0_3-iz_2-m_2-0_2-m_2-m_2-2_2-iw-0-0-0-i-0-1-0-0-0-0-f-1-1-0-0-1-0-0-9-0-0-0-2-2-0-1-0-1-7-1-0-0-0-2-0-0-1-0-0-0-0-1-0-0-3-0-0-0-0-0-1-0-0-0-0-0-2-0-0-0-2-1-0-0-0-2-0-0-2-1-1-2-0-1-1-0-0-1-1-0-0-0-0-3-0-0-1-2-0-0-1-0-1-0-1-0-0-0-0-0-0-0-0-0-2-2-0-3-0-1-0-0-0-0-0-0-0-1-1-0-0-0-8-0-2-0-0-1-0-0-2-0-a-0-0-0-1-0-0-1-0-g-0-0-0-0-0-0-i-1-ib_3-n_3-0_3-l_3-0_3-o_3): a battle of 3 colours whose red ends as this glider, from generation 171).

- **3 cells on each face** (1 alive, 2 dying), the two faces of the same 3 pentagons, mirror images across the fold: 6 cells in all.
- **Period 3**, moving **2 squares of the Cairo grid** along the edge each period (speed 2/3).
- It runs round the edge, a single closed curve twice the strip's length (2 × 109 = 218), so the whole loops with period **327** = 218 × 3 / 2.

The plane's Cairo Wars glider has 9 cells and period 2; this one exists only because a cell of the edge has its twin on the other face as a neighbour, as a mirror would: it is half of a symmetric glider, flying along the mirror. On a plane or a torus it has no edge to run along.


## 🐝 Hexagonal rules that behave like Life

Life (B3/S23 on squares) has two marks: a soup thins out slowly, over hundreds of generations, before it settles into still lifes and blinkers; and a small random start mostly dies, but now and then grows into a cloud many times its size before it calms down. The hexagonal rules offered lack the first: Callahan's Life (B2o/S2m34) settles within ~50 generations where Life takes ~600, and its small starts never grow.

All the 2-state rules B ⊂ {2…6}, S ⊂ {0…6} (3,328), then 2,229 random ones with Callahan's letters (o side by side, m one apart, p opposite), were run on 35 % soups (48 × 48 and 64 × 64 tori, 3 seeds, up to 3,000 generations) and on 40 random 6 × 6 starts (50 %, a 64 torus, 800 generations), then searched for spaceships (3,000 small random starts each). None of the plain ones grows from a small start as Life does; two with letters do:

| Rule | Soup (% alive at gen 10 / 50 / 100 / 300 / 1,000) | Settles | 6 × 6 starts: median life · ≥ 300 gens · ≥ 5× bigger · biggest | Spaceships | Try it |
|---|---|---|---|---|---|
| B3/S23 on squares (Life) | 22 / 11 / 9 / 6 / 6 → 3 % | gen 460–1,530 | 48 · 8/40 · 11/40 · ×23 | glider, period 4 | |
| B2o/S2m34 (Callahan) | 14 / 4 / 4 / 3 / 3 % | gen ~50 | 23 · 6/40 · 0/40 · ×3 | period 4, 6 cells | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2o/S2m34&s=64&sd=random.35.7) |
| **B2om5/S2om4o** | 23 / 15 / 14 / 11 / 5 → 3 % | gen 1,900–3,000 | **72 · 6/40 · 9/40 · ×22** | none found | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2om5/S2om4o&s=64&sd=random.35.7) |
| **B2op3m/S12mp3p4p5** | 28 / 17 / 13 / 14 / 4 % | never (ships fly on) | 31 · 13/40 · 12/40 · ×41 | period 8, 9 to 16 cells | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2op3m/S12mp3p4p5&s=64&sd=random.35.7) |

B2om5/S2om4o is the closest to Life in its figures: a soup that thins out the same way and settles as late, small starts that live as long and blow up as often and as far. B2op3m/S12mp3p4p5 is wilder: its starts last longer and grow more, and it has period-8 spaceships, so a soup on a torus never quite settles.

**With dying states, for gliders.** Life sends gliders out of most messes; on hexagons, Swarm far less. All the rules B ⊂ {2…6}, S ⊂ {0…6} with 3, 4 or 5 states (11,904) were run on 35 % soups (a 32 torus, 600 generations); the 567 that neither filled up nor died fast were given 40 random 8 × 8 starts (40 %, a 64 torus), counting the spaceships (4 live cells or more, the same shape moved) among what is left at generation 200; the best checked again (120 starts, soups on a 64 torus, 3 seeds, 2,000 generations). A family stands out, **B2…/S134/C5** (3 dying stages): more gliders than Life.

| Rule | Spaceships a start | Starts 5× bigger | Soup (% alive at gen 10 / 50 / 100 / 300 / 1,000) | Its spaceships (800 small starts) | Try it |
|---|--:|--:|---|---|---|
| B3/S23 on squares (Life) | 1.23 | 16 % | 22 / 13 / 12 / 6 / 4, settles at gen 470–1,540 | the glider | |
| B2op3m/S12mp3p4p5 (Swarm) | 0.13 | 32 % | 29 / 18 / 17 / 10 / 14, never settles | period 8, 12 to 16 cells | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2op3m/S12mp3p4p5&s=64&sd=random.35.7) |
| **B2345/S134/C5** | **2.53** | 27 % | 17 / 10 / 5 / 2 / 0.4, gliders fly on | period 2 (6 live + 6 dying) ×64, period 4 (8 to 10 cells) ×96 | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2345/S134/C5&s=64&sd=random.35.7) |
| **B23/S134/C5** | 1.92 | 12 % | 19 / 9 / 4 / 0.6 / 0.6 | the same ships | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B23/S134/C5&s=64&sd=random.35.7) |
| B23456/S134/C5 | 2.77 | 27 % | 16 / 6 / 2.5 / 3 / 0.2 | the same ships | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B23456/S134/C5&s=64&sd=random.35.7) |

They send out gliders as often as Life, or more, and their small starts grow as often; but their soups thin out faster (2 % alive at generation 300 where Life keeps 6 %), down to a few gliders flying on for ever.

**A puffer in Comets.** Seen in a battle on the hexagon sphere, then found among 300 random starts: 16 cells, `A.A$A.2A$2.A.A$5A$3.2A$3.2A!`, that fly at half speed (50 cells every 100 generations) leaving a trail of debris behind, as Life's puffer trains do: 146, 320, 438, 576 cells at generations 100 to 400 on a 400 torus, before its front comes round ([play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2345/S134/C5&s=128&sd=draw&p=64,64:A.A$A.2A$2.A.A$5A$3.2A$3.2A!)).

<br>

<p align="center">⁂</p>

<br>

## 🪁 Life on kites: a search with dying states

Kites (each triangle cut in 3, 9 neighbours: 4 by an edge, 5 by a corner). 27,648 rules were tried: B starting with 2 or 3 and up to 3 digits up to 7, S up to 4 digits, 2 to 5 states (C). Each from a soup at 35 % on a torus of 1,536 kites, up to 1,500 generations; 190 kept, those that left 0.5 to 8 % alive after 250 generations or more. Then 36 small starts each (3 rows × 3 rhombi at 50 %) on a torus of 3,456 kites: what they leave was run alone, a ship if it came back moved, an oscillator if in place. 7 rules sent out ships without exploding; the best checked again with 180 starts on a torus of 6,144 kites.

| Rule | States | Soup (torus of 9,600 kites) | Ships | Notes | Links |
|---|--:|---|---|---|---|
| **B35/S123/C5** (Kite swarm) | 5 | never settles, ~7 % alive at 4,000 | a glider of 9 cells, period 6, the most frequent by far (371 seen) | gliders everywhere, in the 6 directions | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S123/C5&s=64&sd=random.30.7) · [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S123/C5&s=48&sd=draw&p=54,8:4.B3.B2.B$.B.BA.B2A!) |
| **B35/S2356/C4** (Kite drifters) | 4 | settles at 1,000, 1.7 % alive | 9 cells, period 26 (13 seen) | the most Life-like; a methuselah of 9 cells loops from 1,681 | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S2356/C4&s=64&sd=random.30.7) · [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S2356/C4&s=48&sd=draw&p=54,8:10.C3.B2.C$3.A2.A.2A3.BA!) |
| **B36/S1258** (Kite gliders) | 2 | settles at 336, 2.1 % alive | 4 cells, period 16 (22 seen) | the smallest glider | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B36/S1258&s=64&sd=random.30.7) · [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B36/S1258&s=48&sd=draw&p=54,8:11.A$4.A2.A3.A!) |
| B36/S125 | 2 | settles at 425, 1.4 % | 4 to 6 cells, period 16 | as B36/S1258 | |
| B367/S127 | 2 | settles at 227, 1.1 % | 4 cells, period 16 (rare) | | |
| B35/S2368/C4 | 4 | settles at 185, 2.3 % | 13 cells, period 22 | | |
| B247/S578/C4 | 4 | never settles, ~11 % alive | 16 cells, period 4 | too dense | |
| B3/S235/C3 (Kite Life) | 3 | settles at 962, 2.4 % | none in 900 starts | | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B3/S235/C3&s=64&sd=random.30.7) |

**A second search: a chaos that lasts, as Life's.** Kite drifters has Life's figures (settling time, ash) but not its life: its soups thin out steadily from the start, where Life's drop at once to ~7 % and stay there a long while (a plateau), then end at very different times, with oscillators in their ash. Each soup's live share was followed (tools/kitesearch, traces.js and rank.js): 12 soups of each of 1,870 rules (stage 1's that settle with a little ash) on a torus of 3,456 kites, up to 6,000 generations; scored against Life measured the same way on a 59 × 59 torus (HighLife scores 0.65; the kite rules above, 0 to 0.03). The plateau: the live share at generation 800 over the one at 200. None of the 60 best sends ships, but Kite gliders: on kites, a lasting chaos and ships do not seem to go together.

| Rule (24 soups, a torus of 9,600 kites) | Settles | Spread (sd of log) | Plateau | Alive at 200 | Ash | Ends with oscillators | Links |
|---|---|---|---|---|---|---|---|
| Life (98 × 98 squares) | 417 to 4,974 | 0.62 | 0.59 | 7.2 % | 2.9 % | 100 % | |
| **B346/S0127/C4** (Kite simmer) | 459 to 1,558 | 0.31 | 0.61 | 7.4 % | 4.2 % | 71 % | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B346/S0127/C4&s=64&sd=random.30.7) · [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B346/S0127/C4&s=48&sd=draw&p=54,8:6.A$.A4.A!) (a 3-cell oscillator, period 16) |
| **B34/S0126/C5** (Kite marathon) | 1,398 to over 6,000 | 0.42 | 0.73 | 9.8 % | 4.5 % | 38 % | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B34/S0126/C5&s=64&sd=random.30.7) · [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B34/S0126/C5&s=48&sd=draw&p=54,8:7.A$.A4.A!) (3 cells, period 20) |
| B367/S0128 | 1,042 to 3,701 | 0.34 | 0.53 | 13.3 % | 3.2 % | 8 % | |
| B35/S2356/C4 (Kite drifters) | 667 to 4,304 | 0.35 | 0.21 | 15 % | 1.8 % | 4 % | |

Draw's patterns for the kites' rules, from 720 small starts each (a methuselah: up to 10 cells, its loop on a torus of 13,824 kites); every one checked in the 12 ways it turns and mirrors:

| Rule | Pattern | RLE (6 kites a rhombus) | Does | Link |
|---|---|---|---|---|
| Kite Life B3/S235/C3 | Oscillator | `14.A2.A$3.A2.A.B4A.A$6.A!` | period 12 · 11 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B3/S235/C3&s=48&sd=draw&p=54,8:14.A2.A$3.A2.A.B4A.A$6.A!) |
| | Oscillator | `10.2A$6.A2.B$.A.A2.A!` | period 3 · 7 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B3/S235/C3&s=48&sd=draw&p=54,8:10.2A$6.A2.B$.A.A2.A!) |
| | Methuselah | `.A2.A.A3.2A$.2A2.2A4.A!` | loops from generation 771 · 10 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B3/S235/C3&s=48&sd=draw&p=54,8:.A2.A.A3.2A$.2A2.2A4.A!) |
| Kite gliders B36/S1258 | Glider | `11.A$4.A2.A3.A!` | flies, period 16 · 4 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B36/S1258&s=48&sd=draw&p=54,8:11.A$4.A2.A3.A!) |
| | Oscillator | `3.A.2A$A.A2.A!` | period 6 · 6 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B36/S1258&s=48&sd=draw&p=54,8:3.A.2A$A.A2.A!) |
| | Methuselah | `A.A2.A.A2.2A$2.A3.A2.2A!` | loops from generation 744 · 10 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B36/S1258&s=48&sd=draw&p=54,8:A.A2.A.A2.2A$2.A3.A2.2A!) |
| Kite swarm B35/S123/C5 | Glider | `4.B3.B2.B$.B.BA.B2A!` | flies, period 6 · 9 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S123/C5&s=48&sd=draw&p=54,8:4.B3.B2.B$.B.BA.B2A!) |
| | Oscillator | `4.A3.A$4.A$6.A!` | period 5 · 4 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S123/C5&s=48&sd=draw&p=54,8:4.A3.A$4.A$6.A!) |
| Kite drifters B35/S2356/C4 | Spaceship | `10.C3.B2.C$3.A2.A.2A3.BA!` | flies, period 26 · 9 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S2356/C4&s=48&sd=draw&p=54,8:10.C3.B2.C$3.A2.A.2A3.BA!) |
| | Oscillator | `10.A3.A2.A$4.2A4.2A.2A$A6.A!` | period 4 · 11 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S2356/C4&s=48&sd=draw&p=54,8:10.A3.A2.A$4.2A4.2A.2A$A6.A!) |
| | Methuselah | `A10.A$.5A.A3.A!` | loops from generation 1,681 · 9 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S2356/C4&s=48&sd=draw&p=54,8:A10.A$.5A.A3.A!) |
| Kite simmer B346/S0127/C4 | Oscillator | `6.A$.A4.A!` | period 16 · 3 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B346/S0127/C4&s=48&sd=draw&p=54,8:6.A$.A4.A!) |
| | Oscillator | `8.A2.A$4.A$6.A!` | period 8 · 4 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B346/S0127/C4&s=48&sd=draw&p=54,8:8.A2.A$4.A$6.A!) |
| | Methuselah | `2.A4.A$3A.A5.A!` | loops from generation 321 · 7 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B346/S0127/C4&s=48&sd=draw&p=54,8:2.A4.A$3A.A5.A!) |
| Kite marathon B34/S0126/C5 | Oscillator | `7.A$.A4.A!` | period 20 · 3 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B34/S0126/C5&s=48&sd=draw&p=54,8:7.A$.A4.A!) |
| | Oscillator | `11.A$.A7.A2.A!` | period 10 · 4 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B34/S0126/C5&s=48&sd=draw&p=54,8:11.A$.A7.A2.A!) |
| | Methuselah | `2A5.A$.A.3A3.A!` | loops from generation 454 · 8 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B34/S0126/C5&s=48&sd=draw&p=54,8:2A5.A$.A.3A3.A!) |
| Long kites B3/S1247 | Oscillator | `10.A$6.A.A2.2A$A.A.A!` | period 5 · 8 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B3/S1247&s=48&sd=draw&p=54,8:10.A$6.A.A2.2A$A.A.A!) |
| | Methuselah | `7.A.2A$4.3A!` | loops from generation 157 · 6 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B3/S1247&s=48&sd=draw&p=54,8:7.A.2A$4.3A!) |

<br>

<p align="center">⁂</p>

<br>

## 🎩 Life on hats: the tile that never repeats

The hat (Smith, Myers, Kaplan and Goodman-Strauss, 2023), 8 kites, tiles the plane only without ever repeating; built here by substitution as Craig S. Kaplan's hatviz. A grid of side W is the W² hats nearest the middle (a square), the hats round them its walls; it cannot wrap round. Nearly all corners join 3 hats, so a hat has 6 neighbours on average (Euler): 6 or 7 inside, a few 4 or 5. Life B3/S23 dies at once.

17,604 rules (B: 2 or 3 and up to 2 more digits of 2…7; S: up to 4 of 0…7; 2 to 5 states) from one soup on 1,024 hats; 719 that settle with a little ash followed over 12 soups on 2,304 hats (tools/kitesearch hatsearch.js, traces.js, rank.js), scored against Life on 48 × 48 squares. The ash on hats is thin (under 1 %), but two rules have Life's lasting chaos:

| Rule | Settles | Spread (sd of log) | Plateau | Alive at 200 | Ash | Ends with oscillators | Link |
|---|---|---|---|---|---|---|---|
| Life (48 × 48 squares) | 301 to 2,265 | 0.57 | 0.63 | 8.6 % | 2.9 % | 100 % | |
| **B257/S367** (Hat bats) | 900 to 3,549 | 0.42 | 0.62 | 13.7 % | 0.8 % | 100 % | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHat&r=B257/S367&s=48&sd=random.30.7) |
| **B245/S134/C5** (Hat comets) | 521 to 3,699 | 0.70 | 0.77 | 6.3 % | 0.4 % | 44 % | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHat&r=B245/S134/C5&s=48&sd=random.30.7) |
| B256/S36 | 375 to 3,420 | 0.68 | 0.59 | 15.8 % | 0.8 % | 100 % | |

No pattern can be moved on hats (no two places alike), so Draw has only single cells there, and Famous none.

<br>

<p align="center">⁂</p>

<br>

## 🔭 More patterns for the first rules of each grid

A search in the app's own page (tools/famoussearch.js: its rules, Callahan's letters, its neighbours), for the first rules of each grid that had no ship: 1,500 to 2,000 small starts each (3 × 3 at 50 %, 2 × 2 at 40 %) on a torus; what they leave run alone. No new ship turned up for Life, Sparse and Brink on triangles, Life's twin and Long loops on hexagons, Cairo Life. New oscillators and a methuselah, each checked in the ways it turns and mirrors:

| Grid | Rule | Pattern | RLE | Does | Link |
|---|---|---|---|---|---|
| Triangles | Life B3/S23 | Oscillator | `.3A$.2A$3A!` | period 8 · 8 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTri&r=B3/S23&s=64&sd=draw&p=32,32:.3A$.2A$3A!) |
| Triangles | Life B3/S23 | Methuselah | `3A$.A!` | loops from generation 430 · 4 cells (the same on tori of 96 and 128) | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTri&r=B3/S23&s=64&sd=draw&p=32,32:3A$.A!) |
| Triangles | Sparse B45/S345/C4 | Oscillator | `3.3A$2.A2B.A$.A.2BA$2.3A!` | period 4 · 14 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTri&r=B45/S345/C4&s=64&sd=draw&p=32,32:3.3A$2.A2B.A$.A.2BA$2.3A!) |
| Hexagons | Life's twin B2om5/S2om4o | Oscillator | `2.A$2.A$2A$.A$A!` | period 4 · 6 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2om5/S2om4o&s=64&sd=draw&p=32,32:2.A$2.A$2A$.A$A!) |
| Hexagons | Long loops B34/S123/C3 | Oscillator | `.A.A$A2.A$3A$2A!` | period 7 · 9 cells | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B34/S123/C3&s=64&sd=draw&p=32,32:.A.A$A2.A$3A$2A!) |
| Cairo | Cairo Life B34/S23 | Oscillator | `3.A.A$A2.2A$3.3A!` | period 4 · 8 cells, the most frequent | [play](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B34/S23&s=64&sd=draw&p=32,32:3.A.A$A2.2A$3.3A!) |

A lesson for methuselahs: a torus too small lets their debris and ships come round and start the chaos again. A 4-cell start of Life on triangles loops from 3,656 on a torus of 48 but from 430 on tori of 96 and 128; Kite gliders' and Kite drifters' methuselahs (744 and 1,681 on a torus of 48) send out ships, and run to 1,512 and 2,929 on a torus of 96: see below, all the methuselahs measured again.

<br>

<p align="center">⁂</p>

<br>

## ⏱ Methuselahs measured again, as Life counts them

A methuselah's lifetime, as Life's are given (the R-pentomino's 1,103, the Acorn's 5,206): the generation its debris settle, the gliders flying off left out. Measured in the app's page (tools/famoussearch.js, settleStart and settleRun) on large tori (squares 256, hexagons 192, triangles and Cairo 128, kites 64 rhombi), every 10 generations taking off a ship (a small group, run alone, that comes back moved) once it is out of the box of the rest and flying away; a start that reaches the grid's edges keeps spreading (it never settles there). It gives back the R-pentomino's 1,103 with 6 gliders and the Acorn's 5,206 with 13. The values before came from small tori, where ships and debris come round and start the chaos again: many changed, and those that keep spreading are now Seeds.

| Grid | Rule | Pattern | Before | Now |
|---|---|---|---|---|
| Squares | Life | R-pentomino | 1,103 | settles at 1,103, 6 gliders off |
| Squares | Life | Acorn | 5,206 | settles at 5,206, 13 gliders off |
| Squares | Life | Diehard | dies at 130 | dies at 130 |
| Squares | Day & Night | Methuselah | loops from 219 | settles at 219 |
| Squares | HighLife | Methuselah | loops from 2,652 | keeps spreading (the edges of 256 × 256 at 990) |
| Squares | Brian's Brain | Methuselah | loops from 2,595 | keeps spreading |
| Squares | Star Wars | Methuselah | loops from 3,739 | keeps spreading |
| Squares | Maze | Methuselah | settles at 430 | keeps spreading |
| Hexagons | B2/S34 | Methuselah | loops from 254 | settles at 254 |
| Hexagons | Brink | Methuselah | settles at 3,448 | settles at 1,810 |
| Hexagons | Callahan | Methuselah | loops from 352 | keeps spreading |
| Hexagons | Few | Methuselah | settles at 3,795 | keeps spreading |
| Hexagons | B234/S1234 | Methuselah | loops from 2,193 | keeps spreading (fills the grid) |
| Hexagons | B234/S234 | Methuselah | loops from 2,885 | keeps spreading (fills the grid) |
| Hexagons | Swarm | Methuselah | dies at 874 | keeps spreading |
| Hexagons | Comets | Methuselah | dies at 400 | breaks at once into 2 ships |
| Hexagons | Life's twin | Methuselah | loops from 1,217 | keeps spreading |
| Triangles | Life | Methuselah (19 cells) | loops from 1,166 | settles at 1,166 |
| Triangles | Life | Methuselah (4 cells) | loops from 430 | settles at 430 |
| Triangles | Brink | Methuselah | settles at 4,089 | keeps spreading |
| Triangles | Sparse | Methuselah | settles at 1,847 | settles at 733 |
| Cairo | Cairo gliders | Methuselah | loops from 2,901 | keeps spreading |
| Cairo | Cairo Wars | Methuselah | settles at 1,338 | keeps spreading |
| Cairo | Long Cairo | Methuselah | loops from 3,997 | keeps spreading (fills the grid) |
| Kites | Kite gliders | Methuselah | loops from 744 | settles at 110, a glider off |
| Kites | Kite drifters | Methuselah | loops from 1,681 | settles at 799, a ship off |
| Kites | Kite Life, simmer, marathon, Long kites | Methuselahs | 771, 321, 454, 157 | the same |

<br>

<p align="center">⁂</p>

<br>

## 🧩 Nine more tilings: rules and patterns

Nine 2D tilings built from their geometry (tools/tilings/build.js): Archimedean ones from a lattice and its points (edges between points 1 apart, faces by walking round them), the Laves ones as their duals (a cell a vertex, its corners the middles of the faces round it: the rhombille, floret and prismatic pentagons, tetrakis, kisrhombille; the rhombitrihexagonal's dual gives back the kites, 9 neighbours: the check), the Pythagorean and Capital I tilings from unit squares. Each checked: one lattice cell's polygons fill it, edge to edge. Neighbours (edge or corner): rhombille 10, rhombitrihexagonal 6 / 8 / 12 (triangles, squares, hexagons), floret 8, snub trihexagonal 9 / 18, Capital I 6, Pythagorean 4 / 8, prismatic 7, tetrakis 14, kisrhombille 16.

On each, up to 103,448 rules (B: 2, 3 or 4 and up to 2 more digits; S: up to 4 digits; 2 to 5 states; counts up to 9) from one soup on ~1,500 cells; those settling with 0.5 to 8 % alive after 250 generations or more followed over 4, the best 40 over 12 soups on ~3,500 cells (tools/tilings/search.js), scored against Life (1 for Life; HighLife 0.65). Then each rule's patterns from 600 small starts in the app's page (tools/famoussearch.js), its methuselahs measured as Life counts them.

| Tiling | Rule | Score | Settles | Plateau | Alive at 200 | Ash | Ends with oscillators | Patterns | Link |
|---|---|--:|---|--:|--:|--:|--:|---|---|
| Life (59 × 59 squares) | B3/S23 | 1 | 350 to 3,200 | 0.47 | 7.5 % | 3.2 % | 100 % | | |
| Rhombitri | **B279/S069/C4** | 0.565 | 640 to 3,700 | 0.53 | 6.5 % | 1.7 % | 100 % | oscillator period 12 · 3 cells; methuselah 3,210 | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dRhombitri&r=B279/S069/C4&s=48&sd=random.30.7) |
| Snub | **B38/S1369** | 0.41 | 550 to 1,900 | 0.40 | 6.9 % | 1.6 % | 92 % | methuselah of 12 cells: 2,497 | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dSnubtri&r=B38/S1369&s=48&sd=random.30.7) |
| Tetrakis | **B37/S1** | 0.38 | 470 to 6,000+ | 0.54 | 6.5 % | 1.3 % | 67 % | methuselah of 10 cells: 4,016 | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTetrakis&r=B37/S1&s=48&sd=random.30.7) |
| Prismatic | **B25/S157/C5** | 0.30 | 400 to 3,200 | 0.71 | 5.0 % | 2.1 % | 100 % | a ship of 14 cells at light speed (a cell a generation), very common | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dPrismatic&r=B25/S157/C5&s=48&sd=random.30.7) |
| Florets | **B26/S3578/C3** | 0.30 | 320 to 2,100 | 0.48 | 6.7 % | 0.5 % | 100 % | oscillator period 3 · 4 cells | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dFloret&r=B26/S3578/C3&s=48&sd=random.30.7) |
| Kisrhombille | **B356/S6789/C5** | 0.28 | 180 to 1,430 | 0.59 | 7.5 % | 3.4 % | 100 % | oscillator period 60 · 38 cells | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKisrhombille&r=B356/S6789/C5&s=48&sd=random.30.7) |
| Pythagoras | **B28/S28** | 0.13 | 430 to 4,400 | 0.47 | 11.3 % | 0.6 % | 100 % |  | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dPythagorean&r=B28/S28&s=48&sd=random.30.7) |
| Rhombille | **B367/S015** | 0.11 | 360 to 1,050 | 0.34 | 11.6 % | 3.8 % | 100 % |  | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dRhombille&r=B367/S015&s=48&sd=random.30.7) |
| Capital I | **B345/S0236** | 0.01 | 180 to 410 | 0.48 | 10.1 % | 4.5 % | 92 % | nothing near Life with 6 neighbours | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCapitalI&r=B345/S0236&s=48&sd=random.30.7) |

**Penrose's rhombi** (P3, aperiodic: walls only, as the hats; built by cutting Robinson triangles, 7 to 11 neighbours inside), the same search: **B39/S0239** scores 0.50 (settles 250 to 2,200, plateau 0.37, 8.7 % alive at 200, ash 2.4 %), and **B3/S023**, Life with lone cells surviving, 0.44 (settles 170 to 1,460, ash 2.2 %, oscillators in 75 % of the ends) ([soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dPenrose&r=B3/S023&s=48&sd=random.30.7)). No pattern moves on them: no Famous. **The Spectre** (aperiodic too, never turned over; built by its supertiles as Kaplan's code; 6 or 7 neighbours inside, as the hats), the same search: **B25/S357** scores 0.12 (settles 370 to 1,750, ash 1 %, oscillators in every end), **B23/S036/C4** 0.05 (a plateau of 0.79 at 5 % alive); Hat comets B245/S134/C5 runs on it from 720 to over 6,000 generations ([soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dSpectre&r=B25/S357&s=48&sd=random.30.7)).

The second rule of each (Long florets B24/S456/C4 with a ship of 12 cells, period 5; Long prisms B245/S16/C5, the light-speed ship too; Long rhombitri, Snub embers, Pythagoras sparks, Rhombille sparks with a ship, Tetrakis embers, Long kisrhombille) and all their patterns are in Draw and Famous.

<br>

<p align="center">⁂</p>

<br>

## 🌙 A night's search: methuselahs, a ship, tori, battles

**Methuselahs of the nine tilings**, searched again in Deno (tools/tilings/meths.js): 9,000 small random starts a rule (2 × 2, 3 × 2 and 2 × 3 lattice cells) on a small torus, the 48 longest-lived of 12 cells or fewer measured as Life counts them (tools/kitesearch/engine.js, settle: a big grid, the ships flying off taken away; it gives back the app's own measures to the generation), each checked again in the app's page (tools/famoussearch.js). In Draw and Famous now:

| Tiling | Rule | Before | Now |
|---|---|---|---|
| Tetrakis | Tetrakis Life B37/S1 | 1,527 · 8 cells | **4,016 · 10 cells** |
| Rhombitri | Rhombitri Life B279/S069/C4 | 529 · 8 cells | **3,210 · 10 cells** |
| Snub | Snub Life B38/S1369 | 1,411 · 10 cells | **2,497 · 12 cells** |
| Rhombitri | Long rhombitri B29/S067/C4 | 310 · 9 cells | **2,369 · 8 cells** |
| Rhombille | Rhombille sparks B358/S0237/C4 | 856 · 5 cells | **1,588 · 8 cells** |
| Florets | Floret Life B26/S3578/C3 | 207 · 10 cells | **1,566 · 9 cells** |
| Tetrakis | Tetrakis embers B3/S278 | none | **710 · 7 cells** |
| Kisrhombille | Long kisrhombille B38/S169/C3 | none | **463 · 9 cells** |
| Snub | Snub embers B359/S0146/C3 | none | **390 · 10 cells** |
| Kisrhombille | Kisrhombille Life B356/S6789/C5 | none | **310 · 12 cells** |

None for the rules with a birth on 2 (Prismatic Life, Long prisms, Long florets, Pythagoras Life and sparks): their small starts that last all keep spreading (to the edges of a 200-cell-wide grid); nor for Rhombille Life and I Life, whose small starts all settle within 100 generations. **Rhombille sparks** has a ship too, the rhombille's first: 28 cells, period 4, two lattice cells a 4 generations along a diagonal (found once in 6,000 starts; flies every way it turns or mirrors). **Pythagoras Life** (B28/S28) has one too, though no small random start on the plane gave it: 5 cells, period 2, a lattice cell every 2 generations, seen flying at generation 349 of a Trio on the [torus](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=lifeTorusPythagorean&r=B28/S28) (flies every way it turns; in Draw and Famous).

**Tori of the new tilings** (Life, under Torus, after the kites): rhombille, rhombitri, florets, snub, Pythagoras, prismatic, tetrakis, kisrhombille, each from a cell of its lattice with sides at right angles (the hexagonal ones a rhombus and the next: a and 2b − a), so that its tiles stay even once rolled up. Their neighbours there are the plane's (checked, seams included), and their Famous lay on them and keep their periods; the ships come round. Capital I is not on one (its I not convex). E.g. [Rhombitri Life on a torus](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=lifeTorusRhombitri&r=B279/S069/C4), [Kisrhombille Life](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=lifeTorusKisrhombille&r=B356/S6789/C5). On the sheets, a pattern now lays only on cells of its own shape: before, the kites' Famous never laid on their torus, Möbius strip or Klein bottle, and a few laid crooked.

**Hunt the longest battle**, ten minutes each in the app (Wild, the hunt's own score: long, close and even):

| Grid | Rule | Colours | Tried | Battle | Link |
|---|---|---|--:|---|---|
| Squares 48 | Life | Duel | 1,548 | 2,569 generations, 1,152 in contact, balance 0.98, no winner | [battle](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B3/S23&k=2&s=48&sd=random.30.448215084&ch=3.QFFVEFEVoKAqAAggUQEAUVRFoAKigCgCEQVVBVEAIKKqiqKIBERREUFFgKKqqCCIFFRQBUFRKCqiiAIAQURUFUFEAIgKCoKiERVREBAUqKIioqiiFRURUBEEIIIKogooUABUEAVVqIiqACCKFVQVVVERqiCgqCKoVUEFVRQBgKgIqCAoVURERUABCKqgoIqqBFEEAFERoKgIoKqqVQVQFEUVCCKAoKqKFVFFQEEVIKCAoiioFRRUVABQggqoqogIEBRUABUQogKKAiqAQVUQRVFUCiKIoAKIBUEVRUQAogiggiCoRUFBAUVVIIAoiCiKAERFVBVRoooqCogiQVUAEAVQKoqCIIiAEUEFQUBFigooCCqCBRQQFBAFIIqIAKCoUUFARAQRKqgiqoiABRUVFUAVAqKKIKoKABUUEQFEAqKoAIqqVRUUEBREoKCqioICUFFUAARQgogIKgqiAQVVFRBAqAiqCqiiQEEBVBABKIiIAioqBFRRUBFFKKIqogAiBUVRQVAQqgIKgIAiEVEFQQQRiiAIioAIBVRBARQBqigCqKKKFVVEAVVFogiqiqgARUQVQBEFoCCoKiggBREQUUURgioAIqggFQQFAAVRqgIiqoiqFQRBBVUFoqqKIKoKFEBFQQQBoIAgIoKKEFQQVRRBKiiqoqIiRBUVEVARooICgKIIUQVUUBQQCiqiiKqiRFEVAVBVgioCCIioVRFEEQFQIiigiqKCRQAEFUQEqKCoKgKqVUVABEVBCgioqKgo) |
| Squares 48 | Life | Quartet | 1,452 | 1,561 generations, 1,042 in contact, balance 0.69 | [battle](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B3/S23&k=4&s=48&sd=random.30.448215084&ch=5.ERAQAQEREBEREBERAiACIiIiAiACIiACEREAEAAAEQEBEBERIAAiIiAiACAAAgIgAREBABAREAEQABAQICICAiAgAAIgICACEREAEBERABERAAEBAgAgAAAiICIiICICEREBEREBARAREBERAiICAiAAICIgICAgEQABEREQERAAEQERIgIiICIiAiICAiAAAREBEBEQAQAREREQAgIgICIgIiIiIAACEREQEQARAREAAAERIgACIiIgIiIiICIgEREQABAREQAREREBIgIiAiIiAiIiAgICEREAAAEAAQAQERARAiIiAAICAAIgAiAiERARABAAEAEBEQEBIiAiIiIiAiAiAiIiEREBAAERERERERERAAIgIgIgIgICAAIAEQEQEBEAARAQEQABAiIgIgICACIgICIAAQEAEQARAQEBERARACIgACACAAIiAgIiEBEBEREQEREQEREAICACIiACIiIgICIiEQEAEBAREREREBERIiICACIAIAIiIgACEBEREQAREQERARERIiAgIiIiICAiIiAAEBEREQEBABEBEAABICAiAgIgACAAAiIiAREBEAEBERERAREBAAICIiIAIgIiACIgEQEBEQEBEBABAREQACIAIiAgIgIgACIiERERAREBEBAQEQERIiAiIAIiAiIiAiICAQEAEREQEBEQARERACAgICIAIiIiICICEBEREQERAQEREQAQACAgIgIiAiICICAiEAEBEQEQEBEREREAAiIiIiIiIiACIiIiADMzAAAzMDAzAzAARAQEQEREAAAEQEBEMAMwADMzMAMAADAzBEREAEQABAQEBEREMAADADMAMzADMzMAAARERERAREREBARAMzMzAzMwMDAzMAADBARABEAEAERAQEREMzMwMwMwADMAADMARAQERAAAQEQAQEAEAzMzADAwMzMDMDMDREQEBEQEREREREQEMzMwMzAwMzADMAMzQEBERAQERAREAEBAAzMwMzMwMwAzMAMzRERAQAQABABEREREAzMAAAMDMwMzAzMzQAQEQABEBEAEQEREADMzMAMzMAMzMzMwQEAERABERAAAQEREMzMzADMwADMwAzMwRAREBEBEREQEQAQEMDMDMDMwMzMAAzAzAEBEREREQERARAQEMzMDMDMDMwMwADMDRAAEQARAQEAERABEMwMAMDAzMzAAAzMAREREREQEREBEBEQEAzAzMzMAAzAzAwAwAEBEBAQEQAREBARAMwMDAwMzMAMwMzAAQEBEBEQAREQEBEAAMzAzMDMwMzAwADAzAEBAAERERARAAAREMAMDMwMzADAzMzAzQEAEREREREREAEREMzADAzMAAwMwMwMDQEREBEREAEQAQEBEAzAzMDADMzMzMzMDQABAAAREAEBAREBAMzMDMDMwMAMzMwADRAQAQABEAEREREQEAwADAwMwAzAwMwAzBEBEQAQEAEQAQAREMwAzAzMzMzMwMDMzREAAQEBEBEQABEQAMzMDMDAzAwMzAwMzREBEBEQEAEQEREBE) |
| Triangles 34 | Life | Duel | 1,917 | 1,945 generations, 1,065 in contact, balance 0.80 | [battle](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTri&r=B3/S23&k=2&s=48&sd=random.30.448215084&ch=3.AAFEAFAAAEQlIiACKgCKKIgEQQAARRUBECCCCAKAAAACABBBFFEVEBAEICKAiAgIAoAoFABBAAAUAVAgCAoAICIAgAIFRUUAAABABIEqgiCAAiiIgEAFVAAFEFFEIAAKIAAgigiIQFEAARABAACgiACgKoAggCJRUUBAVEEUBAQACKoAoiAoIARFBEEARUAFhIgAIIAIAAiABEQQAEAAQQGAAgiAAIKAiCBBAFFAAUBABIAgKKoigIAIgEUBBRUQABABIQCIAgqoIIICFREEQBFBAUEgAgCKAiogiAgFBFABUAQUBIEICgAIoCIKCFABQEEEAFAUAAoAKKgCAIAABEBAEAUQFQAFqiAKKAioIKoBQAQBRBEFAAAKKCgoogCIIgFAAEBUEUEABCCqIACCCACAEEVAEQQBARABgAIgiAAogAIAQFAEFAEBACGAIAIgAACCCARRFFUVQEAABQAAIIACCIAIAEQQBUBQAQUAoACKAAAKiIAAABBEAQURUYQICAiIAAAAgAABBRBEAAQFgCqCCoCoCCgABAAEVVEUQAQAAIKIAIIAACAREEAQBVVBRCACAAiiCgKAChAAQAARAQBABCIAAACiKIigAAURRAUEQEQAAgAACigKCAIQUAAAQUREEACAKAACgioKIAEAUBAEFAEAgCAIogiCCAgAEEBAFUQERBAgCIAIAqKAIgJEBEABAAVUBCQAAAAICioAoBQUFAQFRUUAgIACCICgIgoKRBUAFAAEUVAkCKIAIoACAIA) |
| Kites 20 | Kite drifters | Duel | 721 | 1,426 generations, 1,231 in contact, balance 0.90 | [battle](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dKite&r=B35/S2356/C4&k=2&s=48&sd=random.30.448215084&ch=3.BBAQABAQAQQAEAARAEBBAAoAAAAAiAgAgAIAAogCAAFVRAQEUAAAAEARAAUAgIgiIAICAACgCoAAAgCgAAUBAAUARVQFAUBQEBAAiAgogAKAAAAAAAgAAIgCEAAEAEAAAQABQAAQAAQACCAAAgAgAAgAiiAIAAoCAQAAUQUAAAAQAABQBAABAIAACAiCKAAgAIIIAAACABEABBQAAARAAUBAABABCgAAKIgIAggCAAACCCCIUBQBEAEBAUAAEQEBQAABCCiCCKIgCAAAAgAAKgqqAQBAQFAAEABEAAAAUAABiIAAoCgKAAAgCCCIIoIAAAAAAEUAVAAAUBEQAAAAAAgggIoCAAAogIACigAAQEAAQQAEEAAAVABEARBAAIACACCACCgiIAIAAqAABAAQEAQEEQQAAQAAAQAQiogAIoAgoKCCgAgIAAAgEAABQQAABBAAABQAFABBAAIoCAIgAAAAiigAoggiAFAEEAAQEAQQAFEAAAEAIAgCICgAAgIggogAAgAAAAABQAARFAQAQAAAAAEFggAAgAiIAIAACIKAgAIIAAEQQAAAEQFAAAAUAQABAggCIAiAICgAAAKAAgAKQBBAAAEBEFEAUAQAAAAUKAAIAggIKAgAoCACIAgiABBQBAUAABUBABAEAUAAAoiogAgAAAgAICAgKAAIAAFAABQBEQERQQRAAARAAoAgAgAAIiAAAAiAKAIAEABBEFAEAAEBAFQAAABQgAggAAAACAiAAKAgCAAARABRAEAQEAABABAAAEAEAAAAKgACKAiACACAAggC) |
| Hexagons 48 | Swarm B2op3m/S12mp3p4p5 | Duel | 398 | 959 generations, red alone from 956 | [battle](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dHex&r=B2op3m/S12mp3p4p5&k=2&s=48&sd=random.30.448215084&ch=3.BEBRARUEqoIooiIoEAEEFFQUIIiIgiKqVEAAREQRqICKoCqgQAVRBVFAAgoooCIKFFFUFRUUiAiiCqAiVUUUVEQQgKIoCIiARQUQEBAVKAgCgKiCRBRQAUBVKoACqAoIFEEFRVAAgiIqiKKgVUVREUUBCiKIqigKVBVABBFQoiKioAKoQBBRFVQRgoooqIqCQUEFUFBBCqCCqqqiQEBVQVBBCIoCoqCAUAEBRQRUoKgoKqgKQRVQVRQVIqIIoiKAQFRVEVAFIKiqKKICVBEFEQFAoCIKKqiIUFQFBBAAoqqgqgAKBQVFFUUQqIACAggiEUABQRBUggqAqICoUFFQAUUQiiKqqKKKEFQRBBQQgKKioKCqVURAVBEBKIigoiqAFVQVRQVVKqgCqKoqQBBRQUARoiqgoKCgEERVRAFVKgqAqCCqBVVRRBBQiCqiAAgqRVRERRFFAIqgoIIAVVVAFUFAioiKqCIKVVVQBRAEIIqqoqqCFVRFFVUEgqgKqAoCFBREAUAEqAogKKIIBVEVBEBFgqoAioqCABQQRBVFIgogKKAKFQEERUQAKoigCIIAFVAVFQRVCAAgoKqCRBFAEEERIiIiAqiAEBERQUUVKKqIqIgiAQABRAFEgKgIqIAqFERUREQRCKqgiCAoUEVFQQUBoKiiIACqRVBFEBAAAiIoCACqAUUURFVUoqoigAACFFQUBBBEAgqiqiAKRUVVUBUQqqqgKoqoBVUREARECiqoqICoEFQVBFERgiiAqAqK) |
| Cairo 34 | Cairo Wars B24/S346/C4 | Duel | 582 | 363 generations, red alone from 224 (one of 2,013, but a colour all but gone) | [battle](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCairo&r=B24/S346/C4&k=2&s=48&sd=random.30.448215084&ch=3.QERREQRRFUQkqiiiIIiIAqgBBQQARVVBQQECIKgCqKoqCkQFEFRQAREVACIIIIoqqoggQQQQRAAERAWgIiAiggggqChVVEEUBBQQRSUKiqAqACqAigURFFVRURVVBCqCqqoIIiACAERRBQREUFWlKIqKoAKooIBUQAVREAVBBAWqCACAICgiolFFBRURUEVUBYqqqoqqICAiEFBBREFQVBUkIigKqoqIiKBVQUFVRFQRECEiogIqqoCoohVUBVEVRRRBAICooqIIqoqgRBAVVEUFAFWEgiqqqAqICoJRFVVEUVRBUYSKgKqKKqAKqBQFAVEQRFFBIICiAiKooCKqBQUFUFFQFVWkAoAiKKigiqpFRFUVRRAUAaSAoIIggKoqCBFAQVEAEUBFBQoCKgKiAAqCFRFVQUFUQACFooAoiKIqgKIVQRFRBVEUECWIoKIoAgIKogEBVAUUBBRRAKiiqogioKgKFUUARFVUVRSgiKogKAIqoIBFVRARBRAFRaSKqqCoqoAIgEVBVFVEAAQQAKiCggogKqiCURQUQARVVBGFIggqqKqggqIFFAVERBQRAQWCiogCooKIigERRRQVRUQVoaqAoAigoqAIFVQBBRVUUFQgIiKqqiqKoCpQEVVEVQBFAQQoAiqioiKqglBQQUVARQBQIaiiIIqKiiCgBBEQEUQARUSFqKKIIIKKIqhFREFQURRERCEioqqgqKAqKlVUFFFABVFEgCIIgKoAIqIiAQRVERRAVUChIiqKqKgqCqg) |

<br>

<p align="center">⁂</p>

<br>

## ⬟ The 15th pentagon

The last convex pentagon found to tile the plane (Mann, McLoud-Mann and Von Derau, 2015, by a computer search; Rao's proof in 2017 that there are no more): angles 150°, 60°, 135°, 105°, 90°, sides 1, ½, ½, ½ and (√6 + √2)/4 ≈ 0.97, no freedom left. Built as MathWorks's construction (a block of 3, then 6, then 12 by a half turn; tools/tilings/build.js), checked: no gap nor overlap. It is not edge to edge (a corner can fall in the middle of another's side): those corners are added to the sides they lie on, so that the neighbours by a corner are all there: 6 or 8. Its lattice is a rectangle 4.1 times as long as wide, so the app's cell is 4 of them (48 pentagons, near a square). Patterns turn by a half turn, never mirrored (pgg). On a torus too.

| Rule | Score | Settles | Plateau | Alive at 200 | Ash | Ends with oscillators | Patterns | Link |
|---|--:|---|--:|--:|--:|--:|---|---|
| **Type 15 Life B247/S034/C4** | 0.52 | 270 to 2,600 | 0.64 | 6.6 % | 3.6 % | 83 % | a ship of 7 cells, period 24 (the same turned half way, at 12), common; an oscillator of 3 cells, period 8; a methuselah of 10 cells: 363 (2 ships off) | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dPent15&r=B247/S034/C4&s=48&sd=random.30.7) |
| **Type 15 classic B256/S67** (2 states) | 0.25 | 420 to 1,900 | 0.32 | 9.5 % | 1.3 % | 100 % | an oscillator of 2 cells, period 2; a methuselah of 8 cells: 1,277 | [soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dPent15&r=B256/S67&s=48&sd=random.30.7) |

Type 15 Life is the second most Life-like of all the tilings' rules, after Rhombitri Life (0.565).

**Stein's pentagon** (type 14, Rolf Stein, 1985: the only other convex pentagon that tiles with no freedom left; A = 90°, 2B + C = 360°, C + E = 180°, 2a = 2c = d = e), built as Jaap Scherphuis's Tiling Viewer builds it (6 a cell, each laid on another by a side; not edge to edge either, its corners on another's side added to it: 5, 6 or 7 neighbours). Its rules are far from Life (the most Life-like scores 0.07: few neighbours, soups settle within a few hundred generations): **Stein sparks B24/S0345/C4** (an oscillator of 4 cells, period 14; a methuselah of 11 cells: 420) and **Stein blinkers B34/S2357** (blinkers of 6 cells, period 2, and of 7, period 4) ([soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dPent14&r=B24/S0345/C4&s=48&sd=random.30.7)). Its lattice has no small cell with sides at right angles: no torus yet.

**The trihexagonal tiling** (3.6.3.6, the kagome: hexagons and triangles meeting at their corners; 12 neighbours a hexagon, 6 a triangle), the rhombille's dual: **Kagome Life B349/S0134/C5** (5 states: score 0.141, soups settling after 485 to 1,428 generations, 4.21 % alive at the end): an oscillator of 10 cells, period 5 and a methuselah of 6 cells: 355 ([soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTrihex&r=B349/S0134/C5&s=48&sd=random.30.7)); **Kagome embers B348/S0134/C5** (5 states: score 0.109, soups settling after 513 to 1,722 generations, 4.24 % alive at the end): an oscillator of 10 cells, period 5 and a methuselah of 9 cells: 498 ([soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTrihex&r=B348/S0134/C5&s=48&sd=random.30.7)).
**The truncated square tiling** (4.8.8: octagons and squares; 8 neighbours an octagon, 4 a square), the tetrakis's dual: **Octagon Life B278/S2** (2 states: score 0.13, soups settling after 359 to 5,735 generations, 0.57 % alive at the end): an oscillator of 2 cells, period 2 ([soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTruncsquare&r=B278/S2&s=48&sd=random.30.7)); **Octagon chimes B27/S28** (2 states: score 0.073, soups settling after 473 to 2,464 generations, 0.57 % alive at the end): an oscillator of 2 cells, period 2 ([soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTruncsquare&r=B27/S28&s=48&sd=random.30.7)).
**The snub square tiling** (3.3.4.3.4: squares turned 15° one way and the other, triangles between; 12 neighbours a square, 9 a triangle), Cairo's dual: **Snub square Life B359/S0148/C3** (3 states: score 0.31, soups settling after 265 to 1,638 generations, 4.75 % alive at the end): an oscillator of 4 cells, period 3 and a methuselah of 12 cells: 341 ([soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dSnubsquare&r=B359/S0148/C3&s=48&sd=random.30.7)); **Snub square fuses B367/S1289/C3** (3 states: score 0.253, soups settling after 350 to 1,924 generations, 2.43 % alive at the end): a methuselah of 12 cells: 1,715 ([soup](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dSnubsquare&r=B367/S1289/C3&s=48&sd=random.30.7)).

<br>

<p align="center">⁂</p>

<br>

## 🎲 Densities: how full a start should be

For each rule offered, 300 random starts at each density in a patch of radius 3 (squares 49 cells, triangles 73, hexagons 37, Cairo 47) on a 64 × 64 torus, up to 4,000 generations: the mean lifetime (generations before the run repeats), and in brackets the longest (4,000: still going at the cap). Dense starts last longer on average; the records often come from sparse ones, which mostly die at once.

| Grid | Rule | 10 % | 20 % | 30 % | 40 % | 50 % | 60 % | 70 % |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| Squares | B2/S | 2,721 (4,000) | 3,920 (4,000) | 3,987 (4,000) | 3,987 (4,000) | 4,000 (4,000) | 3,987 (4,000) | 3,987 (4,000) |
| Squares | B2/S/C3 | 106 (1,633) | 140 (2,532) | 207 (1,935) | 251 (2,718) | 220 (2,273) | 185 (2,131) | 143 (1,740) |
| Squares | B2/S345/C4 | 83 (4,000) | 64 (1,402) | 113 (4,000) | 163 (4,000) | 164 (2,800) | 204 (2,578) | 209 (4,000) |
| Squares | B3/S1234 | 29 (151) | 108 (152) | 132 (156) | 131 (150) | 130 (150) | 129 (144) | 129 (147) |
| Squares | B3/S12345 | 43 (296) | 137 (312) | 163 (338) | 164 (277) | 158 (302) | 157 (326) | 160 (307) |
| Squares | B3/S23 | 3 (324) | 78 (2,791) | 163 (3,348) | 228 (4,000) | 213 (2,533) | 218 (2,900) | 178 (3,153) |
| Squares | B36/S23 | 4 (529) | 62 (1,133) | 112 (1,774) | 128 (1,513) | 147 (2,123) | 150 (1,621) | 162 (1,936) |
| Squares | B3678/S34678 | 2 (8) | 4 (60) | 8 (62) | 14 (78) | 20 (136) | 25 (216) | 32 (123) |
| Triangles | B3/S23 | 134 (4,000) | 299 (4,000) | 350 (4,000) | 410 (4,000) | 392 (4,000) | 251 (3,776) | 196 (3,657) |
| Triangles | B34/S2/C4 | 56 (3,226) | 157 (3,600) | 225 (4,000) | 206 (4,000) | 245 (4,000) | 279 (4,000) | 182 (4,000) |
| Triangles | B45/S345/C4 | 30 (1,947) | 126 (4,000) | 450 (4,000) | 645 (4,000) | 690 (4,000) | 630 (4,000) | 507 (4,000) |
| Hexagons | B1/S0123456 | 39 (63) | 37 (63) | 35 (63) | 33 (63) | 33 (63) | 32 (63) | 31 (56) |
| Hexagons | B2/S24/C3 | 102 (4,000) | 202 (4,000) | 446 (4,000) | 272 (4,000) | 440 (4,000) | 406 (4,000) | 532 (4,000) |
| Hexagons | B2/S34 | 3 (27) | 9 (98) | 14 (62) | 18 (76) | 23 (209) | 26 (75) | 32 (88) |
| Hexagons | B234/S1234 | 541 (1,549) | 821 (4,000) | 841 (1,235) | 846 (1,309) | 846 (1,326) | 846 (1,248) | 835 (1,187) |
| Hexagons | B234/S234 | 345 (2,336) | 960 (2,051) | 1,073 (1,749) | 1,092 (1,947) | 1,103 (1,764) | 1,096 (1,819) | 1,080 (1,723) |
| Hexagons | B24/S134/C4 | 17 (539) | 60 (1,362) | 135 (3,599) | 110 (1,942) | 146 (4,000) | 149 (2,344) | 195 (2,893) |
| Hexagons | B24/S35 | 3 (24) | 8 (47) | 15 (79) | 18 (121) | 22 (80) | 26 (111) | 30 (102) |
| Hexagons | B2o/S2m34 | 2 (7) | 3 (22) | 8 (101) | 12 (84) | 20 (152) | 24 (211) | 33 (207) |
| Hexagons | B34/S123/C3 | 2 (31) | 7 (93) | 16 (84) | 28 (123) | 34 (175) | 36 (150) | 33 (131) |
| Cairo | B23/S6/C3 | 9 (904) | 19 (526) | 55 (1,716) | 108 (2,301) | 142 (4,000) | 142 (4,000) | 141 (3,081) |
| Cairo | B2347/S35/C3 | 164 (4,000) | 999 (4,000) | 2,106 (4,000) | 2,539 (4,000) | 2,686 (4,000) | 2,855 (4,000) | 2,768 (4,000) |
| Cairo | B24/S346/C4 | 6 (70) | 208 (4,000) | 716 (4,000) | 1,276 (4,000) | 1,862 (4,000) | 2,395 (4,000) | 2,966 (4,000) |
| Cairo | B34/S23 | 2 (12) | 5 (56) | 14 (87) | 24 (166) | 28 (148) | 33 (195) | 29 (216) |

## 🕯 Faders: 25 states

The rules may now have up to 25 states (23 dying stages; with colours, as many as a cell's byte holds: 22 for twelve). **Faders** (B2/S2/C25, Rudy Rucker and John Walker's, from MCell's collection; see [LifeWiki's Generations rules](https://conwaylife.com/wiki/OCA:Fireworks)) is on the squares: Life crossed with Brian's Brain, its sparks wandering in long fading trails. On a soup (128 × 128, 30 % alive) it stays lively, about 2 % of the cells alive and 30 % dying, still going after 3,000 generations. [Faders](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2d&r=B2/S2/C25&s=128).

## ☄ Trails: rules with many states on the tilings

With room for up to 25 states, a search on the tilings (tools/tilings/states.js): every B (2 or 3, and up to one more count) / S (up to two counts) / C (8, 12, 16, 25), one soup each on ~1,500 cells; the lively ones (0.3 to 8 % alive, 300 generations or more) given 150 small random starts (3 × 3 lattice cells) on ~4,000 cells, for the ships they leave. Long dying trails make ships common: a ship's back is shielded by its own fading cells. Six rules, one a tiling, each with its most common ship (the sparsest rules tried again with 120 of them: tetrakis's) (checked in the app: it flies every way its tiling turns or mirrors):

| Tiling | Rule | Its ship | How common | Soups |
|---|---|---|---|---|
| Prismatic | [**Prism trails** B2/S1/C8](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dPrismatic&r=B2/S1/C8&s=48&sd=random.30.7) | period 4 · 5 live cells and 18 dying | 412 of the 436 ships of 150 starts | break up into them within a hundred generations |
| Rhombille | [**Rhombille trails** B2/S28/C8](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dRhombille&r=B2/S28/C8&s=48&sd=random.30.7) | period 3 · 3 live and 26 dying (3 kinds) | 125 of 314 | simmer for thousands of generations, then end in ships going round |
| Capital I | [**I trails** B2/S24/C8](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dCapitalI&r=B2/S24/C8&s=48&sd=random.30.7) | period 3 · 4 live and 10 dying | 19 of 21 | end in ships within a few dozen generations |
| Pythagoras | [**Pythagoras trails** B23/S13/C8](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dPythagorean&r=B23/S13/C8&s=48&sd=random.30.7) | period 2 · 3 live and 9 dying (13 kinds) | 23 of 102 | end in ships within a few hundred generations |
| Type 15 | [**Type 15 trails** B24/S13/C12](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dPent15&r=B24/S13/C12&s=48&sd=random.30.7) | period 14 · 5 live and 24 dying (5 kinds) | 53 of 218 | end in ships within about 150 generations |
| Tetrakis | [**Tetrakis trails** B34/S23/C12](https://vincentbounce.github.io/Walking-Pi/#x=pi&w=life2dTetrakis&r=B34/S23/C12&s=48&sd=random.30.7) | period 3 · 6 live cells and 24 dying (a dozen kinds) | 9 of 26, from the sparsest rules' starts | last thousands of generations: the first ships on tetrakis |

On a small torus their soups end in long loops (periods 68 to 340): their ships going round. None on Penrose's rhombi or the spectres (no lattice: a ship has no copy of itself to come back on), and only rare ones on the florets (B25/S25/C8, period 25), kisrhombille (B34/S13/C8, period 4) and rhombitri (B23/S06/C8, period 38); none so far on the snub and the 14th pentagon.

