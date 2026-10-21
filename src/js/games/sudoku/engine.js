import { rng } from '../../core/rng.js';

const ALL = 0x3fe;
export const ROW = (i) => Math.floor(i / 9);
export const COL = (i) => i % 9;
export const BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);

export const UNITS = [];
for (let k = 0; k < 9; k++) {
  UNITS.push(Array.from({ length: 9 }, (_, j) => k * 9 + j));
  UNITS.push(Array.from({ length: 9 }, (_, j) => j * 9 + k));
  UNITS.push(Array.from({ length: 9 }, (_, j) => (Math.floor(k / 3) * 3 + Math.floor(j / 3)) * 9 + (k % 3) * 3 + (j % 3)));
}
export const PEERS = Array.from({ length: 81 }, (_, i) => {
  const s = new Set();
  for (const u of UNITS) if (u.includes(i)) u.forEach((j) => j !== i && s.add(j));
  return [...s];
});

const bits = (m) => { let c = 0; for (; m; m &= m - 1) c++; return c; };
const digits = (m) => { const out = []; for (let d = 1; d <= 9; d++) if (m & (1 << d)) out.push(d); return out; };

export function candidates(grid) {
  return grid.map((v, i) => {
    if (v) return 0;
    let m = ALL;
    for (const j of PEERS[i]) if (grid[j]) m &= ~(1 << grid[j]);
    return m;
  });
}

export function countSolutions(grid, limit = 2, r = null) {
  const g = grid.slice(), out = [];
  const rec = () => {
    if (out.length >= limit) return;
    let best = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      let m = ALL;
      for (const j of PEERS[i]) if (g[j]) m &= ~(1 << g[j]);
      const c = bits(m);
      if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (c <= 1) break; }
    }
    if (best < 0) { out.push(g.slice()); return; }
    if (!bestCount) return;
    const ds = digits(bestMask);
    if (r) r.shuffle(ds);
    for (const d of ds) {
      g[best] = d;
      rec();
      if (out.length >= limit) break;
    }
    g[best] = 0;
  };
  rec();
  return out;
}

function step(grid, cand, maxTech) {
  for (let i = 0; i < 81; i++) if (!grid[i] && bits(cand[i]) === 1) return { tech: 1, place: i, d: digits(cand[i])[0] };
  for (const u of UNITS) for (let d = 1; d <= 9; d++) {
    const spots = u.filter((i) => !grid[i] && cand[i] & (1 << d));
    if (spots.length === 1 && !u.some((i) => grid[i] === d)) return { tech: 1, place: spots[0], d };
  }
  if (maxTech < 2) return null;
  for (const u of UNITS) for (let d = 1; d <= 9; d++) {
    const spots = u.filter((i) => cand[i] & (1 << d));
    if (spots.length < 2) continue;
    for (const v of UNITS) {
      if (v === u || !spots.every((i) => v.includes(i))) continue;
      const elim = v.filter((i) => !spots.includes(i) && cand[i] & (1 << d));
      if (elim.length) return { tech: 2, elim: elim.map((i) => [i, 1 << d]) };
    }
  }
  if (maxTech < 3) return null;
  for (const size of [2, 3]) {
    for (const u of UNITS) {
      const open = u.filter((i) => cand[i]);
      for (const combo of combos(open, size)) {
        const m = combo.reduce((a, i) => a | cand[i], 0);
        if (bits(m) !== size) continue;
        const elim = open.filter((i) => !combo.includes(i) && cand[i] & m).map((i) => [i, m]);
        if (elim.length) return { tech: 3, elim };
      }
      const ds = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => open.some((i) => cand[i] & (1 << d)));
      for (const dc of combos(ds, size)) {
        const m = dc.reduce((a, d) => a | (1 << d), 0);
        const cells = open.filter((i) => cand[i] & m);
        if (cells.length !== size) continue;
        const elim = cells.filter((i) => cand[i] & ~m).map((i) => [i, ~m & ALL]);
        if (elim.length) return { tech: 3, elim };
      }
    }
  }
  if (maxTech < 4) return null;
  for (const [lines, cross] of [[0, 1], [1, 0]]) for (let d = 1; d <= 9; d++) {
    const pos = [];
    for (let a = 0; a < 9; a++) {
      const u = UNITS[a * 3 + lines], p = [];
      u.forEach((i, j) => { if (cand[i] & (1 << d)) p.push(j); });
      if (p.length === 2) pos.push([a, p]);
    }
    for (let x = 0; x < pos.length; x++) for (let y = x + 1; y < pos.length; y++) {
      if (pos[x][1].join() !== pos[y][1].join()) continue;
      const elim = [];
      for (const b of pos[x][1]) for (const i of UNITS[b * 3 + cross]) {
        const a = lines === 0 ? ROW(i) : COL(i);
        if (a !== pos[x][0] && a !== pos[y][0] && cand[i] & (1 << d)) elim.push([i, 1 << d]);
      }
      if (elim.length) return { tech: 4, elim };
    }
  }
  return null;
}

function* combos(arr, k, start = 0, acc = []) {
  if (acc.length === k) { yield acc.slice(); return; }
  for (let i = start; i < arr.length; i++) { acc.push(arr[i]); yield* combos(arr, k, i + 1, acc); acc.pop(); }
}

function applyStep(grid, cand, d) {
  if (d.place !== undefined) {
    grid[d.place] = d.d;
    cand[d.place] = 0;
    for (const j of PEERS[d.place]) cand[j] &= ~(1 << d.d);
  } else for (const [i, m] of d.elim) cand[i] &= ~m;
}

export function nextLogical(grid) {
  const g = grid.slice(), cand = candidates(g);
  for (let k = 0; k < 400; k++) {
    if (g.every(Boolean)) return null;
    const d = step(g, cand, 4);
    if (!d) return null;
    if (d.place !== undefined && !grid[d.place]) return d;
    applyStep(g, cand, d);
  }
  return null;
}

export function grade(grid) {
  const g = grid.slice(), cand = candidates(g);
  let max = 1;
  while (!g.every(Boolean)) {
    const d = step(g, cand, 4);
    if (!d) return 5;
    max = Math.max(max, d.tech);
    applyStep(g, cand, d);
  }
  return max;
}

export function tierOf(tech, clues) {
  if (tech === 1 && clues >= 34) return 0;
  if (tech <= 2) return 1;
  if (tech === 3) return 2;
  return 3;
}

export function generate(seed, tier, attempts = 30) {
  const r = rng(seed);
  let best = null;
  for (let a = 0; a < attempts; a++) {
    const [sol] = countSolutions(new Array(81).fill(0), 1, r);
    const puzzle = sol.slice();
    const order = r.shuffle([...Array(41).keys()]);
    const floor = tier === 0 ? 34 + r.int(5) : 0;
    let clues = 81;
    for (const i of order) {
      const pair = [i, 80 - i].filter((j, k, arr) => arr.indexOf(j) === k);
      if (clues - pair.length < floor) continue;
      const saved = pair.map((j) => puzzle[j]);
      pair.forEach((j) => { puzzle[j] = 0; });
      const ok = countSolutions(puzzle, 2).length === 1 && (tier === 3 || tierOf(grade(puzzle), clues - pair.length) <= tier);
      if (ok) clues -= pair.length;
      else pair.forEach((j, k) => { puzzle[j] = saved[k]; });
    }
    const t = tierOf(grade(puzzle), clues);
    const cand = { puzzle, sol, tier: t, clues };
    if (t === tier) return cand;
    if (!best || Math.abs(t - tier) < Math.abs(best.tier - tier)) best = cand;
  }
  return best;
}
