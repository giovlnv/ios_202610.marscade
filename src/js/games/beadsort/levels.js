import { rng, hashSeed } from '../../core/rng.js';
import { target, scramble, playout, correct, PAINTING_KEYS, SPRITE_KEYS } from './engine.js';

export const TRAYS = 2;
const SPECS = [
  { pool: SPRITE_KEYS, size: 3, pace: 2.4 },
  { pool: SPRITE_KEYS, size: 2, pace: 2 },
  { pool: PAINTING_KEYS, size: 3, pace: 1.5 },
  { pool: PAINTING_KEYS, size: 2, pace: 1.3 },
];

export function levelSpec(level) {
  const r = rng(hashSeed('beadsort-spec', level));
  if (level % 10 === 0) return 3;
  if (level % 5 === 0) return 2;
  return level > 2 && r() < Math.min(0.7, 0.2 + level * 0.012) ? 1 : 0;
}

const cache = new Map();

export function buildLevel(level) {
  if (cache.has(level)) return cache.get(level);
  const tier = levelSpec(level), spec = SPECS[tier], r = rng(hashSeed('beadsort', level));
  let name, goal, board;
  for (let k = 0; k < 20; k++) {
    name = r.pick(spec.pool);
    goal = target(name);
    board = scramble(goal, hashSeed('beadsort-mix', level, k), spec.size);
    if (!correct(goal, board)) break;
  }
  const { taps } = playout(goal, board, TRAYS);
  const out = { level, tier, name, board, trays: TRAYS, taps, seconds: Math.round((taps * spec.pace + 20) / 5) * 5 };
  cache.set(level, out);
  return out;
}
