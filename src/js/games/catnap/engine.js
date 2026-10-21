import { rng } from '../../core/rng.js';

export const TIERS = ['easy', 'medium', 'hard', 'super'];

export function geometry(n, reg) {
  const rows = [], cols = [], regs = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    rows.push(Array.from({ length: n }, (_, c) => i * n + c));
    cols.push(Array.from({ length: n }, (_, r) => r * n + i));
  }
  for (let i = 0; i < n * n; i++) regs[reg[i]].push(i);
  const houses = [...rows, ...cols, ...regs];
  const houseOf = Array.from({ length: n * n }, (_, i) => [Math.floor(i / n), n + (i % n), 2 * n + reg[i]]);
  const attack = Array.from({ length: n * n }, (_, i) => {
    const r = Math.floor(i / n), c = i % n, s = new Set([...rows[r], ...cols[c], ...regs[reg[i]]]);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) s.add(rr * n + cc);
    }
    s.delete(i);
    return [...s];
  });
  return { n, reg, rows, cols, regs, houses, houseOf, attack };
}

export function countSolutions(n, reg, limit = 2, avoid = null) {
  const N = n * n, out = [];
  const rowU = new Uint8Array(n), colU = new Uint8Array(n), regU = new Uint8Array(n), block = new Uint8Array(N);
  const houses = [];
  for (let k = 0; k < n; k++) {
    houses.push(Array.from({ length: n }, (_, c) => k * n + c));
    houses.push(Array.from({ length: n }, (_, r) => r * n + k));
  }
  const regs = Array.from({ length: n }, () => []);
  for (let i = 0; i < N; i++) regs[reg[i]].push(i);
  houses.push(...regs);
  const near = Array.from({ length: N }, (_, i) => {
    const r = Math.floor(i / n), c = i % n, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < n && cc >= 0 && cc < n) out.push(rr * n + cc);
    }
    return out;
  });
  const free = (i) => !rowU[Math.floor(i / n)] && !colU[i % n] && !regU[reg[i]] && !block[i];
  const cats = [];
  const rec = () => {
    if (out.length >= limit) return;
    if (cats.length === n) {
      const col = new Array(n);
      for (const i of cats) col[Math.floor(i / n)] = i % n;
      if (!avoid || col.some((c, r) => c !== avoid[r])) out.push(col);
      return;
    }
    let best = null, bestCount = Infinity;
    for (const h of houses) {
      let cnt = 0;
      for (const i of h) if (free(i)) cnt++;
      const r0 = Math.floor(h[0] / n), c0 = h[0] % n;
      const done = (h === regs[reg[h[0]]] ? regU[reg[h[0]]] : h[1] === h[0] + 1 ? rowU[r0] : colU[c0]);
      if (done) continue;
      if (cnt < bestCount) { bestCount = cnt; best = h; if (!cnt) return; }
    }
    for (const i of best) {
      if (!free(i)) continue;
      const r = Math.floor(i / n), c = i % n, g = reg[i];
      rowU[r] = colU[c] = regU[g] = 1;
      for (const j of near[i]) block[j]++;
      cats.push(i);
      rec();
      cats.pop();
      for (const j of near[i]) block[j]--;
      rowU[r] = colU[c] = regU[g] = 0;
      if (out.length >= limit) return;
    }
  };
  rec();
  return out;
}

export function newState(geo) {
  return { cand: new Uint8Array(geo.n * geo.n).fill(1), cats: new Set(), done: new Uint8Array(geo.houses.length) };
}

const cloneState = (s) => ({ cand: s.cand.slice(), cats: new Set(s.cats), done: s.done.slice() });

export function place(geo, st, i) {
  st.cats.add(i);
  st.cand[i] = 0;
  for (const j of geo.attack[i]) st.cand[j] = 0;
  for (const h of geo.houseOf[i]) st.done[h] = 1;
}

function candsOf(geo, st, h) {
  const out = [];
  for (const i of geo.houses[h]) if (st.cand[i]) out.push(i);
  return out;
}

export function broken(geo, st) {
  for (let h = 0; h < geo.houses.length; h++) if (!st.done[h] && !geo.houses[h].some((i) => st.cand[i])) return true;
  return false;
}

function single(geo, st) {
  for (let h = 0; h < geo.houses.length; h++) {
    if (st.done[h]) continue;
    const c = candsOf(geo, st, h);
    if (c.length === 1) return { tech: 1, place: c[0] };
  }
}

function confine(geo, st) {
  for (let h = 0; h < geo.houses.length; h++) {
    if (st.done[h]) continue;
    const c = candsOf(geo, st, h);
    if (!c.length) continue;
    for (const g of geo.houseOf[c[0]]) {
      if (g === h || !c.every((i) => geo.houseOf[i].includes(g))) continue;
      const elim = candsOf(geo, st, g).filter((i) => !c.includes(i));
      if (elim.length) return { tech: 2, elim };
    }
  }
}

function cellKill(geo, st) {
  const elim = [];
  for (let i = 0; i < st.cand.length; i++) {
    if (!st.cand[i]) continue;
    const a = new Set(geo.attack[i]);
    for (let h = 0; h < geo.houses.length; h++) {
      if (st.done[h] || geo.houseOf[i].includes(h)) continue;
      const c = candsOf(geo, st, h);
      if (c.length && c.every((j) => a.has(j))) { elim.push(i); break; }
    }
  }
  if (elim.length) return { tech: 3, elim };
}

const maskCache = new Map();
function subsetMasks(m) {
  if (!maskCache.has(m)) {
    const out = [], maxK = Math.min(4, m - 2);
    for (let s = 1; s < (1 << m); s++) {
      let k = 0;
      for (let x = s; x; x &= x - 1) k++;
      if (k >= 2 && k <= maxK) out.push(s);
    }
    maskCache.set(m, out);
  }
  return maskCache.get(m);
}

function subsets(geo, st) {
  const n = geo.n, kinds = [0, 1, 2];
  for (const a of kinds) for (const b of kinds) {
    if (a === b) continue;
    const openA = [], openB = [];
    for (let k = 0; k < n; k++) {
      if (!st.done[a * n + k]) openA.push(k);
      if (!st.done[b * n + k]) openB.push(k);
    }
    const m = openB.length;
    if (m < 3) continue;
    const maskOf = openA.map((k) => {
      let mask = 0;
      for (const i of geo.houses[a * n + k]) if (st.cand[i]) mask |= 1 << (geo.houseOf[i][b] - b * n);
      return mask;
    });
    for (const s of subsetMasks(m)) {
      let set = 0, size = 0;
      for (let t = 0; t < m; t++) if (s & (1 << t)) { set |= 1 << openB[t]; size++; }
      const inside = [];
      openA.forEach((k, idx) => { if ((maskOf[idx] & ~set) === 0) inside.push(k); });
      if (inside.length !== size) continue;
      const elim = [];
      for (let t = 0; t < m; t++) {
        if (!(s & (1 << t))) continue;
        for (const i of geo.houses[b * n + openB[t]]) if (st.cand[i] && !inside.includes(geo.houseOf[i][a] - a * n)) elim.push(i);
      }
      if (elim.length) return { tech: 4, elim };
    }
  }
}

function propagate(geo, st, maxTech) {
  for (let guard = 0; guard < 200; guard++) {
    if (broken(geo, st)) return false;
    if (st.cats.size === geo.n) return true;
    const d = step(geo, st, maxTech);
    if (!d) return true;
    apply(geo, st, d);
  }
  return true;
}

function trial(geo, st) {
  for (let i = 0; i < st.cand.length; i++) {
    if (!st.cand[i]) continue;
    const t = cloneState(st);
    place(geo, t, i);
    if (!propagate(geo, t, 3)) return { tech: 5, elim: [i] };
  }
}

const TECHS = [single, confine, cellKill, subsets, trial];

export function step(geo, st, maxTech = 5) {
  for (let k = 0; k < maxTech; k++) {
    const d = TECHS[k](geo, st);
    if (d) return d;
  }
  return null;
}

export function apply(geo, st, d) {
  if (d.place !== undefined) place(geo, st, d.place);
  else for (const i of d.elim) st.cand[i] = 0;
}

export function grade(geo) {
  const st = newState(geo);
  let max = 0, trials = 0;
  while (st.cats.size < geo.n) {
    const d = step(geo, st);
    if (!d) return { solved: false, max: 6, trials };
    max = Math.max(max, d.tech);
    if (d.tech === 5) trials++;
    apply(geo, st, d);
    if (broken(geo, st)) return { solved: false, max: 6, trials };
  }
  return { solved: true, max, trials };
}

export function tierOf(g) {
  if (!g.solved) return 3;
  if (g.max <= 2) return 0;
  if (g.max === 3) return 1;
  if (g.max === 4) return 2;
  return 3;
}

function randomSolution(n, r) {
  const col = [], used = new Uint8Array(n);
  const rec = (row) => {
    if (row === n) return true;
    for (const c of r.shuffle([...Array(n).keys()])) {
      if (used[c] || (row > 0 && Math.abs(c - col[row - 1]) < 2)) continue;
      used[c] = 1; col[row] = c;
      if (rec(row + 1)) return true;
      used[c] = 0;
    }
    return false;
  };
  rec(0);
  return col;
}

const nbrs4 = (n, i) => {
  const r = Math.floor(i / n), c = i % n, out = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
};

function growRegions(n, sol, r) {
  const reg = new Int8Array(n * n).fill(-1);
  const weight = Array.from({ length: n }, () => 0.15 + r() ** 2 * 3);
  sol.forEach((c, row) => { reg[row * n + c] = row; });
  let left = n * n - n;
  while (left > 0) {
    const options = [];
    for (let i = 0; i < n * n; i++) {
      if (reg[i] !== -1) continue;
      for (const j of nbrs4(n, i)) if (reg[j] !== -1) options.push([i, reg[j], weight[reg[j]]]);
    }
    let total = options.reduce((s, o) => s + o[2], 0), pick = r() * total;
    const o = options.find((x) => (pick -= x[2]) <= 0) || options[options.length - 1];
    reg[o[0]] = o[1];
    left--;
  }
  return reg;
}

function connectedWithout(n, reg, g, skip) {
  const cells = [];
  for (let i = 0; i < n * n; i++) if (reg[i] === g && i !== skip) cells.push(i);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), q = [cells[0]];
  while (q.length) for (const j of nbrs4(n, q.pop())) if (j !== skip && reg[j] === g && !seen.has(j)) { seen.add(j); q.push(j); }
  return seen.size === cells.length;
}

function makeUnique(n, reg, sol, r) {
  const solCells = new Set(sol.map((c, row) => row * n + c));
  for (let iter = 0; iter < 60; iter++) {
    const [alt] = countSolutions(n, reg, 1, sol);
    if (!alt) return reg;
    const moves = [];
    alt.forEach((c, row) => {
      const i = row * n + c;
      if (solCells.has(i)) return;
      for (const j of nbrs4(n, i)) if (reg[j] !== reg[i]) moves.push([i, reg[j]]);
    });
    let done = false;
    for (const [i, g] of r.shuffle(moves)) {
      if (!connectedWithout(n, reg, reg[i], i)) continue;
      reg[i] = g;
      done = true;
      break;
    }
    if (!done) return null;
  }
  return null;
}

export function generate(n, seed, tier, budget = 60) {
  const r = rng(seed);
  let best = null;
  for (let a = 0; a < budget; a++) {
    const sol = randomSolution(n, r);
    const reg = makeUnique(n, growRegions(n, sol, r), sol, r);
    if (!reg) continue;
    const g = grade(geometry(n, reg));
    const t = tierOf(g);
    const cand = { n, reg: Array.from(reg), sol, tier: t };
    if (t === tier) return cand;
    if (!best || Math.abs(t - tier) < Math.abs(best.tier - tier) || (t < tier && t > best.tier)) best = cand;
  }
  return best;
}
