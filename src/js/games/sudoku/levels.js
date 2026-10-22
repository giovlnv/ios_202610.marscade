import { rng, hashSeed } from '../../core/rng.js';
import { generate } from './engine.js';

export function levelSpec(level) {
  const r = rng(hashSeed('sudoku-spec', level));
  if (level % 10 === 0) return 3;
  if (level % 5 === 0) return 2;
  return level > 2 && r() < Math.min(0.75, 0.2 + level * 0.015) ? 1 : 0;
}

const cache = new Map();

export function buildLevel(level) {
  if (!cache.has(level)) {
    const tier = levelSpec(level);
    cache.set(level, { level, ...generate(hashSeed('sudoku', level), tier, tier >= 2 ? 80 : 15) });
  }
  return cache.get(level);
}
