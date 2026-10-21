import { rng, hashSeed } from '../../core/rng.js';
import { target, scramble, playout, PAINTING_KEYS, SPRITE_KEYS } from './engine.js';

const SPECS = [
  { pool: SPRITE_KEYS, fraction: 0.25, trays: 2 },
  { pool: SPRITE_KEYS, fraction: 0.6, trays: 1 },
  { pool: PAINTING_KEYS, fraction: 0.2, trays: 1 },
  { pool: PAINTING_KEYS, fraction: 0.35, trays: 1 },
];
const BANDS = [[0.95, 1.01], [0.6, 0.95], [0.15, 0.6], [0, 0.15]];

export function levelSpec(level) {
  const r = rng(hashSeed('beadsort-spec', level));
  if (level % 10 === 0) return 3;
  if (level % 5 === 0) return 2;
  return level > 2 && r() < Math.min(0.7, 0.2 + level * 0.012) ? 1 : 0;
}

export function randomWinRate(goal, board, cap, plays = 16) {
  let wins = 0;
  for (let k = 0; k < plays; k++) if (playout(goal, board, cap, rng(k * 977 + 3))) wins++;
  return wins / plays;
}

const cache = new Map();

export function buildLevel(level) {
  if (cache.has(level)) return cache.get(level);
  const tier = levelSpec(level), spec = SPECS[tier], r = rng(hashSeed('beadsort', level));
  let best = null;
  for (let k = 0; k < 12; k++) {
    const name = r.pick(spec.pool), goal = target(name);
    const board = scramble(goal, spec.fraction, hashSeed('beadsort-mix', level, k));
    const cap = spec.trays * 9;
    if (!playout(goal, board, cap)) continue;
    const rate = randomWinRate(goal, board, cap), [lo, hi] = BANDS[tier];
    const miss = rate < lo ? lo - rate : rate >= hi ? rate - hi : 0;
    if (!best || miss < best.miss) best = { name, board, trays: spec.trays, rate, miss };
    if (!miss) break;
  }
  const t = BANDS.findIndex(([lo, hi]) => best.rate >= lo && best.rate < hi);
  const tier2 = t < 0 ? 0 : t, goal = target(best.name);
  const wrong = best.board.filter((c, i) => c !== goal.cells[i]).length;
  const out = { level, tier: tier2, ...best, seconds: Math.round((wrong * [6, 5, 4, 3.5][tier2] + 30) / 5) * 5 };
  cache.set(level, out);
  return out;
}
