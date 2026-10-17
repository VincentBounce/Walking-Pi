// The app's RLE (A alive, B, C … dying, . dead; $ a new row; a count before a symbol repeats it) as [x, y, state]
export function cellsOf(rle) {
  const out = [];
  let x = 0, y = 0, n = '';
  for (const ch of rle) {
    if (/\d/.test(ch)) { n += ch; continue; }
    const k = Number(n || 1);
    n = '';
    if (ch === '!') break;
    if (ch === '$') { y += k; x = 0; continue; }
    for (let i = 0; i < k; i++, x++) if (ch !== '.' && ch !== 'b') out.push([x, y, ch.charCodeAt(0) - 64]);
  }
  return out;
}
