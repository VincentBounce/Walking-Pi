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

<br>

<p align="center">⁂</p>

<br>

## 🐜 Langton's ant by the digits: late highways

**Ant**, beside Grid and Cells, walks a turtle's cells as [Langton's ant](https://en.wikipedia.org/wiki/Langton%27s_ant); with **Digits** each digit turns it (0 left, 1 right; L1 / R1 on the Cairo pentagons), the other way on a dark cell, which then flips. A fraction's digits repeat, yet the ant first wanders in the mess it makes, for hundreds or millions of steps, until it may slip out into fresh cells on a **highway**: the same stretch of steps for ever, each one further on (its stretch is a whole number of the digits' period). When it starts cannot be foreseen: even for Langton's own ant, no one has proved that it always builds one. A highway may also be a **bridge**: it runs across a bay of the cloud and lands back in it, and the chaos goes on.

Walking Pi finds a highway (its stretch up to 100,000 steps, repeated over 1,000 steps and 5 stretches at least, its last stretch on cells first walked on it), follows it, and stops the ant as far along it as the cloud before it is wide; one that breaks before was a bridge. The search below ran apart, with the same rules and stops: every fraction 1/q with q ≤ 1,000 and every a/q with a ≤ 99 and q ≤ 9, in base 2, up to 50 million steps, each highway then followed until it was **endless for sure** (farther from the start than anything the ant walked before it, and going away). Fractions that walk the same digits from some point on (the sevenths, or 1/q and 1/2q) often meet the same highway: they share a row. The app walks 20 million digits at most: past that, its links show the cloud, or the highway's start.

**Surprise** ranks how much order comes out of how little: the steps of chaos before the highway, over its stretch times the number's own digits (1/244: 6,369,167 ÷ (60 × 4) = 26,538). A short number, a long chaos and a short stretch make the sudden switch from a huge cloud to a straight road the most striking. Studies of Langton's ant measure the steps before the highway (its *transient*) and the highway's period, not the seed's size: this ratio is Walking Pi's own.

### Squares ant

1,471 fractions: 1,289 build an endless highway, 158 none within 50 million steps, 24 unknown.

**The most surprising**:

| # | Numbers | Highway from step | Stretch | Stops at | Surprise | In the app |
|--:|---|--:|--:|--:|--:|---|
| 1 | [1/889](https://vincentbounce.github.io/Walking-Pi/#x=1/889&w=antSquare&d=20000000&r=digits) | 35,051,396 | 42 | 35,107,844 | 208,639 | the cloud only |
| 2 | [1/589](https://vincentbounce.github.io/Walking-Pi/#x=1/589&w=antSquare&d=20000000&r=digits) | 38,673,200 | 90 | 38,752,220 | 107,426 | the cloud only |
| 3 | [1/67](https://vincentbounce.github.io/Walking-Pi/#x=1/67&w=antSquare&d=20000000&r=digits) | 46,633,629 | 462 | 46,811,499 | 33,646 | the cloud only |
| 4 | [1/244](https://vincentbounce.github.io/Walking-Pi/#x=1/244&w=antSquare&d=6431687&r=digits) | 6,369,167 | 60 | 6,431,687 | 26,538 | whole |
| 5 | [1/444](https://vincentbounce.github.io/Walking-Pi/#x=1/444&w=antSquare&d=1391606&r=digits) | 1,367,594 | 36 | 1,391,606 | 9,497 | whole |
| 6 | [1/62](https://vincentbounce.github.io/Walking-Pi/#x=1/62&w=antSquare&d=3878574&r=digits) | 3,846,924 | 150 | 3,878,574 | 8,549 | whole |
| 7 | [1/699](https://vincentbounce.github.io/Walking-Pi/#x=1/699&w=antSquare&d=20000000&r=digits) | 37,385,220 | 1,160 | 37,657,820 | 8,057 | the cloud only |
| 8 | [1/488](https://vincentbounce.github.io/Walking-Pi/#x=1/488&w=antSquare&d=1855218&r=digits) | 1,814,118 | 60 | 1,855,218 | 7,559 | whole |
| 9 | [1/438](https://vincentbounce.github.io/Walking-Pi/#x=1/438&w=antSquare&d=540989&r=digits) | 534,473 | 18 | 540,989 | 7,423 | whole |
| 10 | [1/976](https://vincentbounce.github.io/Walking-Pi/#x=1/976&w=antSquare&d=1447309&r=digits) | 1,414,849 | 60 | 1,447,309 | 5,895 | whole |
| 11 | [1/527](https://vincentbounce.github.io/Walking-Pi/#x=1/527&w=antSquare&d=20000000&r=digits) | 41,545,659 | 1,800 | 41,801,259 | 5,770 | the cloud only |
| 12 | [1/124](https://vincentbounce.github.io/Walking-Pi/#x=1/124&w=antSquare&d=3422617&r=digits) | 3,403,567 | 150 | 3,422,617 | 5,673 | whole |
| 13 | [1/695](https://vincentbounce.github.io/Walking-Pi/#x=1/695&w=antSquare&d=17465366&r=digits) | 17,387,534 | 828 | 17,465,366 | 5,250 | whole |
| 14 | [1/876](https://vincentbounce.github.io/Walking-Pi/#x=1/876&w=antSquare&d=371592&r=digits) | 362,952 | 18 | 371,592 | 5,041 | whole |
| 15 | [1/561](https://vincentbounce.github.io/Walking-Pi/#x=1/561&w=antSquare&d=763236&r=digits) | 756,676 | 40 | 763,236 | 4,729 | whole |

**The latest seen whole in the app** (stopping within 20 million steps):

| # | Numbers | Highway from step | Stretch | Stops at | Surprise |
|--:|---|--:|--:|--:|--:|
| 1 | [1/165](https://vincentbounce.github.io/Walking-Pi/#x=1/165&w=antSquare&d=18286994&r=digits) | 17,890,514 | 4,720 | 18,286,994 | 948 |
| 2 | [1/417](https://vincentbounce.github.io/Walking-Pi/#x=1/417&w=antSquare&d=18153110&r=digits) | 17,570,750 | 29,118 | 18,153,110 | 151 |
| 3 | [1/695](https://vincentbounce.github.io/Walking-Pi/#x=1/695&w=antSquare&d=17465366&r=digits) | 17,387,534 | 828 | 17,465,366 | 5,250 |
| 4 | [33/7](https://vincentbounce.github.io/Walking-Pi/#x=33/7&w=antSquare&d=17342237&r=digits), [51/7](https://vincentbounce.github.io/Walking-Pi/#x=51/7&w=antSquare&d=17342237&r=digits), [66/7](https://vincentbounce.github.io/Walking-Pi/#x=66/7&w=antSquare&d=17342237&r=digits) | 16,842,827 | 16,110 | 17,342,237 | 348 |
| 5 | [17/7](https://vincentbounce.github.io/Walking-Pi/#x=17/7&w=antSquare&d=16618934&r=digits), [25/7](https://vincentbounce.github.io/Walking-Pi/#x=25/7&w=antSquare&d=16618934&r=digits), [34/7](https://vincentbounce.github.io/Walking-Pi/#x=34/7&w=antSquare&d=16618934&r=digits), [50/7](https://vincentbounce.github.io/Walking-Pi/#x=50/7&w=antSquare&d=16618934&r=digits), [68/7](https://vincentbounce.github.io/Walking-Pi/#x=68/7&w=antSquare&d=16618934&r=digits) | 16,264,514 | 16,110 | 16,618,934 | 337 |
| 6 | [29/7](https://vincentbounce.github.io/Walking-Pi/#x=29/7&w=antSquare&d=15301914&r=digits), [55/7](https://vincentbounce.github.io/Walking-Pi/#x=55/7&w=antSquare&d=15301914&r=digits), [58/7](https://vincentbounce.github.io/Walking-Pi/#x=58/7&w=antSquare&d=15301914&r=digits), [1/56](https://vincentbounce.github.io/Walking-Pi/#x=1/56&w=antSquare&d=15301914&r=digits) | 14,786,394 | 16,110 | 15,301,914 | 306 |
| 7 | [75/7](https://vincentbounce.github.io/Walking-Pi/#x=75/7&w=antSquare&d=14320301&r=digits), [93/7](https://vincentbounce.github.io/Walking-Pi/#x=93/7&w=antSquare&d=14320301&r=digits) | 13,885,331 | 16,110 | 14,320,301 | 287 |
| 8 | [83/7](https://vincentbounce.github.io/Walking-Pi/#x=83/7&w=antSquare&d=14447633&r=digits), [85/7](https://vincentbounce.github.io/Walking-Pi/#x=85/7&w=antSquare&d=14447633&r=digits) | 13,754,903 | 16,110 | 14,447,633 | 285 |
| 9 | [1/807](https://vincentbounce.github.io/Walking-Pi/#x=1/807&w=antSquare&d=14011299&r=digits) | 13,662,899 | 13,400 | 14,011,299 | 255 |
| 10 | [1/830](https://vincentbounce.github.io/Walking-Pi/#x=1/830&w=antSquare&d=13432153&r=digits) | 13,280,617 | 984 | 13,432,153 | 3,374 |
| 11 | [1/466](https://vincentbounce.github.io/Walking-Pi/#x=1/466&w=antSquare&d=11800143&r=digits) | 11,638,439 | 2,378 | 11,800,143 | 1,224 |
| 12 | [1/392](https://vincentbounce.github.io/Walking-Pi/#x=1/392&w=antSquare&d=11587154&r=digits) | 11,316,674 | 7,728 | 11,587,154 | 366 |
| 13 | [67/7](https://vincentbounce.github.io/Walking-Pi/#x=67/7&w=antSquare&d=11628074&r=digits) | 11,176,994 | 16,110 | 11,628,074 | 231 |
| 14 | [1/802](https://vincentbounce.github.io/Walking-Pi/#x=1/802&w=antSquare&d=10825577&r=digits) | 9,804,977 | 12,600 | 10,825,577 | 195 |
| 15 | [1/638](https://vincentbounce.github.io/Walking-Pi/#x=1/638&w=antSquare&d=7961141&r=digits) | 7,770,041 | 2,100 | 7,961,141 | 925 |
| 16 | [1/836](https://vincentbounce.github.io/Walking-Pi/#x=1/836&w=antSquare&d=7731959&r=digits) | 7,601,909 | 1,530 | 7,731,959 | 1,242 |
| 17 | [1/553](https://vincentbounce.github.io/Walking-Pi/#x=1/553&w=antSquare&d=8354223&r=digits) | 7,452,309 | 29,094 | 8,354,223 | 64 |
| 18 | [1/244](https://vincentbounce.github.io/Walking-Pi/#x=1/244&w=antSquare&d=6431687&r=digits) | 6,369,167 | 60 | 6,431,687 | 26,538 |
| 19 | [1/61](https://vincentbounce.github.io/Walking-Pi/#x=1/61&w=antSquare&d=6182528&r=digits) | 6,095,948 | 780 | 6,182,528 | 2,605 |
| 20 | [1/319](https://vincentbounce.github.io/Walking-Pi/#x=1/319&w=antSquare&d=6229200&r=digits) | 5,918,400 | 2,100 | 6,229,200 | 705 |

**Beyond the app's 20 million digits**:

| # | Numbers | Highway from step | Stretch | Stops at | Surprise | In the app |
|--:|---|--:|--:|--:|--:|---|
| 1 | [1/67](https://vincentbounce.github.io/Walking-Pi/#x=1/67&w=antSquare&d=20000000&r=digits) | 46,633,629 | 462 | 46,811,499 | 33,646 | the cloud only |
| 2 | [61/7](https://vincentbounce.github.io/Walking-Pi/#x=61/7&w=antSquare&d=20000000&r=digits) | 42,757,367 | 16,110 | 43,401,767 | 885 | the cloud only |
| 3 | [1/527](https://vincentbounce.github.io/Walking-Pi/#x=1/527&w=antSquare&d=20000000&r=digits) | 41,545,659 | 1,800 | 41,801,259 | 5,770 | the cloud only |
| 4 | [1/49](https://vincentbounce.github.io/Walking-Pi/#x=1/49&w=antSquare&d=20000000&r=digits) | 41,279,786 | 7,728 | 41,720,282 | 1,781 | the cloud only |
| 5 | [1/589](https://vincentbounce.github.io/Walking-Pi/#x=1/589&w=antSquare&d=20000000&r=digits) | 38,673,200 | 90 | 38,752,220 | 107,426 | the cloud only |
| 6 | [1/699](https://vincentbounce.github.io/Walking-Pi/#x=1/699&w=antSquare&d=20000000&r=digits) | 37,385,220 | 1,160 | 37,657,820 | 8,057 | the cloud only |
| 7 | [1/889](https://vincentbounce.github.io/Walking-Pi/#x=1/889&w=antSquare&d=20000000&r=digits) | 35,051,396 | 42 | 35,107,844 | 208,639 | the cloud only |
| 8 | [1/651](https://vincentbounce.github.io/Walking-Pi/#x=1/651&w=antSquare&d=20000000&r=digits) | 32,239,185 | 9,690 | 32,568,645 | 832 | the cloud only |
| 9 | [1/355](https://vincentbounce.github.io/Walking-Pi/#x=1/355&w=antSquare&d=20000000&r=digits) | 30,852,698 | 6,300 | 31,860,698 | 1,224 | the cloud only |
| 10 | [1/851](https://vincentbounce.github.io/Walking-Pi/#x=1/851&w=antSquare&d=20000000&r=digits) | 26,818,559 | 85,536 | 27,844,991 | 78 | the cloud only |
| 11 | [1/784](https://vincentbounce.github.io/Walking-Pi/#x=1/784&w=antSquare&d=20000000&r=digits) | 25,389,031 | 7,728 | 25,798,615 | 821 | the cloud only |
| 12 | [1/691](https://vincentbounce.github.io/Walking-Pi/#x=1/691&w=antSquare&d=20000000&r=digits) | 24,054,797 | 31,740 | 25,419,617 | 189 | the cloud only |
| 13 | [1/660](https://vincentbounce.github.io/Walking-Pi/#x=1/660&w=antSquare&d=20000000&r=digits) | 21,676,356 | 4,720 | 22,332,436 | 1,148 | the cloud only |
| 14 | [1/224](https://vincentbounce.github.io/Walking-Pi/#x=1/224&w=antSquare&d=20000000&r=digits) | 20,677,609 | 16,110 | 21,289,789 | 321 | the cloud only |

**Bridges** back into the cloud (7):

| Number | Bridges: from step (steps long) | Then |
|---|---|---|
| [1/67](https://vincentbounce.github.io/Walking-Pi/#x=1/67&w=antSquare&d=20000000&r=digits) | 14,905,581 (26,419), 40,107,483 (6,517) | an endless highway from step 46,633,629 |
| [1/98](https://vincentbounce.github.io/Walking-Pi/#x=1/98&w=antSquare&d=20000000&r=digits) | 53,287,731 (60,269) | chaos again, up to 60 million steps |
| [1/355](https://vincentbounce.github.io/Walking-Pi/#x=1/355&w=antSquare&d=20000000&r=digits) | 1,909,717 (40,283), 21,523,021 (118,979) | an endless highway from step 30,852,698 |
| [1/610](https://vincentbounce.github.io/Walking-Pi/#x=1/610&w=antSquare&d=20000000&r=digits) | 53,912,889 (7,111) | chaos again, up to 60 million steps |
| [1/617](https://vincentbounce.github.io/Walking-Pi/#x=1/617&w=antSquare&d=20000000&r=digits) | 38,080,433 (23,567) | chaos again, up to 60 million steps |
| [1/764](https://vincentbounce.github.io/Walking-Pi/#x=1/764&w=antSquare&d=20000000&r=digits) | 35,730,571 (9,429) | chaos again, up to 60 million steps |
| [1/976](https://vincentbounce.github.io/Walking-Pi/#x=1/976&w=antSquare&d=1447309&r=digits) | 1,303,699 (4,301) | an endless highway from step 1,414,849 |

<details><summary>No highway within 50 million steps (158)</summary>

1/11, 1/17, 1/22, 1/44, 1/87, 1/88, 1/89, 1/98, 1/103, 1/143, 1/147, 1/151, 1/161, 1/167, 1/171, 1/174, 1/176, 1/178, 1/187, 1/191, 1/199, 1/201, 1/206, 1/223, 1/243, 1/283, 1/286, 1/293, 1/294, 1/302, 1/305, 1/311, 1/315, 1/322, 1/323, 1/329, 1/334, 1/337, 1/342, 1/348, 1/351, 1/352, 1/353, 1/356, 1/359, 1/367, 1/371, 1/374, 1/382, 1/383, 1/391, 1/398, 1/402, 1/407, 1/412, 1/423, 1/426, 1/431, 1/439, 1/446, 1/453, 1/459, 1/463, 1/467, 1/483, 1/486, 1/487, 1/495, 1/497, 1/503, 1/517, 1/543, 1/544, 1/557, 1/559, 1/566, 1/571, 1/572, 1/573, 1/575, 1/579, 1/581, 1/585, 1/586, 1/588, 1/595, 1/599, 1/604, 1/607, 1/610, 1/615, 1/617, 1/622, 1/623, 1/630, 1/631, 1/639, 1/644, 1/646, 1/647, 1/657, 1/658, 1/667, 1/668, 1/674, 1/684, 1/696, 1/702, 1/703, 1/704, 1/706, 1/707, 1/712, 1/718, 1/727, 1/734, 1/742, 1/748, 1/764, 1/766, 1/779, 1/782, 1/796, 1/799, 1/804, 1/805, 1/814, 1/815, 1/819, 1/821, 1/823, 1/824, 1/827, 1/835, 1/846, 1/862, 1/867, 1/878, 1/887, 1/892, 1/906, 1/918, 1/919, 1/926, 1/934, 1/943, 1/947, 1/951, 1/966, 1/967, 1/972, 1/974, 1/975, 1/981, 1/990, 1/991, 1/994, 1/999.

</details>

<details><summary>Unknown (24): the cloud grew wider than the search's grid (16,384 cells across) first</summary>

1/101 (step 3,375,446), 1/202 (step 3,408,815), 1/213 (step 8,678,722), 1/253 (step 17,847,736), 1/303 (step 4,149,386), 1/377 (step 8,131,617), 1/404 (step 3,983,936), 1/443 (step 3,710,769), 1/475 (step 25,199,893), 1/491 (step 17,577,602), 1/506 (step 17,341,399), 1/531 (step 6,070,947), 1/606 (step 7,514,979), 1/713 (step 36,526,654), 1/754 (step 20,553,228), 1/808 (step 3,922,427), 1/829 (step 13,517,534), 1/847 (step 6,408,017), 1/852 (step 8,567,876), 1/886 (step 6,611,913), 1/911 (step 6,809,228), 1/950 (step 18,011,204), 1/982 (step 17,611,318), 1/987 (step 5,121,758).

</details>

### Cairo pentagons ant

1,471 fractions: 923 build an endless highway, 527 none within 50 million steps, 21 unknown.

**The most surprising**:

| # | Numbers | Highway from step | Stretch | Stops at | Surprise | In the app |
|--:|---|--:|--:|--:|--:|---|
| 1 | [1/356](https://vincentbounce.github.io/Walking-Pi/#x=1/356&w=antCairo&d=20000000&r=digits) | 42,716,629 | 55 | 42,758,814 | 194,166 | the cloud only |
| 2 | [1/763](https://vincentbounce.github.io/Walking-Pi/#x=1/763&w=antCairo&d=20000000&r=digits) | 32,070,035 | 72 | 32,129,003 | 111,354 | the cloud only |
| 3 | [1/378](https://vincentbounce.github.io/Walking-Pi/#x=1/378&w=antCairo&d=13300565&r=digits) | 13,267,805 | 72 | 13,300,565 | 46,069 | whole |
| 4 | [1/624](https://vincentbounce.github.io/Walking-Pi/#x=1/624&w=antCairo&d=3009796&r=digits) | 3,000,172 | 24 | 3,009,796 | 31,252 | whole |
| 5 | [1/202](https://vincentbounce.github.io/Walking-Pi/#x=1/202&w=antCairo&d=20000000&r=digits) | 31,641,880 | 300 | 31,811,380 | 26,368 | the cloud only |
| 6 | [1/925](https://vincentbounce.github.io/Walking-Pi/#x=1/925&w=antCairo&d=20000000&r=digits) | 45,588,160 | 540 | 45,981,280 | 21,106 | the cloud only |
| 7 | [1/556](https://vincentbounce.github.io/Walking-Pi/#x=1/556&w=antCairo&d=4462694&r=digits) | 4,385,690 | 138 | 4,462,694 | 7,945 | whole |
| 8 | [1/914](https://vincentbounce.github.io/Walking-Pi/#x=1/914&w=antCairo&d=16423822&r=digits) | 16,301,994 | 532 | 16,423,822 | 7,661 | whole |
| 9 | [1/692](https://vincentbounce.github.io/Walking-Pi/#x=1/692&w=antCairo&d=20000000&r=digits) | 24,579,246 | 860 | 24,896,586 | 7,145 | the cloud only |
| 10 | [1/153](https://vincentbounce.github.io/Walking-Pi/#x=1/153&w=antCairo&d=3436278&r=digits) | 3,426,198 | 120 | 3,436,278 | 7,138 | whole |
| 11 | [1/612](https://vincentbounce.github.io/Walking-Pi/#x=1/612&w=antCairo&d=3438602&r=digits) | 3,425,402 | 120 | 3,438,602 | 7,136 | whole |
| 12 | [1/457](https://vincentbounce.github.io/Walking-Pi/#x=1/457&w=antCairo&d=14701623&r=digits) | 14,548,407 | 532 | 14,701,623 | 6,837 | whole |
| 13 | [1/346](https://vincentbounce.github.io/Walking-Pi/#x=1/346&w=antCairo&d=20000000&r=digits) | 21,188,084 | 860 | 21,518,324 | 6,159 | the cloud only |
| 14 | [1/360](https://vincentbounce.github.io/Walking-Pi/#x=1/360&w=antCairo&d=18781480&r=digits) | 18,650,152 | 768 | 18,781,480 | 6,071 | whole |
| 15 | [1/189](https://vincentbounce.github.io/Walking-Pi/#x=1/189&w=antCairo&d=1662016&r=digits) | 1,642,864 | 72 | 1,662,016 | 5,704 | whole |

**The latest seen whole in the app** (stopping within 20 million steps):

| # | Numbers | Highway from step | Stretch | Stops at | Surprise |
|--:|---|--:|--:|--:|--:|
| 1 | [1/360](https://vincentbounce.github.io/Walking-Pi/#x=1/360&w=antCairo&d=18781480&r=digits) | 18,650,152 | 768 | 18,781,480 | 6,071 |
| 2 | [1/986](https://vincentbounce.github.io/Walking-Pi/#x=1/986&w=antCairo&d=18648929&r=digits) | 18,385,897 | 3,416 | 18,648,929 | 1,346 |
| 3 | [1/914](https://vincentbounce.github.io/Walking-Pi/#x=1/914&w=antCairo&d=16423822&r=digits) | 16,301,994 | 532 | 16,423,822 | 7,661 |
| 4 | [1/978](https://vincentbounce.github.io/Walking-Pi/#x=1/978&w=antCairo&d=14793714&r=digits) | 14,713,524 | 810 | 14,793,714 | 4,541 |
| 5 | [1/457](https://vincentbounce.github.io/Walking-Pi/#x=1/457&w=antCairo&d=14701623&r=digits) | 14,548,407 | 532 | 14,701,623 | 6,837 |
| 6 | [1/378](https://vincentbounce.github.io/Walking-Pi/#x=1/378&w=antCairo&d=13300565&r=digits) | 13,267,805 | 72 | 13,300,565 | 46,069 |
| 7 | [1/301](https://vincentbounce.github.io/Walking-Pi/#x=1/301&w=antCairo&d=11368844&r=digits) | 11,262,668 | 672 | 11,368,844 | 4,190 |
| 8 | [1/485](https://vincentbounce.github.io/Walking-Pi/#x=1/485&w=antCairo&d=10147963&r=digits) | 10,001,419 | 3,408 | 10,147,963 | 734 |
| 9 | [1/602](https://vincentbounce.github.io/Walking-Pi/#x=1/602&w=antCairo&d=9854661&r=digits) | 9,713,541 | 672 | 9,854,661 | 3,614 |
| 10 | [1/278](https://vincentbounce.github.io/Walking-Pi/#x=1/278&w=antCairo&d=7744937&r=digits) | 7,475,009 | 22,494 | 7,744,937 | 83 |
| 11 | [1/45](https://vincentbounce.github.io/Walking-Pi/#x=1/45&w=antCairo&d=6290301&r=digits) | 6,218,109 | 768 | 6,290,301 | 2,699 |
| 12 | [1/785](https://vincentbounce.github.io/Walking-Pi/#x=1/785&w=antCairo&d=5860062&r=digits) | 5,812,586 | 572 | 5,860,062 | 2,540 |
| 13 | [1/453](https://vincentbounce.github.io/Walking-Pi/#x=1/453&w=antCairo&d=5848713&r=digits) | 5,328,213 | 20,820 | 5,848,713 | 64 |
| 14 | [1/915](https://vincentbounce.github.io/Walking-Pi/#x=1/915&w=antCairo&d=5124141&r=digits) | 4,885,461 | 2,040 | 5,124,141 | 599 |
| 15 | [1/180](https://vincentbounce.github.io/Walking-Pi/#x=1/180&w=antCairo&d=4744037&r=digits) | 4,674,149 | 768 | 4,744,037 | 1,522 |
| 16 | [1/556](https://vincentbounce.github.io/Walking-Pi/#x=1/556&w=antCairo&d=4462694&r=digits) | 4,385,690 | 138 | 4,462,694 | 7,945 |
| 17 | [1/376](https://vincentbounce.github.io/Walking-Pi/#x=1/376&w=antCairo&d=4314193&r=digits) | 4,259,039 | 506 | 4,314,193 | 2,104 |
| 18 | [1/101](https://vincentbounce.github.io/Walking-Pi/#x=1/101&w=antCairo&d=4103118&r=digits) | 4,038,318 | 300 | 4,103,118 | 3,365 |
| 19 | [1/885](https://vincentbounce.github.io/Walking-Pi/#x=1/885&w=antCairo&d=4131757&r=digits) | 4,021,325 | 1,624 | 4,131,757 | 619 |
| 20 | [1/153](https://vincentbounce.github.io/Walking-Pi/#x=1/153&w=antCairo&d=3436278&r=digits) | 3,426,198 | 120 | 3,436,278 | 7,138 |

**Beyond the app's 20 million digits**:

| # | Numbers | Highway from step | Stretch | Stops at | Surprise | In the app |
|--:|---|--:|--:|--:|--:|---|
| 1 | [1/925](https://vincentbounce.github.io/Walking-Pi/#x=1/925&w=antCairo&d=20000000&r=digits) | 45,588,160 | 540 | 45,981,280 | 21,106 | the cloud only |
| 2 | [1/335](https://vincentbounce.github.io/Walking-Pi/#x=1/335&w=antCairo&d=20000000&r=digits) | 45,028,778 | 3,168 | 45,779,594 | 3,553 | the cloud only |
| 3 | [1/356](https://vincentbounce.github.io/Walking-Pi/#x=1/356&w=antCairo&d=20000000&r=digits) | 42,716,629 | 55 | 42,758,814 | 194,166 | the cloud only |
| 4 | [1/763](https://vincentbounce.github.io/Walking-Pi/#x=1/763&w=antCairo&d=20000000&r=digits) | 32,070,035 | 72 | 32,129,003 | 111,354 | the cloud only |
| 5 | [1/202](https://vincentbounce.github.io/Walking-Pi/#x=1/202&w=antCairo&d=20000000&r=digits) | 31,641,880 | 300 | 31,811,380 | 26,368 | the cloud only |
| 6 | [1/283](https://vincentbounce.github.io/Walking-Pi/#x=1/283&w=antCairo&d=20000000&r=digits) | 30,818,564 | 2,914 | 31,109,964 | 2,644 | the cloud only |
| 7 | [1/974](https://vincentbounce.github.io/Walking-Pi/#x=1/974&w=antCairo&d=20000000&r=digits) | 26,475,735 | 12,393 | 27,330,852 | 534 | the cloud only |
| 8 | [1/692](https://vincentbounce.github.io/Walking-Pi/#x=1/692&w=antCairo&d=20000000&r=digits) | 24,579,246 | 860 | 24,896,586 | 7,145 | the cloud only |
| 9 | [1/478](https://vincentbounce.github.io/Walking-Pi/#x=1/478&w=antCairo&d=20000000&r=digits) | 23,439,464 | 6,069 | 24,058,502 | 966 | the cloud only |
| 10 | [1/777](https://vincentbounce.github.io/Walking-Pi/#x=1/777&w=antCairo&d=20000000&r=digits) | 22,976,332 | 7,488 | 23,268,364 | 767 | the cloud only |
| 11 | [1/854](https://vincentbounce.github.io/Walking-Pi/#x=1/854&w=antCairo&d=20000000&r=digits) | 22,720,916 | 1,200 | 22,830,116 | 4,734 | the cloud only |
| 12 | [1/346](https://vincentbounce.github.io/Walking-Pi/#x=1/346&w=antCairo&d=20000000&r=digits) | 21,188,084 | 860 | 21,518,324 | 6,159 | the cloud only |

**Bridges** back into the cloud (7):

| Number | Bridges: from step (steps long) | Then |
|---|---|---|
| [1/301](https://vincentbounce.github.io/Walking-Pi/#x=1/301&w=antCairo&d=11368844&r=digits) | 10,013,546 (10,454) | an endless highway from step 11,262,668 |
| [1/378](https://vincentbounce.github.io/Walking-Pi/#x=1/378&w=antCairo&d=13300565&r=digits) | 13,256,084 (3,916) | an endless highway from step 13,267,805 |
| [1/404](https://vincentbounce.github.io/Walking-Pi/#x=1/404&w=antCairo&d=20000000&r=digits) | 11,855,520 (6,480) | chaos again, up to 60 million steps |
| [1/457](https://vincentbounce.github.io/Walking-Pi/#x=1/457&w=antCairo&d=14701623&r=digits) | 3,487,885 (6,115), 4,000,025 (5,975) | an endless highway from step 14,548,407 |
| [1/478](https://vincentbounce.github.io/Walking-Pi/#x=1/478&w=antCairo&d=20000000&r=digits) | 13,488,507 (67,493) | an endless highway from step 23,439,464 |
| [1/763](https://vincentbounce.github.io/Walking-Pi/#x=1/763&w=antCairo&d=20000000&r=digits) | 15,328,497 (3,503) | an endless highway from step 32,070,035 |
| [1/831](https://vincentbounce.github.io/Walking-Pi/#x=1/831&w=antCairo&d=20000000&r=digits) | 27,508,206 (65,794), 43,414,681 (73,319) | chaos again, up to 60 million steps |

<details><summary>No highway within 50 million steps (527)</summary>

1/2, 3/2, 5/2, 7/2, 9/2, 11/2, 13/2, 15/2, 17/2, 19/2, 21/2, 23/2, 25/2, 27/2, 29/2, 31/2, 33/2, 35/2, 37/2, 39/2, 41/2, 43/2, 45/2, 47/2, 49/2, 51/2, 53/2, 55/2, 57/2, 59/2, 61/2, 63/2, 65/2, 67/2, 69/2, 71/2, 73/2, 75/2, 77/2, 79/2, 81/2, 83/2, 85/2, 87/2, 89/2, 91/2, 93/2, 95/2, 97/2, 99/2, 1/4, 3/4, 5/4, 7/4, 9/4, 11/4, 13/4, 15/4, 17/4, 19/4, 21/4, 23/4, 25/4, 27/4, 29/4, 31/4, 33/4, 35/4, 37/4, 39/4, 41/4, 43/4, 45/4, 47/4, 49/4, 51/4, 53/4, 55/4, 57/4, 59/4, 61/4, 63/4, 65/4, 67/4, 69/4, 71/4, 73/4, 75/4, 77/4, 79/4, 81/4, 83/4, 85/4, 87/4, 89/4, 91/4, 93/4, 95/4, 97/4, 99/4, 1/8, 3/8, 5/8, 7/8, 9/8, 11/8, 13/8, 15/8, 17/8, 19/8, 21/8, 23/8, 25/8, 27/8, 29/8, 31/8, 33/8, 35/8, 37/8, 39/8, 41/8, 43/8, 45/8, 47/8, 49/8, 51/8, 53/8, 55/8, 57/8, 59/8, 61/8, 63/8, 65/8, 67/8, 69/8, 71/8, 73/8, 75/8, 77/8, 79/8, 81/8, 83/8, 85/8, 87/8, 89/8, 91/8, 93/8, 95/8, 97/8, 99/8, 1/15, 1/16, 1/21, 1/23, 1/30, 1/31, 1/32, 1/35, 1/42, 1/46, 1/51, 1/55, 1/60, 1/62, 1/63, 1/64, 1/70, 1/71, 1/73, 1/75, 1/79, 1/84, 1/87, 1/89, 1/91, 1/92, 1/93, 1/99, 1/102, 1/103, 1/105, 1/110, 1/113, 1/115, 1/117, 1/119, 1/120, 1/123, 1/124, 1/126, 1/127, 1/128, 1/133, 1/140, 1/141, 1/142, 1/143, 1/146, 1/150, 1/151, 1/155, 1/158, 1/161, 1/168, 1/174, 1/178, 1/182, 1/184, 1/186, 1/187, 1/195, 1/197, 1/198, 1/204, 1/205, 1/206, 1/207, 1/210, 1/215, 1/217, 1/220, 1/225, 1/226, 1/230, 1/231, 1/234, 1/235, 1/237, 1/238, 1/240, 1/245, 1/246, 1/248, 1/249, 1/251, 1/252, 1/253, 1/254, 1/255, 1/256, 1/257, 1/261, 1/263, 1/266, 1/269, 1/273, 1/279, 1/280, 1/282, 1/284, 1/285, 1/286, 1/287, 1/291, 1/292, 1/300, 1/302, 1/303, 1/309, 1/310, 1/311, 1/313, 1/315, 1/316, 1/319, 1/322, 1/323, 1/329, 1/333, 1/336, 1/337, 1/341, 1/343, 1/345, 1/348, 1/349, 1/357, 1/359, 1/364, 1/367, 1/368, 1/369, 1/372, 1/374, 1/381, 1/383, 1/390, 1/391, 1/394, 1/395, 1/396, 1/403, 1/404, 1/407, 1/408, 1/410, 1/411, 1/412, 1/413, 1/414, 1/415, 1/417, 1/420, 1/423, 1/430, 1/431, 1/434, 1/439, 1/440, 1/443, 1/445, 1/450, 1/452, 1/455, 1/460, 1/462, 1/463, 1/465, 1/468, 1/469, 1/470, 1/471, 1/473, 1/474, 1/475, 1/476, 1/480, 1/489, 1/490, 1/492, 1/493, 1/495, 1/496, 1/498, 1/501, 1/502, 1/503, 1/504, 1/506, 1/508, 1/510, 1/511, 1/512, 1/513, 1/514, 1/517, 1/519, 1/521, 1/522, 1/526, 1/527, 1/529, 1/531, 1/532, 1/535, 1/538, 1/546, 1/547, 1/553, 1/558, 1/559, 1/560, 1/561, 1/564, 1/566, 1/568, 1/570, 1/571, 1/572, 1/574, 1/575, 1/577, 1/578, 1/582, 1/583, 1/584, 1/589, 1/600, 1/604, 1/605, 1/606, 1/607, 1/609, 1/611, 1/618, 1/620, 1/621, 1/622, 1/623, 1/626, 1/630, 1/632, 1/635, 1/638, 1/644, 1/645, 1/646, 1/653, 1/657, 1/658, 1/666, 1/667, 1/672, 1/674, 1/682, 1/686, 1/695, 1/696, 1/698, 1/699, 1/707, 1/710, 1/712, 1/714, 1/718, 1/719, 1/723, 1/728, 1/730, 1/731, 1/735, 1/736, 1/738, 1/741, 1/744, 1/747, 1/748, 1/751, 1/757, 1/759, 1/762, 1/765, 1/766, 1/771, 1/779, 1/780, 1/782, 1/788, 1/789, 1/790, 1/792, 1/793, 1/795, 1/799, 1/801, 1/806, 1/807, 1/808, 1/811, 1/814, 1/815, 1/816, 1/820, 1/822, 1/823, 1/824, 1/825, 1/826, 1/828, 1/830, 1/831, 1/833, 1/834, 1/837, 1/840, 1/843, 1/846, 1/847, 1/851, 1/855, 1/860, 1/862, 1/863, 1/868, 1/869, 1/873, 1/878, 1/880, 1/886, 1/889, 1/890, 1/893, 1/895, 1/897, 1/899, 1/900, 1/901, 1/904, 1/910, 1/920, 1/924, 1/926, 1/927, 1/930, 1/933, 1/936, 1/938, 1/940, 1/941, 1/942, 1/943, 1/945, 1/946, 1/947, 1/948, 1/950, 1/951, 1/952, 1/953, 1/954, 1/957, 1/959, 1/960, 1/969, 1/979, 1/980, 1/981, 1/983, 1/984, 1/987, 1/989, 1/990, 1/991, 1/992, 1/995, 1/996, 1/999.

</details>

<details><summary>Unknown (21): the cloud grew wider than the search's grid (16,384 cells across) first</summary>

1/167 (step 14,668,051), 1/289 (step 49,991,386), 1/299 (step 29,496,978), 1/334 (step 18,964,559), 1/355 (step 30,157,352), 1/365 (step 43,695,103), 1/477 (step 35,948,283), 1/487 (step 39,278,120), 1/509 (step 42,167,651), 1/598 (step 40,801,166), 1/613 (step 7,934,834), 1/668 (step 17,483,729), 1/670 (step 19,142,755), 1/734 (step 19,346,284), 1/857 (step 40,151,534), 1/903 (step 11,106,550), 1/905 (step 38,032,082), 1/913 (step 12,632,729), 1/919 (step 30,218,092), 1/923 (step 41,221,322), 1/931 (step 43,520,204).

</details>

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
| 1 | [89/87](https://vincentbounce.github.io/Walking-Pi/#x=89/87&w=triTorusGrid&d=8737&s=48) | 14 | 8,736 | 4,992 | 100 % |
| 2 | [28/27](https://vincentbounce.github.io/Walking-Pi/#x=28/27&w=triTorusGrid&d=5617&s=48) | 18 | 5,616 | 4,368 | 100 % |
| 3 | [101/99](https://vincentbounce.github.io/Walking-Pi/#x=101/99&w=triTorusGrid&d=9361&s=48) | 30 | 9,360 | 4,680 | 93 % |
| 4 | [207/203](https://vincentbounce.github.io/Walking-Pi/#x=207/203&w=triTorusGrid&d=6553&s=48) | 42 | 6,552 | 4,368 | 95 % |
| 5 | [10/9](https://vincentbounce.github.io/Walking-Pi/#x=10/9&w=triTorusGrid&d=3745&s=48) | 6 | 3,744 | 3,744 | 100 % |
| 6 | [188/181](https://vincentbounce.github.io/Walking-Pi/#x=188/181&w=triTorusGrid&d=4681&s=48) | 15 | 4,680 | 3,744 | 100 % |
| 7 | [193/191](https://vincentbounce.github.io/Walking-Pi/#x=193/191&w=triTorusGrid&d=5929&s=48) | 19 | 5,928 | 4,056 | 95 % |
| 8 | [75/74](https://vincentbounce.github.io/Walking-Pi/#x=75/74&w=triTorusGrid&d=7489&s=48) | 36 | 7,488 | 4,576 | 89 % |

**On cells** (base 2), size 48:

| # | Number | Period | Round | Cells visited (of 9,984) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [68/65](https://vincentbounce.github.io/Walking-Pi/#x=68/65&w=triTorusWalk&d=7489&s=48) | 12 | 7,488 | 7,488 | 100 % |
| 2 | [254/251](https://vincentbounce.github.io/Walking-Pi/#x=254/251&w=triTorusWalk&d=10401&s=48) | 50 | 10,400 | 8,320 | 90 % |
| 3 | [44/41](https://vincentbounce.github.io/Walking-Pi/#x=44/41&w=triTorusWalk&d=6241&s=48) | 20 | 6,240 | 6,240 | 100 % |
| 4 | [112/109](https://vincentbounce.github.io/Walking-Pi/#x=112/109&w=triTorusWalk&d=11233&s=48) | 36 | 11,232 | 8,736 | 83 % |
| 5 | [202/189](https://vincentbounce.github.io/Walking-Pi/#x=202/189&w=triTorusWalk&d=5617&s=48) | 18 | 5,616 | 5,616 | 100 % |
| 6 | [38/37](https://vincentbounce.github.io/Walking-Pi/#x=38/37&w=triTorusWalk&d=11233&s=48) | 36 | 11,232 | 8,112 | 83 % |
| 7 | [116/105](https://vincentbounce.github.io/Walking-Pi/#x=116/105&w=triTorusWalk&d=7489&s=48) | 12 | 7,488 | 6,240 | 92 % |
| 8 | [156/145](https://vincentbounce.github.io/Walking-Pi/#x=156/145&w=triTorusWalk&d=8737&s=48) | 28 | 8,736 | 6,864 | 86 % |

### Hex torus

**Along the grid** (base 2), size 48:

| # | Number | Period | Round | Corners visited (of 13,248) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [46/43](https://vincentbounce.github.io/Walking-Pi/#x=46/43&w=hexTorusGrid&d=10305&s=48) | 14 | 10,304 | 10,304 | 100 % |
| 2 | [226/205](https://vincentbounce.github.io/Walking-Pi/#x=226/205&w=hexTorusGrid&d=11041&s=48) | 20 | 11,040 | 9,936 | 95 % |
| 3 | [6/5](https://vincentbounce.github.io/Walking-Pi/#x=6/5&w=hexTorusGrid&d=8833&s=48) | 4 | 8,832 | 8,832 | 100 % |
| 4 | [222/205](https://vincentbounce.github.io/Walking-Pi/#x=222/205&w=hexTorusGrid&d=11041&s=48) | 20 | 11,040 | 9,384 | 90 % |
| 5 | [88/87](https://vincentbounce.github.io/Walking-Pi/#x=88/87&w=hexTorusGrid&d=7729&s=48) | 28 | 7,728 | 7,176 | 96 % |
| 6 | [236/205](https://vincentbounce.github.io/Walking-Pi/#x=236/205&w=hexTorusGrid&d=11041&s=48) | 20 | 11,040 | 8,832 | 85 % |
| 7 | [76/65](https://vincentbounce.github.io/Walking-Pi/#x=76/65&w=hexTorusGrid&d=8833&s=48) | 12 | 8,832 | 7,360 | 92 % |
| 8 | [60/59](https://vincentbounce.github.io/Walking-Pi/#x=60/59&w=hexTorusGrid&d=10673&s=48) | 58 | 10,672 | 8,096 | 86 % |

**On cells** (base 5), size 48:

| # | Number | Period | Round | Cells visited (of 6,624) | New edges |
|--:|---|--:|--:|--:|--:|
| 1 | [14/13](https://vincentbounce.github.io/Walking-Pi/#x=14/13&w=hexTorusWalk&d=8833&s=48) | 4 | 8,832 | 6,624 | 100 % |
| 2 | [19/18](https://vincentbounce.github.io/Walking-Pi/#x=19/18&w=hexTorusWalk&d=6625&s=48) | 6 | 6,624 | 6,624 | 100 % |
| 3 | [161/142](https://vincentbounce.github.io/Walking-Pi/#x=161/142&w=hexTorusWalk&d=11041&s=48) | 5 | 11,040 | 6,624 | 100 % |
| 4 | [185/183](https://vincentbounce.github.io/Walking-Pi/#x=185/183&w=hexTorusWalk&d=8281&s=48) | 30 | 8,280 | 6,348 | 100 % |
| 5 | [61/58](https://vincentbounce.github.io/Walking-Pi/#x=61/58&w=hexTorusWalk&d=10305&s=48) | 14 | 10,304 | 6,624 | 93 % |
| 6 | [8/7](https://vincentbounce.github.io/Walking-Pi/#x=8/7&w=hexTorusWalk&d=6625&s=48) | 6 | 6,624 | 5,520 | 100 % |
| 7 | [151/142](https://vincentbounce.github.io/Walking-Pi/#x=151/142&w=hexTorusWalk&d=5521&s=48) | 5 | 5,520 | 5,520 | 100 % |
| 8 | [35/34](https://vincentbounce.github.io/Walking-Pi/#x=35/34&w=hexTorusWalk&d=11777&s=48) | 16 | 11,776 | 6,624 | 88 % |

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
