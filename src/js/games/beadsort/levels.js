import { rng, hashSeed } from '../../core/rng.js';
import { generate, fromRows, play, LETTERS, PAINTING_KEYS } from './engine.js';

const CONFIGS = [[{ trays: 3 }, { trays: 2 }], [{ trays: 2 }, { trays: 1 }], [{ trays: 3, pool: PAINTING_KEYS }, { trays: 2, pool: PAINTING_KEYS }], [{ trays: 2, pool: PAINTING_KEYS }, { trays: 1, pool: PAINTING_KEYS }]];
const BANDS = [[0.95, 1.01], [0.75, 0.95], [0.4, 0.75], [0, 0.4]];

export function levelSpec(level) {
  const r = rng(hashSeed('beadsort-spec', level));
  if (level % 10 === 0) return 3;
  if (level % 5 === 0) return 2;
  return level > 2 && r() < Math.min(0.7, 0.2 + level * 0.012) ? 1 : 0;
}

export function winRate(p, plays = 20) {
  const start = { ...fromRows(p.rows, LETTERS.slice(0, p.palette.length)), trays: Array.from({ length: p.trays }, () => ({ c: -1, n: 0 })) };
  let wins = 0;
  for (let k = 0; k < plays; k++) {
    const r = rng(k * 131 + 7);
    r.noise = 1e6;
    if (play(start, r)) wins++;
  }
  return wins / plays;
}

const cache = new Map();

export function buildLevel(level) {
  if (cache.has(level)) return cache.get(level);
  const tier = levelSpec(level), r = rng(hashSeed('beadsort', level));
  let best = null;
  for (let k = 0; k < 16; k++) {
    const p = generate(hashSeed('beadsort', level, k), r.pick(CONFIGS[tier]));
    if (!p) continue;
    const rate = winRate(p), [lo, hi] = BANDS[tier];
    const miss = rate < lo ? lo - rate : rate >= hi ? rate - hi : 0;
    if (!best || miss < best.miss) best = { ...p, miss, rate };
    if (!miss) break;
  }
  const t = BANDS.findIndex(([lo, hi]) => best.rate >= lo && best.rate < hi);
  const out = { level, tier: t < 0 ? 0 : t, ...best };
  cache.set(level, out);
  return out;
}
