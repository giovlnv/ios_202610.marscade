import { target, playout, liftGroup, placeGroup } from '../src/js/games/beadsort/engine.js';
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

const g = { w: 3, h: 2, cells: Int8Array.from([0, 0, 1, 1, 1, 0]) };
const st = { board: [1, 1, 0, 0, 1, 1], trays: [] };
const up = liftGroup(g, st, 0, 9);
if (up.length !== 2 || st.trays.length !== 2) throw new Error('bead sort: touching wrong beads of one color should lift together');
st.trays.push(0, 0);
const down = placeGroup(g, st, 0, 0);
if (down.length !== 2 || st.board[0] !== 0 || st.board[1] !== 0 || st.trays.join() !== '1,1') throw new Error('bead sort: placing should fill touching spots that need the color');
console.log('bead sort: group lift and place work');
