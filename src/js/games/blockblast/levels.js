import { rng, hashSeed } from '../../core/rng.js';

const SPECS = [
  { base: 250, step: 4, cap: 600, stones: 0, guarantee: true },
  { base: 400, step: 4, cap: 900, stones: 4, guarantee: true },
  { base: 500, step: 3, cap: 800, stones: 8, guarantee: false },
  { base: 450, step: 2, cap: 700, stones: 12, guarantee: false },
];

export function levelSpec(level) {
  const r = rng(hashSeed('blockblast-spec', level));
  let tier;
  if (level % 10 === 0) tier = 3;
  else if (level % 5 === 0) tier = 2;
  else tier = level > 2 && r() < Math.min(0.7, 0.2 + level * 0.012) ? 1 : 0;
  const s = SPECS[tier];
  return { level, tier, target: Math.min(s.cap, s.base + level * s.step), stones: s.stones, guarantee: s.guarantee, seed: hashSeed('blockblast', level) };
}
