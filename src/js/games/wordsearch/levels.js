import { rng, hashSeed } from '../../core/rng.js';
import { generate } from './engine.js';

const DIRS = [['E', 'S'], ['E', 'S', 'SE', 'NE'], ['E', 'S', 'SE', 'NE', 'W', 'N', 'NW', 'SW'], ['E', 'S', 'SE', 'NE', 'W', 'N', 'NW', 'SW']];

export function levelSpec(level, lang) {
  const r = rng(hashSeed('wordsearch-spec', level));
  const ramp = Math.min(1, (level - 1) / 60);
  let tier;
  if (level % 10 === 0) tier = 3;
  else if (level % 5 === 0) tier = 2;
  else tier = level > 2 && r() < Math.min(0.7, 0.2 + level * 0.012) ? 1 : 0;
  const size = [7, 9, 10, 12][tier] + r.int(2) + Math.round(ramp);
  const count = [5, 7, 9, 11][tier] + r.int(2) + Math.round(ramp);
  return { level, tier, lang, size, count, dirs: DIRS[tier], decoys: tier === 3 };
}

const cache = new Map();

export function buildLevel(level, lang) {
  const key = `${lang}:${level}`;
  if (!cache.has(key)) {
    const spec = levelSpec(level, lang);
    let p = null;
    for (let k = 0; !p && k < 5; k++) p = generate(hashSeed('wordsearch', lang, level, k), { ...spec, size: spec.size + (k > 2 ? 1 : 0) });
    cache.set(key, { ...spec, ...p });
  }
  return cache.get(key);
}
