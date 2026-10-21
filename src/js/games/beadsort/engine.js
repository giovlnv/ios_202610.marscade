import { rng } from '../../core/rng.js';
import SPRITES from './art.json' with { type: 'json' };
import PAINTINGS from './paintings.json' with { type: 'json' };

export const ART = { ...SPRITES, ...PAINTINGS };
export const PAINTING_KEYS = Object.keys(PAINTINGS);
export const SPRITE_KEYS = Object.keys(SPRITES);
export const LETTERS = [...'abcdefghij'];

export const CAP = 9;

export function cloneState(s) {
  return { w: s.w, h: s.h, beads: s.beads.slice(), trays: s.trays.map((t) => ({ ...t })), left: s.left.slice() };
}

export function exposed(s, i) {
  if (s.beads[i] < 0) return false;
  const x = i % s.w, y = Math.floor(i / s.w);
  return x === 0 || y === 0 || x === s.w - 1 || y === s.h - 1
    || s.beads[i - 1] < 0 || s.beads[i + 1] < 0 || s.beads[i - s.w] < 0 || s.beads[i + s.w] < 0;
}

export function trayFor(s, color) {
  const same = s.trays.findIndex((t) => t.c === color && t.n < CAP);
  return same >= 0 ? same : s.trays.findIndex((t) => t.c < 0);
}

export function take(s, i) {
  const c = s.beads[i], k = trayFor(s, c);
  if (k < 0) return -1;
  s.beads[i] = -1;
  s.left[c]--;
  const t = s.trays[k];
  t.c = c;
  t.n++;
  if (t.n === CAP || s.left[c] === 0) { t.c = -1; t.n = 0; }
  return k;
}

export const empty = (s) => s.left.every((n) => n === 0);

export function play(start, r, maxSteps = 2000) {
  const s = cloneState(start), path = [];
  for (let step = 0; step < maxSteps && !empty(s); step++) {
    let best = -1, bestScore = -Infinity;
    for (let i = 0; i < s.beads.length; i++) {
      if (!exposed(s, i)) continue;
      const c = s.beads[i], k = trayFor(s, c);
      if (k < 0) continue;
      const t = s.trays[k];
      let score = t.c === c ? 100 + t.n * 3 : 20 - Math.min(s.left[c], CAP) * 2;
      if (t.c !== c && s.trays.filter((x) => x.c < 0).length === 1) score -= 60;
      score += r() * (r.noise ?? 6);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) return null;
    path.push(best);
    take(s, best);
  }
  return empty(s) ? path : null;
}

export function solve(start, seed = 1, tries = 40) {
  for (let k = 0; k < tries; k++) {
    const r = rng(seed + k * 7919);
    r.noise = k === 0 ? 0.5 : 6 + k;
    const p = play(start, r);
    if (p) return p;
  }
  return null;
}

export function fromRows(rows, palette) {
  const h = rows.length, w = rows[0].length, beads = new Int16Array(w * h).fill(-1);
  const left = new Array(palette.length).fill(0);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const c = palette.indexOf(ch);
    beads[y * w + x] = c;
    left[c]++;
  }));
  return { w, h, beads, left };
}

export function generate(seed, { trays, pool }) {
  const r = rng(seed);
  const keys = pool || SPRITE_KEYS;
  for (let attempt = 0; attempt < 20; attempt++) {
    const name = r.pick(keys), { rows, palette } = ART[name];
    const state = { ...fromRows(rows, LETTERS.slice(0, palette.length)), trays: Array.from({ length: trays }, () => ({ c: -1, n: 0 })) };
    const path = solve(state, seed + attempt, 25);
    if (path) return { name, rows, palette, trays, path, beadCount: path.length };
  }
  return null;
}
