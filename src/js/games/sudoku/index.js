import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h } from '../../core/ui.js';
import { createShell, TIER_LABEL, LIVES } from '../../core/shell.js';
import { stats } from '../../core/stats.js';
import { PEERS, ROW, COL, BOX, nextLogical, candidates } from './engine.js';
import { buildLevel } from './levels.js';

const art = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <rect x="5" y="5" width="30" height="30" rx="5" fill="var(--surface)" stroke="var(--edge)" stroke-width="2"/>
  <path d="M15 5 V35 M25 5 V35 M5 15 H35 M5 25 H35" stroke="var(--edge)" stroke-width="1.4" opacity=".55"/>
  <text x="10" y="13.4" font-size="7.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" fill="var(--ink)">5</text>
  <text x="20" y="23.4" font-size="7.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" fill="var(--rust)">3</text>
  <text x="30" y="33.4" font-size="7.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" fill="var(--ink)">9</text>
</svg>`;

const pencil = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 L5 15.5 L15.5 5 Q17 3.5 18.5 5 L19 5.5 Q20.5 7 19 8.5 L8.5 19 Z M13.5 7 L17 10.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const eraser = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 20 L4.5 15.5 Q3 14 4.5 12.5 L12.5 4.5 Q14 3 15.5 4.5 L19.5 8.5 Q21 10 19.5 11.5 L11 20 Z M8.5 9 L15 15.5 M9 20 H20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const autoNotes = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/></svg>`;
const bulb = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 H15 M10 20.5 H14 M8.5 14 Q6 12 6 9 A6 6 0 0 1 18 9 Q18 12 15.5 14 L15 17 H9 Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const rules = `<ul class="rules">
  <li><span class="rule-ic rule-num">1–9</span><span><b>Fill every row</b> with the numbers 1 to 9, each once.</span></li>
  <li><span class="rule-ic rule-num">1–9</span><span><b>Same for every column</b> and every 3×3 box.</span></li>
  <li><span class="rule-ic rule-num">3</span><span><b>You have 3 lives.</b> A wrong number costs one; a right one stays in place.</span></li>
</ul>
<p class="sheet-note">Tap a square, then a number. Turn on Notes to jot down small candidate numbers instead; notes never cost lives.</p>`;

const load = () => ({ lives: LIVES, ...store.get('sudoku', { level: 1, vals: null, notes: null, solved: 0, seenRules: false }) });
const save = (s) => store.set('sudoku', s);

export default {
  id: 'sudoku',
  name: 'Sudoku',
  blurb: 'Classic 9×9 number puzzle, from gentle warm-ups to tough logic.',
  art,
  color: 'var(--r2)',
  progress: () => `Level ${load().level}`,
  mount,
};

function mount(root, { exit }) {
  const saved = load();
  let puz, vals, notes, sel = -1, notesMode = false, cells = [];

  const shell = createShell(root, {
    name: 'Sudoku',
    rules,
    winArt: `<div class="win-icon">${art}</div>`,
    onBack: exit,
    onRetry: () => {
      saved.lives = LIVES;
      shell.setLives(LIVES);
      vals = puz.puzzle.slice();
      notes.fill(0);
      refresh();
    },
    onRestart: () => {
      vals = puz.puzzle.slice();
      notes.fill(0);
      refresh();
    },
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });

  const board = h('<div class="sdk-board" role="grid" aria-label="Sudoku grid" hidden></div>');
  for (let b = 0; b < 9; b++) board.append(h('<div class="sdk-box"></div>'));
  for (let i = 0; i < 81; i++) {
    const c = h(`<button class="sdk-cell" data-i="${i}"></button>`);
    board.children[BOX(i)].append(c);
    cells[i] = c;
  }
  shell.stage.append(board);
  shell.controls.append(h(`<div class="sdk-tools">
    <button class="tool" data-tool="notes" aria-pressed="false"><span class="tool-ic">${pencil}</span><span>Notes</span></button>
    <button class="tool" data-tool="erase"><span class="tool-ic">${eraser}</span><span>Erase</span></button>
    <button class="tool" data-tool="auto"><span class="tool-ic">${autoNotes}</span><span>Auto notes</span></button>
    <button class="tool" data-tool="hint"><span class="tool-ic">${bulb}</span><span>Show a number</span></button>
  </div>`));
  const pad = h('<div class="sdk-pad" aria-label="Numbers"></div>');
  for (let d = 1; d <= 9; d++) pad.append(h(`<button class="num" data-d="${d}"><span>${d}</span><small></small></button>`));
  shell.controls.append(pad);

  function startLevel() {
    shell.hideWin();
    board.hidden = true;
    shell.loading(true);
    shell.setLevel(saved.level);
    const level = saved.level;
    setTimeout(() => {
      if (level !== saved.level || !shell.el.isConnected) return;
      puz = buildLevel(level);
      vals = saved.vals?.length === 81 ? [...saved.vals].map(Number) : puz.puzzle.slice();
      notes = saved.notes?.length === 81 ? saved.notes.slice() : new Array(81).fill(0);
      sel = -1;
      shell.setTier(puz.tier);
      shell.setLives(saved.lives);
      cells.forEach((c, i) => c.classList.toggle('given', puz.puzzle[i] > 0));
      refresh();
      shell.loading(false);
      board.hidden = false;
      if (!saved.seenRules) shell.openRules();
      setTimeout(() => buildLevel(level + 1), 400);
    }, 30);
  }

  function refresh() {
    const sv = sel >= 0 ? vals[sel] : 0;
    cells.forEach((c, i) => {
      const v = vals[i];
      c.classList.toggle('sel', i === sel);
      c.classList.toggle('peer', sel >= 0 && i !== sel && (ROW(i) === ROW(sel) || COL(i) === COL(sel) || BOX(i) === BOX(sel)));
      c.classList.toggle('same', sv > 0 && v === sv);
      c.classList.toggle('wrong', v > 0 && v !== puz.sol[i]);
      if (v) c.textContent = v;
      else if (notes[i]) {
        c.innerHTML = `<span class="notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<i>${notes[i] & (1 << d) ? d : ''}</i>`).join('')}</span>`;
      } else c.textContent = '';
      c.setAttribute('aria-label', `Row ${ROW(i) + 1}, column ${COL(i) + 1}: ${v || 'empty'}`);
    });
    for (let d = 1; d <= 9; d++) {
      const left = 9 - vals.filter((v, i) => v === d && v === puz.sol[i]).length;
      const b = pad.children[d - 1];
      b.querySelector('small').textContent = left || '';
      b.classList.toggle('done', !left);
    }
    pad.classList.toggle('noting', notesMode);
    saved.vals = vals.join('');
    saved.notes = notes;
    save(saved);
    if (!shell.won && vals.every((v, i) => v === puz.sol[i])) win();
  }

  function put(i, d) {
    if (i < 0 || vals[i]) return;
    if (notesMode) {
      notes[i] ^= 1 << d;
      haptic.tap();
    } else if (d !== puz.sol[i]) {
      cells[i].textContent = d;
      cells[i].classList.add('wrong');
      saved.lives -= 1;
      save(saved);
      shell.loseLife(saved.lives);
      setTimeout(refresh, 700);
      return;
    } else {
      vals[i] = d;
      notes[i] = 0;
      for (const j of PEERS[i]) notes[j] &= ~(1 << d);
      haptic.place();
    }
    refresh();
  }

  function hint() {
    saved.hinted = true;
    const target = sel >= 0 && !vals[sel] ? sel : nextLogical(vals)?.place ?? vals.findIndex((v) => !v);
    if (target < 0) return;
    sel = target;
    vals[target] = puz.sol[target];
    for (const j of PEERS[target]) notes[j] &= ~(1 << vals[target]);
    reveal(target);
  }

  function reveal(i) {
    haptic.place();
    refresh();
    cells[i].classList.remove('hinted');
    void cells[i].offsetWidth;
    cells[i].classList.add('hinted');
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = stats.win('sudoku', puz.tier, saved.hinted).solved;
    saved.hinted = false;
    saved.lives = LIVES;
    const level = saved.level;
    saved.level += 1;
    saved.vals = null;
    saved.notes = null;
    save(saved);
    sel = -1;
    board.classList.add('solved');
    setTimeout(() => {
      board.classList.remove('solved');
      shell.showWin(level, `${TIER_LABEL[puz.tier]} · ${saved.solved} solved so far`);
    }, 700);
  }

  board.addEventListener('click', (e) => {
    const c = e.target.closest('.sdk-cell');
    if (!c || shell.won) return;
    sel = +c.dataset.i;
    haptic.tap();
    refresh();
  });
  pad.addEventListener('click', (e) => {
    const b = e.target.closest('.num');
    if (b && !shell.won) put(sel, +b.dataset.d);
  });
  shell.controls.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]')?.dataset.tool;
    if (!t || shell.won || !puz) return;
    if (t === 'notes') {
      notesMode = !notesMode;
      e.target.closest('[data-tool]').setAttribute('aria-pressed', notesMode);
      refresh();
    }
    if (t === 'erase' && sel >= 0 && !vals[sel]) {
      notes[sel] = 0;
      refresh();
    }
    if (t === 'hint') hint();
    if (t === 'auto') {
      const cand = candidates(vals.map((v, i) => (v === puz.sol[i] ? v : 0)));
      vals.forEach((v, i) => { if (!v) notes[i] = cand[i]; });
      haptic.tap();
      refresh();
    }
  });

  startLevel();
  return { destroy: () => shell.el.remove() };
}
