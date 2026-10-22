import { target, playout, newState, group, toTray, toHoles, correct, HOLE } from '../src/js/games/beadsort/engine.js';
import { buildLevel } from '../src/js/games/beadsort/levels.js';

const tiers = [0, 0, 0, 0];
let slowest = 0;
for (let level = 1; level <= 60; level++) {
  const t = Date.now();
  const p = buildLevel(level);
  slowest = Math.max(slowest, Date.now() - t);
  const goal = target(p.name);
  if (!playout(goal, p.board, p.trays).ok) throw new Error(`bead sort level ${level} cannot be finished`);
  if (correct(goal, p.board)) throw new Error(`bead sort level ${level} starts with beads in place`);
  tiers[p.tier]++;
}
console.log('bead sort levels 1-60 finishable and fully scrambled. tiers:', tiers, 'slowest ms:', slowest);

const g = { w: 3, h: 2, cells: Int8Array.from([0, 0, 1, 1, 1, 0]) };
const st = newState([1, 1, 0, 0, 1, 0], 2);
const sel = group(g, st.board, 0);
if (sel.length !== 2) throw new Error('bead sort: tapping a bead should pick up its touching beads of the same color');
toTray(st, sel, 0);
if (st.trays[0].c !== 1 || st.trays[0].n !== 2 || st.board[0] !== HOLE) throw new Error('bead sort: tray should store the swatch');
if (toTray(st, group(g, st.board, 2), 0).length) throw new Error('bead sort: a tray holds only one color');
const moved = toHoles(g, st, group(g, st.board, 2), 1).concat(toHoles(g, st, group(g, st.board, 3), 0));
if (moved.length !== 2 || st.board[0] !== 0 || st.board[1] !== 0) throw new Error('bead sort: placing should fill spots that need the color');
toHoles(g, st, 0, 2);
toHoles(g, st, 0, 3);
if (st.board.join() !== '0,0,1,1,1,0' || st.trays[0].n !== 0 || st.trays[0].c !== -1) throw new Error('bead sort: tray beads should go where tapped');
console.log('bead sort: pick up, store, place and tray placing work');
