import { rng, hashSeed } from '../../core/rng.js';
import { generate } from './engine.js';

export function levelSpec(level) {
  const r = rng(hashSeed('magicsort-spec', level));
  const ramp = Math.min(1, (level - 1) / 80);
  const pick = (lo, hi) => Math.round(lo) + r.int(Math.round(hi) - Math.round(lo) + 1);
  if (level <= 2) return { tier: 0, colors: 2 + level, cap: 4, empty: 2 };
  if (level % 10 === 0) return { tier: 3, colors: pick(5 + 2 * ramp, 6 + 4 * ramp), cap: 5, empty: 1 };
  if (level % 5 === 0) return { tier: 2, colors: pick(5 + 2 * ramp, 7 + 3 * ramp), cap: 4, empty: 1 };
  if (r() < Math.min(0.7, 0.2 + level * 0.012)) return { tier: 1, colors: pick(5 + 2 * ramp, 7 + 4 * ramp), cap: 4, empty: 2 };
  return { tier: 0, colors: pick(3 + 2 * ramp, 5 + 3 * ramp), cap: 4, empty: 2 };
}

const cache = new Map();

export function buildLevel(level) {
  if (!cache.has(level)) {
    const spec = levelSpec(level);
    const seed = hashSeed('magicsort', level);
    let p = generate(seed, spec, spec.empty === 1 ? 150 : 40), tier = spec.tier;
    if (!p) { p = generate(seed, { ...spec, empty: 2 }); tier = Math.max(1, tier - 1); }
    const hidden = p.tubes.map((t, i) => (tier === 3 || (tier === 2 && i % 2 === 0) ? Math.max(0, t.length - 1) : 0));
    cache.set(level, { level, tier, hidden, ...p });
  }
  return cache.get(level);
}
