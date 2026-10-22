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

export function scramble(goal, fraction, seed) {
  const r = rng(seed), board = Array.from(goal.cells);
  const spots = [];
  goal.cells.forEach((c, i) => { if (c >= 0) spots.push(i); });
  const picked = r.shuffle(spots).slice(0, Math.max(2, Math.round(spots.length * fraction)));
  const colors = r.shuffle(picked.map((i) => goal.cells[i]));
  for (let pass = 0; pass < 3; pass++) {
    picked.forEach((i, k) => {
      if (colors[k] !== goal.cells[i]) return;
      const j = picked.findIndex((p, m) => colors[m] !== goal.cells[i] && colors[k] !== goal.cells[p]);
      if (j >= 0) [colors[k], colors[j]] = [colors[j], colors[k]];
    });
  }
  picked.forEach((i, k) => { board[i] = colors[k]; });
  return board;
}

export const correct = (goal, board) => goal.cells.reduce((n, c, i) => n + (c >= 0 && board[i] === c ? 1 : 0), 0);
export const total = (goal) => goal.cells.filter((c) => c >= 0).length;

export function settle(goal, st) {
  const placed = [];
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < st.board.length; i++) {
      if (st.board[i] !== HOLE) continue;
      const k = st.trays.indexOf(goal.cells[i]);
      if (k < 0) continue;
      st.trays.splice(k, 1);
      st.board[i] = goal.cells[i];
      placed.push(i);
      changed = true;
    }
  }
  return placed;
}

export function lift(st, i, cap) {
  if (st.board[i] < 0 || st.trays.length >= cap) return false;
  st.trays.push(st.board[i]);
  st.board[i] = HOLE;
  return true;
}

export function group(goal, board, i, test, limit) {
  const { w } = goal, out = [i], seen = new Set(out);
  for (let q = 0; q < out.length && out.length < limit; q++) {
    const j = out[q], x = j % w;
    for (const n of [j - w, j + w, x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1]) {
      if (n < 0 || n >= board.length || seen.has(n) || !test(n)) continue;
      seen.add(n);
      out.push(n);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function liftGroup(goal, st, i, cap) {
  const c = st.board[i];
  if (c < 0 || c === goal.cells[i] || st.trays.length >= cap) return [];
  const g = group(goal, st.board, i, (n) => st.board[n] === c && goal.cells[n] !== c, cap - st.trays.length);
  g.forEach((n) => lift(st, n, cap));
  return g;
}

export function placeGroup(goal, st, c, i) {
  if (st.board[i] !== HOLE || goal.cells[i] !== c) return [];
  const have = st.trays.filter((t) => t === c).length;
  const g = have ? group(goal, st.board, i, (n) => st.board[n] === HOLE && goal.cells[n] === c, have) : [];
  g.forEach((n) => place(goal, st, st.trays.indexOf(c), n));
  return g;
}

export function place(goal, st, k, i) {
  if (st.board[i] !== HOLE || st.trays[k] !== goal.cells[i]) return false;
  st.board[i] = st.trays[k];
  st.trays.splice(k, 1);
  return true;
}

export function canPlaceAny(goal, st) {
  return st.board.some((c, i) => c === HOLE && st.trays.includes(goal.cells[i]));
}

export const jammed = (goal, st, cap) => st.trays.length >= cap && !canPlaceAny(goal, st);

export function unjam(st) {
  const holes = [];
  st.board.forEach((c, i) => { if (c === HOLE) holes.push(i); });
  holes.forEach((i, k) => { st.board[i] = st.trays[k]; });
  st.trays = [];
  return holes;
}

export const solved = (goal, st) => st.board.every((c, i) => c === goal.cells[i]);

function misplaced(goal, st) {
  const out = [];
  st.board.forEach((c, i) => { if (c >= 0 && c !== goal.cells[i]) out.push(i); });
  return out;
}

export function bestLift(goal, st) {
  const wrong = misplaced(goal, st);
  const holeTargets = new Set();
  st.board.forEach((c, i) => { if (c === HOLE) holeTargets.add(goal.cells[i]); });
  return wrong.find((i) => holeTargets.has(st.board[i]))
    ?? wrong.find((i) => st.trays.includes(goal.cells[i]))
    ?? wrong[0];
}

export function playout(goal, board, cap, r) {
  const st = { board: board.slice(), trays: [] };
  for (let guard = 0; guard < 5000 && !solved(goal, st); guard++) {
    const wrong = misplaced(goal, st);
    const i = r ? wrong[r.int(wrong.length)] : bestLift(goal, st);
    lift(st, i, cap);
    settle(goal, st);
    if (!solved(goal, st) && st.trays.length >= cap) return false;
  }
  return solved(goal, st);
}
