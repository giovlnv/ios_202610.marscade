import { rng } from '../../core/rng.js';
import SPRITES from './art.json' with { type: 'json' };
import PAINTINGS from './paintings.json' with { type: 'json' };

export const ART = { ...SPRITES, ...PAINTINGS };
export const PAINTING_KEYS = Object.keys(PAINTINGS);
export const SPRITE_KEYS = Object.keys(SPRITES);
export const LETTERS = [...'abcdefghij'];
export const SLOTS = 9;
export const HOLE = -1, OFF = -2;

export function target(name) {
  const { rows } = ART[name];
  const h = rows.length, w = rows[0].length, cells = new Int8Array(w * h);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { cells[y * w + x] = ch === '.' ? OFF : LETTERS.indexOf(ch); }));
  return { w, h, cells };
}

export function scramble(goal, fraction, seed, size = 2) {
  const r = rng(seed), { w, h, cells } = goal, board = Array.from(cells);
  const blocks = [];
  for (let y = 0; y + size <= h; y += size) for (let x = 0; x + size <= w; x += size) {
    const idx = [];
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) idx.push((y + dy) * w + x + dx);
    if (idx.every((i) => cells[i] >= 0)) blocks.push(idx);
  }
  const picked = r.shuffle(blocks).slice(0, Math.round(blocks.length * fraction));
  const order = picked.map((_, k) => k);
  for (let k = order.length - 1; k > 0; k--) { const j = r.int(k); [order[k], order[j]] = [order[j], order[k]]; }
  picked.forEach((idx, k) => idx.forEach((i, n) => { board[i] = cells[picked[order[k]][n]]; }));
  const inBlock = new Set(picked.flat());
  const loose = [];
  cells.forEach((c, i) => { if (c >= 0 && !inBlock.has(i)) loose.push(i); });
  const spots = r.shuffle(loose).slice(0, Math.round(loose.length * fraction));
  const colors = r.shuffle(spots.map((i) => cells[i]));
  spots.forEach((i, k) => { board[i] = colors[k]; });
  return board;
}

export const correct = (goal, board) => goal.cells.reduce((n, c, i) => n + (c >= 0 && board[i] === c ? 1 : 0), 0);
export const total = (goal) => goal.cells.filter((c) => c >= 0).length;
export const solved = (goal, st) => st.board.every((c, i) => c === goal.cells[i]);
export const newState = (board, trays) => ({ board: board.slice(), trays: Array.from({ length: trays }, () => ({ c: -1, n: 0 })) });

const wrong = (goal, board, i) => board[i] >= 0 && board[i] !== goal.cells[i];
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

function holeFor(goal, board, c, near) {
  let best = -1, bd = Infinity;
  for (let j = 0; j < board.length; j++) {
    if (board[j] !== HOLE || goal.cells[j] !== c) continue;
    const d = dist(goal.w, j, near);
    if (d < bd) { bd = d; best = j; }
  }
  return best;
}

function trayFor(st, c) {
  const k = st.trays.findIndex((t) => t.c === c && t.n < SLOTS);
  return k >= 0 ? k : st.trays.findIndex((t) => t.n === 0);
}

export function canLift(goal, st, i) {
  if (!wrong(goal, st.board, i)) return false;
  const c = st.board[i];
  return holeFor(goal, st.board, c, i) >= 0 || trayFor(st, c) >= 0;
}

export function settle(goal, st) {
  const moves = [];
  st.trays.forEach((t, k) => {
    while (t.n > 0) {
      const h = holeFor(goal, st.board, t.c, 0);
      if (h < 0) break;
      st.board[h] = t.c;
      t.n--;
      moves.push({ tray: k, to: h, c: t.c });
    }
    if (!t.n) t.c = -1;
  });
  return moves;
}

export function lift(goal, st, i) {
  if (!wrong(goal, st.board, i)) return [];
  const c = st.board[i], moves = [];
  for (const j of group(goal, st.board, i)) {
    const h = holeFor(goal, st.board, c, j);
    if (h >= 0) {
      st.board[j] = HOLE;
      st.board[h] = c;
      moves.push({ from: j, to: h, c });
      continue;
    }
    const k = trayFor(st, c);
    if (k < 0) break;
    st.board[j] = HOLE;
    st.trays[k].c = c;
    st.trays[k].n++;
    moves.push({ from: j, tray: k, c });
  }
  return moves.concat(settle(goal, st));
}

export function bestLift(goal, st) {
  let best = -1, score = -1;
  const seen = new Set();
  st.board.forEach((c, i) => {
    if (seen.has(i) || !wrong(goal, st.board, i)) return;
    const g = group(goal, st.board, i);
    g.forEach((j) => seen.add(j));
    if (!canLift(goal, st, i)) return;
    const s = (holeFor(goal, st.board, c, i) >= 0 ? 1000 : 0) + g.length;
    if (s > score) { score = s; best = i; }
  });
  return best < 0 ? undefined : best;
}

export function playout(goal, board, trays, r) {
  const st = newState(board, trays);
  let taps = 0;
  for (; taps < 20000 && !solved(goal, st); taps++) {
    let i = bestLift(goal, st);
    if (r) {
      const options = [];
      st.board.forEach((_, j) => { if (canLift(goal, st, j)) options.push(j); });
      if (options.length) i = options[r.int(options.length)];
    }
    if (i === undefined) return { ok: false, taps };
    lift(goal, st, i);
  }
  return { ok: solved(goal, st), taps };
}
