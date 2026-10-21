import { blockingDepth } from '../src/js/games/arrowgo/engine.js';
import { buildLevel, levelSpec } from '../src/js/games/arrowgo/levels.js';

const tiers = [0, 0, 0, 0];
let slowest = 0;
for (let level = 1; level <= 80; level++) {
  const t = Date.now();
  const p = buildLevel(level);
  slowest = Math.max(slowest, Date.now() - t);
  if (!Number.isFinite(blockingDepth(p.n, p.arrows))) throw new Error(`arrow go level ${level} cannot be cleared`);
  tiers[p.tier]++;
  if (p.tier !== levelSpec(level)) console.log(`arrow go level ${level}: wanted tier ${levelSpec(level)}, got ${p.tier}`);
}
console.log('arrow go levels 1-80 clearable. tiers:', tiers, 'slowest ms:', slowest);
