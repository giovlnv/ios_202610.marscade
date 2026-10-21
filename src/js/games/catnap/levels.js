import { rng, hashSeed } from '../../core/rng.js';
import { generate } from './engine.js';

export const TIER_LABEL = ['Easy', 'Medium', 'Hard', 'Super hard'];

export function levelSpec(level) {
  const r = rng(hashSeed('catnap-spec', level));
  const isSuper = level % 10 === 0;
  const isHard = !isSuper && level % 5 === 0;
  const base = Math.min(10, 5 + Math.floor((level - 1) / 12));
  let n, tier;
  if (isSuper) { n = Math.min(10, base + 1); tier = 3; }
  else if (isHard) { n = Math.min(10, base + (r() < 0.5 ? 1 : 0)); tier = 2; }
  else {
    n = base > 5 && r() < 0.35 ? base - 1 : base;
    tier = level > 2 && r() < Math.min(0.7, 0.15 + level * 0.012) ? 1 : 0;
  }
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
