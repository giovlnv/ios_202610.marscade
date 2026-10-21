import catnap from './catnap/index.js';
import sudoku from './sudoku/index.js';
import magicsort from './magicsort/index.js';
import wordsearch from './wordsearch/index.js';
import beadsort from './beadsort/index.js';
import arrowgo from './arrowgo/index.js';
import blockblast, { endless as blockendless } from './blockblast/index.js';

export const games = [catnap, sudoku, magicsort, wordsearch, beadsort, arrowgo, blockblast, blockendless];

export const upcoming = [
  'Picture Builder', 'Rotate Rings', 'Stamp Solitaire', 'Crosswords', 'Magic Tiles', 'Helix Jump',
];
