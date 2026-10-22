import { target, playout, newState, lift, group, HOLE } from '../src/js/games/beadsort/engine.js';
import { buildLevel } from '../src/js/games/beadsort/levels.js';
import { rng } from '../src/js/core/rng.js';

const tiers = [0, 0, 0, 0];
let slowest = 0;
for (let level = 1; level <= 60; level++) {
  const t = Date.now();
  const p = buildLevel(level);
  slowest = Math.max(slowest, Date.now() - t);
  const goal = target(p.name);
  if (!playout(goal, p.board, p.trays).ok) throw new Error(`bead sort level ${level} cannot be finished`);
  if (level <= 20 && !playout(goal, p.board, p.trays, rng(level)).ok) throw new Error(`bead sort level ${level}: random taps got stuck`);
  tiers[p.tier]++;
}
console.log('bead sort levels 1-60 finishable, even with random taps. tiers:', tiers, 'slowest ms:', slowest);

const g = { w: 3, h: 2, cells: Int8Array.from([0, 0, 1, 1, 1, 0]) };
const st = newState([1, 1, 0, 0, 1, 0], 2);
if (group(g, st.board, 0).length !== 2) throw new Error('bead sort: touching wrong beads of one color should move together');
const moves = lift(g, st, 0);
if (st.trays[0].c !== 1 || st.trays[0].n !== 2 || moves.length !== 2) throw new Error('bead sort: beads with no spot should go into one tray as a swatch');
lift(g, st, 2);
if (st.board[1] !== 0 || st.board[0] !== HOLE) throw new Error('bead sort: beads should fly into the nearest spot that needs them');
if (st.board[2] !== 1 || st.trays[0].n !== 1) throw new Error('bead sort: tray beads should drop into freed spots');
lift(g, st, 3);
if (st.board.join() !== '0,0,1,1,1,0' || st.trays[0].n !== 0) throw new Error('bead sort: tray beads should drop into freed spots');
console.log('bead sort: group moves, swatch trays and auto-fill work');
