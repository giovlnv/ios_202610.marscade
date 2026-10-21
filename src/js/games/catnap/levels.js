import { rng, hashSeed } from '../../core/rng.js';
import { generate } from './engine.js';

export function levelSpec(level) {
  const r = rng(hashSeed('catnap-spec', level));
  const ramp = Math.min(1, (level - 1) / 90);
  let tier;
  if (level % 10 === 0) tier = 3;
  else if (level % 5 === 0) tier = 2;
  else tier = level > 2 && r() < Math.min(0.7, 0.15 + level * 0.012) ? 1 : 0;
  const [lo, hi] = [[5, 6 + 3 * ramp], [5 + ramp, 7 + 4 * ramp], [6 + 3 * ramp, 8 + 5 * ramp], [7 + 4 * ramp, 9 + 6 * ramp]][tier].map(Math.round);
  const n = level <= 2 ? 5 : lo + r.int(hi - lo + 1);
  return { level, n, tier };
}

const cache = new Map();

export function buildLevel(level) {
  if (cache.has(level)) return cache.get(level);
  const spec = levelSpec(level);
  const p = generate(spec.n, hashSeed('catnap', level), spec.tier, [60, 120, 500, 800][spec.tier]);
  const out = { ...spec, reg: p.reg, sol: p.sol, actualTier: p.tier };
  cache.set(level, out);
  return out;
}

let worker = null;
const pending = new Map();

function getWorker() {
  if (worker !== null) return worker;
  try {
    worker = new Worker(globalThis.MARSCADE_WORKERS?.catnap ?? 'catnap-worker.js', { type: 'module' });
    worker.onmessage = (e) => {
      cache.set(e.data.level, e.data);
      pending.get(e.data.level)?.(e.data);
      pending.delete(e.data.level);
    };
    worker.onerror = () => {
      worker = false;
      for (const [level, done] of pending) done(buildLevel(level));
      pending.clear();
    };
  } catch {
    worker = false;
  }
  return worker;
}

export function requestLevel(level) {
  if (cache.has(level)) return Promise.resolve(cache.get(level));
  const w = getWorker();
  if (!w) return new Promise((res) => setTimeout(() => res(buildLevel(level)), 30));
  return new Promise((res) => {
    const prev = pending.get(level);
    pending.set(level, (p) => { prev?.(p); res(p); });
    if (!prev) w.postMessage(level);
  });
}
