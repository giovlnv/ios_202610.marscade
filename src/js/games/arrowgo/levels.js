import { rng, hashSeed } from '../../core/rng.js';
import { generate, blockingDepth } from './engine.js';

const SPECS = [
  { n: [5, 6], minLen: 2, maxLen: 3, bend: 0.2, fill: 0.7, tangle: 2 },
  { n: [7, 8], minLen: 2, maxLen: 4, bend: 0.35, fill: 0.78, tangle: 8 },
  { n: [9, 10], minLen: 2, maxLen: 6, bend: 0.45, fill: 0.8, tangle: 16 },
  { n: [10, 12], minLen: 3, maxLen: 8, bend: 0.55, fill: 0.84, tangle: 28 },
];
const DEPTH = [[1, 3], [4, 5], [6, 7], [8, 99]];

export function levelSpec(level) {
  const r = rng(hashSeed('arrowgo-spec', level));
  if (level % 10 === 0) return 3;
  if (level % 5 === 0) return 2;
  return level > 2 && r() < Math.min(0.7, 0.2 + level * 0.012) ? 1 : 0;
}

const cache = new Map();

export function buildLevel(level) {
  if (cache.has(level)) return cache.get(level);
  const tier = levelSpec(level), spec = SPECS[tier], r = rng(hashSeed('arrowgo-n', level));
  const n = spec.n[0] + r.int(spec.n[1] - spec.n[0] + 1);
  let best = null;
  for (let k = 0; k < 25; k++) {
    const p = generate(hashSeed('arrowgo', level, k), { ...spec, n });
    const depth = blockingDepth(n, p.arrows), [lo, hi] = DEPTH[tier];
    const miss = depth < lo ? lo - depth : depth > hi ? depth - hi : 0;
    if (!best || miss < best.miss) best = { ...p, depth, miss };
    if (!miss) break;
  }
  const actual = DEPTH.findIndex(([lo, hi]) => best.depth >= lo && best.depth <= hi);
  const out = { level, tier: actual < 0 ? 3 : actual, ...best };
  cache.set(level, out);
  return out;
}
