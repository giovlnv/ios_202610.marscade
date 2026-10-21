import { N, SHAPES, place, spots, deal, obstacles } from '../src/js/games/blockblast/engine.js';
import { levelSpec } from '../src/js/games/blockblast/levels.js';
import { rng } from '../src/js/core/rng.js';

const bar = SHAPES.find((s) => s.name === 'bar4' && s.w === 4);
let board = new Array(N * N).fill(-1);
board = place(board, bar, 0, 0, 1).board;
const res = place(board, bar, 0, 4, 2);
if (res.lines !== 1 || res.board.some((v) => v >= 0)) throw new Error('a full row should clear');
for (let level = 1; level <= 40; level++) {
  const s = levelSpec(level), b = obstacles(s.seed + 1, s.stones), set = deal(rng(s.seed), b, s.tier, true);
  if (!set.some((p) => spots(b, SHAPES[p]).length)) throw new Error(`block blast level ${level}: no opening piece fits`);
}
console.log('block blast: line clears work, 40 level openings playable,', SHAPES.length, 'piece shapes');
