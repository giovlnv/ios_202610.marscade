import { rng } from '../../core/rng.js';

export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function ray(n, cells) {
  const [hx, hy] = cells[cells.length - 1], [px, py] = cells[cells.length - 2];
  const dx = hx - px, dy = hy - py, out = [];
  for (let x = hx + dx, y = hy + dy; x >= 0 && y >= 0 && x < n && y < n; x += dx, y += dy) out.push([x, y]);
  return { out, dx, dy };
}

export function buildGrid(n, arrows) {
  const grid = new Int16Array(n * n).fill(-1);
  arrows.forEach((a, k) => { if (!a.gone) for (const [x, y] of a.cells) grid[y * n + x] = k; });
  return grid;
}

export function canExit(n, grid, arrow) {
  return ray(n, arrow.cells).out.every(([x, y]) => grid[y * n + x] < 0);
}

function growArrow(n, grid, r, minLen, maxLen, bend) {
  const empties = [];
  for (let i = 0; i < n * n; i++) if (grid[i] < 0) empties.push(i);
  if (empties.length < minLen) return null;
  for (let tries = 0; tries < 30; tries++) {
    const s = r.pick(empties), cells = [[s % n, Math.floor(s / n)]];
    const used = new Set([s]);
    const len = minLen + r.int(maxLen - minLen + 1);
    let dir = r.int(4);
    while (cells.length < len) {
      if (cells.length > 1 && r() < bend) dir = (dir + (r() < 0.5 ? 1 : 3)) % 4;
      const [x, y] = cells[cells.length - 1], nx = x + DIRS[dir][0], ny = y + DIRS[dir][1], ni = ny * n + nx;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n || grid[ni] >= 0 || used.has(ni)) break;
      cells.push([nx, ny]);
      used.add(ni);
    }
    if (cells.length < minLen) continue;
    const { out } = ray(n, cells);
    if (out.every(([x, y]) => grid[y * n + x] < 0 && !used.has(y * n + x))) return cells;
  }
  return null;
}

export function generate(seed, { n, minLen, maxLen, bend, fill, tangle }) {
  const r = rng(seed);
  const grid = new Int16Array(n * n).fill(-1), arrows = [], rayCells = new Map();
  let filled = 0, misses = 0;
  while (filled < fill * n * n && misses < 80) {
    let best = null, bestScore = -1;
    for (let c = 0; c < tangle; c++) {
      const cells = growArrow(n, grid, r, minLen, maxLen, bend);
      if (!cells) continue;
      const score = cells.reduce((t, [x, y]) => t + (rayCells.get(y * n + x) || 0), 0) + r() * 0.5;
      if (score > bestScore) { bestScore = score; best = cells; }
    }
    if (!best) { misses++; continue; }
    for (const [x, y] of best) grid[y * n + x] = arrows.length;
    for (const [x, y] of ray(n, best).out) rayCells.set(y * n + x, (rayCells.get(y * n + x) || 0) + 1);
    arrows.push({ cells: best });
    filled += best.length;
  }
  return { n, arrows };
}

export function freeArrows(n, arrows) {
  const grid = buildGrid(n, arrows);
  return arrows.map((a, k) => (!a.gone && canExit(n, grid, a) ? k : -1)).filter((k) => k >= 0);
}

export function blockingDepth(n, arrows) {
  const live = arrows.map((a) => ({ ...a }));
  let rounds = 0;
  while (live.some((a) => !a.gone)) {
    const free = freeArrows(n, live);
    if (!free.length) return Infinity;
    free.forEach((k) => { live[k].gone = true; });
    rounds++;
  }
  return rounds;
}
