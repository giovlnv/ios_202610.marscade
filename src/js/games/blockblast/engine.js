import { rng } from '../../core/rng.js';

export const N = 8;

const BASE = {
  dot: ['#'],
  bar2: ['##'], bar3: ['###'], bar4: ['####'], bar5: ['#####'],
  sq2: ['##', '##'], sq3: ['###', '###', '###'], rect: ['###', '###'],
  l3: ['#.', '##'], l4: ['#.', '#.', '##'], l5: ['#..', '#..', '###'],
  t: ['###', '.#.'], s: ['.##', '##.'], diag2: ['#.', '.#'],
};
const rotate = (rows) => rows[0].split('').map((_, x) => rows.map((r) => r[x]).reverse().join(''));

export const SHAPES = [];
for (const [name, rows] of Object.entries(BASE)) {
  const seen = new Set();
  let cur = rows;
  for (let k = 0; k < 4; k++) {
    const key = cur.join('/');
    if (!seen.has(key)) {
      seen.add(key);
      const cells = [];
      cur.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && cells.push([y, x])));
      SHAPES.push({ name, cells, h: cur.length, w: cur[0].length });
    }
    cur = rotate(cur);
  }
}

const WEIGHTS = [
  { dot: 2, bar2: 3, bar3: 3, bar4: 2, bar5: 1, sq2: 3, sq3: 0.5, rect: 1, l3: 3, l4: 2, l5: 1, t: 2, s: 1, diag2: 0.5 },
  { dot: 1, bar2: 2, bar3: 3, bar4: 2, bar5: 1.5, sq2: 3, sq3: 1, rect: 1.5, l3: 2, l4: 2, l5: 1.5, t: 2, s: 2, diag2: 1 },
  { dot: 0.5, bar2: 1, bar3: 2, bar4: 2, bar5: 2, sq2: 2, sq3: 1.5, rect: 2, l3: 1.5, l4: 2, l5: 2, t: 2, s: 2.5, diag2: 1.5 },
  { dot: 0.3, bar2: 1, bar3: 1.5, bar4: 2, bar5: 2.5, sq2: 2, sq3: 2, rect: 2, l3: 1, l4: 2, l5: 2.5, t: 2, s: 3, diag2: 2 },
];

export function fits(board, shape, r, c) {
  return shape.cells.every(([y, x]) => {
    const rr = r + y, cc = c + x;
    return rr >= 0 && cc >= 0 && rr < N && cc < N && board[rr * N + cc] < 0;
  });
}

export function spots(board, shape) {
  const out = [];
  for (let r = 0; r <= N - shape.h; r++) for (let c = 0; c <= N - shape.w; c++) if (fits(board, shape, r, c)) out.push([r, c]);
  return out;
}

export function place(board, shape, r, c, color) {
  const b = board.slice();
  shape.cells.forEach(([y, x]) => { b[(r + y) * N + c + x] = color; });
  const rows = [], cols = [];
  for (let k = 0; k < N; k++) {
    if (Array.from({ length: N }, (_, j) => b[k * N + j]).every((v) => v >= 0)) rows.push(k);
    if (Array.from({ length: N }, (_, j) => b[j * N + k]).every((v) => v >= 0)) cols.push(k);
  }
  const cleared = new Set();
  rows.forEach((k) => { for (let j = 0; j < N; j++) cleared.add(k * N + j); });
  cols.forEach((k) => { for (let j = 0; j < N; j++) cleared.add(j * N + k); });
  cleared.forEach((i) => { b[i] = -1; });
  return { board: b, lines: rows.length + cols.length, cleared: [...cleared] };
}

export function score(cells, lines, streak) {
  if (!lines) return cells;
  return cells + lines * lines * 10 * (1 + Math.min(streak, 5) * 0.5);
}

export function deal(r, board, tier, guarantee) {
  const w = WEIGHTS[tier], pool = SHAPES.map((s) => [s, w[s.name] / SHAPES.filter((x) => x.name === s.name).length]);
  const total = pool.reduce((t, [, x]) => t + x, 0);
  const pick = () => {
    let v = r() * total;
    for (const [s, x] of pool) if ((v -= x) <= 0) return s;
    return pool[0][0];
  };
  for (let attempt = 0; attempt < 30; attempt++) {
    const set = [pick(), pick(), pick()];
    if (!guarantee || set.some((s) => spots(board, s).length)) return set.map((s) => SHAPES.indexOf(s));
  }
  const fit = SHAPES.filter((s) => spots(board, s).length);
  return [fit.length ? SHAPES.indexOf(r.pick(fit)) : 0, SHAPES.indexOf(pick()), SHAPES.indexOf(pick())];
}

export function bestMove(board, pieces) {
  let best = null;
  pieces.forEach((p, k) => {
    if (p < 0) return;
    for (const [r, c] of spots(board, SHAPES[p])) {
      const res = place(board, SHAPES[p], r, c, 0);
      let edges = 0;
      SHAPES[p].cells.forEach(([y, x]) => {
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const rr = r + y + dy, cc = c + x + dx;
          if (rr < 0 || cc < 0 || rr >= N || cc >= N || board[rr * N + cc] >= 0) edges++;
        }
      });
      const value = res.lines * 100 + edges;
      if (!best || value > best.value) best = { k, r, c, value };
    }
  });
  return best;
}

export function obstacles(seed, count) {
  const r = rng(seed), board = new Array(N * N).fill(-1);
  for (let k = 0; k < count; k++) board[r.int(N * N)] = 99;
  return board;
}
