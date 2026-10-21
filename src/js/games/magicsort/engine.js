import { rng } from '../../core/rng.js';

const top = (t) => t[t.length - 1];

export function runLength(t) {
  let n = 0;
  for (let i = t.length - 1; i >= 0 && t[i] === top(t); i--) n++;
  return n;
}

export function canPour(tubes, cap, a, b) {
  const A = tubes[a], B = tubes[b];
  return a !== b && A.length > 0 && B.length < cap && (B.length === 0 || top(B) === top(A));
}

export function pour(tubes, cap, a, b) {
  const A = tubes[a], B = tubes[b];
  const n = Math.min(runLength(A), cap - B.length);
  for (let i = 0; i < n; i++) B.push(A.pop());
  return n;
}

const done = (t, cap) => t.length === 0 || (t.length === cap && runLength(t) === cap);
export const solved = (tubes, cap) => tubes.every((t) => done(t, cap));
const key = (tubes) => tubes.map((t) => t.join(',')).sort().join('|');

export function solve(start, cap, maxNodes = 60000) {
  const seen = new Set();
  let nodes = 0;
  const path = [];
  const rec = (tubes) => {
    if (solved(tubes, cap)) return true;
    if (++nodes > maxNodes) return false;
    const k = key(tubes);
    if (seen.has(k)) return false;
    seen.add(k);
    const moves = [];
    tubes.forEach((A, a) => {
      if (!A.length || done(A, cap)) return;
      const run = runLength(A);
      let emptyTried = false;
      tubes.forEach((B, b) => {
        if (!canPour(tubes, cap, a, b)) return;
        if (!B.length) {
          if (run === A.length || emptyTried) return;
          emptyTried = true;
          moves.push([a, b, 0]);
        } else moves.push([a, b, run <= cap - B.length ? 2 : 1]);
      });
    });
    moves.sort((x, y) => y[2] - x[2]);
    for (const [a, b] of moves) {
      const next = tubes.map((t) => t.slice());
      pour(next, cap, a, b);
      path.push([a, b]);
      if (rec(next)) return true;
      path.pop();
    }
    return false;
  };
  const ok = rec(start.map((t) => t.slice()));
  return ok ? path : null;
}

export function generate(seed, { colors, cap, empty }, attempts = 40) {
  const r = rng(seed);
  for (let a = 0; a < attempts; a++) {
    const pool = r.shuffle(Array.from({ length: colors * cap }, (_, i) => Math.floor(i / cap)));
    const tubes = Array.from({ length: colors }, (_, i) => pool.slice(i * cap, (i + 1) * cap));
    for (let e = 0; e < empty; e++) tubes.push([]);
    if (tubes.some((t) => t.length && runLength(t) >= cap - 1)) continue;
    const path = solve(tubes, cap);
    if (path) return { tubes, cap, moves: path.length };
  }
  return null;
}
