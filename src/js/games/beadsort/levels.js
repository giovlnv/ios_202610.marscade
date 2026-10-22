import { rng, hashSeed } from '../../core/rng.js';
import { target, scramble, playout, PAINTING_KEYS, SPRITE_KEYS } from './engine.js';

export const TRAYS = 2;
const SPECS = [
  { pool: SPRITE_KEYS, fraction: 0.7, size: 3, pace: 4 },
  { pool: SPRITE_KEYS, fraction: 0.95, size: 2, pace: 3.5 },
  { pool: PAINTING_KEYS, fraction: 0.4, size: 3, pace: 3 },
  { pool: PAINTING_KEYS, fraction: 0.6, size: 3, pace: 2.6 },
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
  const name = r.pick(spec.pool), goal = target(name);
  const board = scramble(goal, spec.fraction, hashSeed('beadsort-mix', level), spec.size);
  const { taps } = playout(goal, board, TRAYS);
  const out = { level, tier, name, board, trays: TRAYS, taps, seconds: Math.round((taps * spec.pace + 20) / 5) * 5 };
  cache.set(level, out);
  return out;
}
