import { rng } from '../../core/rng.js';
import { THEMES, plain } from './words.js';

export const DIRS = { E: [0, 1], S: [1, 0], SE: [1, 1], NE: [-1, 1], W: [0, -1], N: [-1, 0], NW: [-1, -1], SW: [1, -1] };

function occurrences(grid, n, word) {
  let count = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (grid[r * n + c] !== word[0]) continue;
    for (const [dr, dc] of Object.values(DIRS)) {
      let k = 1;
      for (; k < word.length; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n || grid[rr * n + cc] !== word[k]) break;
      }
      if (k === word.length) count++;
    }
  }
  return count;
}

function placeWord(grid, n, word, dirs, r) {
  const options = [];
  for (const d of dirs) {
    const [dr, dc] = DIRS[d];
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
      const er = row + dr * (word.length - 1), ec = col + dc * (word.length - 1);
      if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
      let overlap = 0, ok = true;
      const cells = [];
      for (let k = 0; k < word.length; k++) {
        const i = (row + dr * k) * n + col + dc * k, g = grid[i];
        if (g && g !== word[k]) { ok = false; break; }
        if (g) overlap++;
        cells.push(i);
      }
      if (ok && overlap < word.length) options.push({ cells, score: overlap * 2 + r() });
    }
  }
  if (!options.length) return null;
  options.sort((a, b) => b.score - a.score);
  const pick = options[r.int(Math.min(options.length, 4))];
  pick.cells.forEach((i, k) => { grid[i] = word[k]; });
  return pick.cells;
}

export function generate(seed, { lang, size, count, dirs, decoys }) {
  const r = rng(seed);
  const themes = THEMES[lang] || THEMES.en;
  const theme = r.pick(Object.keys(themes));
  const pool = themes[theme].filter((w) => plain(w).length <= size);
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid = new Array(size * size).fill('');
    const chosen = r.shuffle(pool.slice()).sort((a, b) => plain(b).length - plain(a).length);
    const words = [];
    for (const w of chosen) {
      if (words.length === count) break;
      const p = plain(w);
      if (words.some((x) => x.plain.includes(p) || p.includes(x.plain))) continue;
      const cells = placeWord(grid, size, p, dirs, r);
      if (cells) words.push({ word: w, plain: p, cells });
    }
    if (words.length < count) continue;
    const letters = words.map((w) => w.plain).join('');
    if (decoys) {
      for (const w of words) {
        const frag = w.plain.slice(0, Math.max(2, Math.floor(w.plain.length / 2)));
        placeWord(grid, size, frag, Object.keys(DIRS), r);
      }
    }
    for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = letters[r.int(letters.length)];
    if (words.every((w) => occurrences(grid, size, w.plain) === 1)) {
      return { theme, size, grid, words: words.sort((a, b) => a.word.localeCompare(b.word, lang)) };
    }
  }
  return null;
}
