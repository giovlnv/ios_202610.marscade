import { countSolutions } from '../src/js/games/sudoku/engine.js';
import { buildLevel, levelSpec } from '../src/js/games/sudoku/levels.js';

const tiers = [0, 0, 0, 0];
for (let level = 1; level <= 40; level++) {
  const p = buildLevel(level);
  if (countSolutions(p.puzzle, 2).length !== 1) throw new Error(`sudoku level ${level} is not unique`);
  if (p.tier !== levelSpec(level)) console.log(`sudoku level ${level}: wanted tier ${levelSpec(level)}, got ${p.tier}`);
  tiers[p.tier]++;
}
console.log('sudoku levels 1-40 unique. tiers:', tiers);
