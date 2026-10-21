import { solve } from '../src/js/games/magicsort/engine.js';
import { buildLevel } from '../src/js/games/magicsort/levels.js';

for (let level = 1; level <= 100; level++) {
  const p = buildLevel(level);
  if (!p.tubes || !Array.isArray(solve(p.tubes, p.cap))) throw new Error(`magic sort level ${level} cannot be solved`);
}
console.log('magic sort levels 1-100 solvable');
