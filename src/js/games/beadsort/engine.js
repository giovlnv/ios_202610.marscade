import { rng } from '../../core/rng.js';
import SPRITES from './art.json' with { type: 'json' };
import PAINTINGS from './paintings.json' with { type: 'json' };

export const ART = { ...SPRITES, ...PAINTINGS };
export const PAINTING_KEYS = Object.keys(PAINTINGS);
export const SPRITE_KEYS = Object.keys(SPRITES);
export const LETTERS = [...'abcdefghij'];
export const SLOTS = 9;
export const HOLE = -1, OFF = -2;

const targets = new Map();

function smooth(cells, w, h, passes) {
  let c = Array.from(cells);
  for (let p = 0; p < passes; p++) {
    const n = c.slice();
    for (let i = 0; i < c.length; i++) {
      if (c[i] < 0) continue;
      const x = i % w, y = Math.floor(i / w), votes = new Map();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy, v = c[Y * w + X];
        if (X < 0 || Y < 0 || X >= w || Y >= h || v < 0) continue;
        votes.set(v, (votes.get(v) || 0) + (dx || dy ? 1 : 1.5));
      }
      n[i] = [...votes].sort((a, b) => b[1] - a[1])[0][0];
    }
    c = n;
  }
  return Int8Array.from(c);
}

export function target(name) {
  if (targets.has(name)) return targets.get(name);
  const { rows } = ART[name];
  const h = rows.length, w = rows[0].length;
  let cells = new Int8Array(w * h);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { cells[y * w + x] = ch === '.' ? OFF : LETTERS.indexOf(ch); }));
  if (name in PAINTINGS) cells = smooth(cells, w, h, 2);
  const out = { w, h, cells };
  targets.set(name, out);
  return out;
}

export function scramble(goal, seed, size = 2) {
  const r = rng(seed), { w, h, cells } = goal, board = Array.from(cells);
  const blocks = [];
  for (let y = 0; y + size <= h; y += size) for (let x = 0; x + size <= w; x += size) {
    const idx = [];
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) idx.push((y + dy) * w + x + dx);
    if (idx.every((i) => cells[i] >= 0)) blocks.push(idx);
  }
  const order = r.shuffle(blocks.map((_, k) => k));
  blocks.forEach((idx, k) => idx.forEach((i, n) => { board[i] = cells[blocks[order[k]][n]]; }));
  const spots = [];
  cells.forEach((c, i) => { if (c >= 0) spots.push(i); });
  for (let pass = 0; pass < 4; pass++) {
    for (const i of r.shuffle(spots.slice())) {
      if (board[i] !== cells[i]) continue;
      const j = spots.find((j) => board[j] !== cells[i] && board[i] !== cells[j]);
      if (j !== undefined) [board[i], board[j]] = [board[j], board[i]];
    }
  }
  return board;
}

export const correct = (goal, board) => goal.cells.reduce((n, c, i) => n + (c >= 0 && board[i] === c ? 1 : 0), 0);
export const total = (goal) => goal.cells.filter((c) => c >= 0).length;
export const solved = (goal, st) => st.board.every((c, i) => c === goal.cells[i]);
export const newState = (board, trays) => ({ board: board.slice(), trays: Array.from({ length: trays }, () => ({ c: -1, n: 0 })) });

export const wrong = (goal, board, i) => board[i] >= 0 && board[i] !== goal.cells[i];
const dist = (w, a, b) => Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w));

export function group(goal, board, i) {
  const { w } = goal, c = board[i], out = [i], seen = new Set(out);
  for (let q = 0; q < out.length; q++) {
    const j = out[q], x = j % w;
    for (const n of [j - w, j + w, x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1]) {
      if (n < 0 || n >= board.length || seen.has(n) || board[n] !== c || !wrong(goal, board, n)) continue;
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

export const trayFits = (st, k, c) => st.trays[k].n < SLOTS && (st.trays[k].n === 0 || st.trays[k].c === c);

function holesFor(goal, board, c, near) {
  const out = [];
  board.forEach((b, j) => { if (b === HOLE && goal.cells[j] === c) out.push(j); });
  return out.sort((a, b) => dist(goal.w, a, near) - dist(goal.w, b, near));
}

export function toTray(st, cellsIdx, k) {
  const c = st.board[cellsIdx[0]], moves = [];
  for (const j of cellsIdx) {
    if (!trayFits(st, k, c)) break;
    st.board[j] = HOLE;
    st.trays[k].c = c;
    st.trays[k].n++;
    moves.push({ from: j, tray: k, c });
  }
  return moves;
}

export function toHoles(goal, st, src, at) {
  const fromTray = typeof src === 'number';
  const c = fromTray ? st.trays[src].c : st.board[src[0]];
  if (goal.cells[at] !== c || st.board[at] !== HOLE) return [];
  const holes = holesFor(goal, st.board, c, at), moves = [];
  const beads = fromTray ? Array.from({ length: st.trays[src].n }, () => null) : src.slice();
  for (const h of holes) {
    if (!beads.length) break;
    const j = beads.shift();
    if (fromTray) {
      st.trays[src].n--;
      moves.push({ tray: src, to: h, c });
    } else {
      st.board[j] = HOLE;
      moves.push({ from: j, to: h, c });
    }
    st.board[h] = c;
  }
  if (fromTray && !st.trays[src].n) st.trays[src].c = -1;
  return moves;
}

export function bestMove(goal, st) {
  for (let k = 0; k < st.trays.length; k++) {
    const t = st.trays[k];
    if (t.n) { const h = holesFor(goal, st.board, t.c, 0); if (h.length) return { tray: k, at: h[0] }; }
  }
  let best = null, score = -1;
  const seen = new Set();
  st.board.forEach((c, i) => {
    if (seen.has(i) || !wrong(goal, st.board, i)) return;
    const g = group(goal, st.board, i);
    g.forEach((j) => seen.add(j));
    const h = holesFor(goal, st.board, c, i);
    if (h.length && 1000 + g.length > score) { score = 1000 + g.length; best = { group: g, at: h[0] }; return; }
    const k = st.trays.findIndex((t) => t.n && t.c === c && t.n < SLOTS);
    const e = k >= 0 ? k : st.trays.findIndex((t) => !t.n);
    if (e >= 0 && g.length > score && score < 1000) { score = g.length; best = { group: g, toTray: e }; }
  });
  return best;
}

export function apply(goal, st, m) {
  if (m.tray !== undefined) return toHoles(goal, st, m.tray, m.at);
  if (m.toTray !== undefined) return toTray(st, m.group, m.toTray);
  return toHoles(goal, st, m.group, m.at);
}

export function playout(goal, board, trays) {
  const st = newState(board, trays);
  let taps = 0;
  for (let guard = 0; guard < 20000 && !solved(goal, st); guard++) {
    const m = bestMove(goal, st);
    if (!m || !apply(goal, st, m).length) return { ok: false, taps };
    taps += 2;
  }
  return { ok: solved(goal, st), taps };
}
