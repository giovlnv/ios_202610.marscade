import { buildLevel } from '../src/js/games/wordsearch/levels.js';

let slowest = 0;
for (const lang of ['en', 'pt']) for (let level = 1; level <= 80; level++) {
  const t = Date.now();
  const p = buildLevel(level, lang);
  slowest = Math.max(slowest, Date.now() - t);
  if (!p.grid) throw new Error(`word search ${lang} level ${level} failed`);
  for (const w of p.words) if (w.cells.map((i) => p.grid[i]).join('') !== w.plain) throw new Error(`bad placement ${w.word}`);
  if (p.words.length < p.count) throw new Error(`${lang} ${level}: only ${p.words.length} words`);
}
console.log('word search levels 1-80 (en + pt) ok, slowest ms:', slowest);
