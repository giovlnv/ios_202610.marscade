import { fromRows, exposed, take, empty, LETTERS } from '../src/js/games/beadsort/engine.js';
import { buildLevel } from '../src/js/games/beadsort/levels.js';

const tiers = [0, 0, 0, 0];
for (let level = 1; level <= 60; level++) {
  const p = buildLevel(level);
  const s = { ...fromRows(p.rows, LETTERS.slice(0, p.palette.length)), trays: Array.from({ length: p.trays }, () => ({ c: -1, n: 0 })) };
  for (const i of p.path) if (!exposed(s, i) || take(s, i) < 0) throw new Error(`bead sort level ${level}: stored solution is invalid`);
  if (!empty(s)) throw new Error(`bead sort level ${level}: stored solution does not clear the board`);
  tiers[p.tier]++;
}
console.log('bead sort levels 1-60 solvable. tiers:', tiers);
