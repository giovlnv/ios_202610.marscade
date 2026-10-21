import { target, playout } from '../src/js/games/beadsort/engine.js';
import { buildLevel } from '../src/js/games/beadsort/levels.js';

const tiers = [0, 0, 0, 0];
let slowest = 0;
for (let level = 1; level <= 60; level++) {
  const t = Date.now();
  const p = buildLevel(level);
  slowest = Math.max(slowest, Date.now() - t);
  if (!playout(target(p.name), p.board, p.trays * 9)) throw new Error(`bead sort level ${level} cannot be finished`);
  tiers[p.tier]++;
}
console.log('bead sort levels 1-60 finishable. tiers:', tiers, 'slowest ms:', slowest);
