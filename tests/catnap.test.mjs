import { countSolutions } from '../src/js/games/catnap/engine.js';
import { buildLevel, levelSpec } from '../src/js/games/catnap/levels.js';

const tiers = [0, 0, 0, 0];
let slowest = 0;
for (let level = 1; level <= 120; level++) {
  const t = Date.now();
  const p = buildLevel(level);
  slowest = Math.max(slowest, Date.now() - t);
  const sols = countSolutions(p.n, p.reg, 2);
  if (sols.length !== 1) throw new Error(`level ${level} has ${sols.length} solutions`);
  if (sols[0].join() !== p.sol.join()) throw new Error(`level ${level} solution mismatch`);
  if (p.actualTier !== levelSpec(level).tier) console.log(`level ${level}: wanted tier ${p.tier}, got ${p.actualTier}`);
  tiers[p.actualTier]++;
}
console.log('levels 1-120 unique. tiers [easy, medium, hard, super]:', tiers, 'slowest ms:', slowest);
