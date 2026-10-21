import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h, toast } from '../../core/ui.js';
import { createShell, TIER_LABEL, LIVES } from '../../core/shell.js';
import { stats } from '../../core/stats.js';
import { geometry, newState, place, step, apply } from './engine.js';
import { requestLevel } from './levels.js';
import { catSvg, xSvg, icons } from './art.js';

const EMPTY = 0, X = 1, CAT = 2;
const load = () => ({ lives: LIVES, ...store.get('catnap', { level: 1, marks: null, solved: 0, seenRules: false }) });
const save = (s) => store.set('catnap', s);

const rules = `<ul class="rules">
  <li><span class="rule-ic">${catSvg}</span><span><b>One cat per color.</b> Every color gets exactly one cat.</span></li>
  <li><span class="rule-ic">${catSvg}</span><span><b>One cat per row and column.</b></span></li>
  <li><span class="rule-ic">${catSvg}</span><span><b>Cats need their space.</b> No two cats may touch, not even diagonally.</span></li>
</ul>
<p class="sheet-note">Tap a square once for an X, twice for a cat. A placed cat stays put, and a wrong cat costs one of your 3 lives. Drag across squares to mark or clear several X's at once.</p>`;

export default {
  id: 'catnap',
  name: 'Catnap',
  blurb: 'Place sleepy cats so none share a row, column or color, and none touch.',
  art: catSvg,
  color: 'var(--r12)',
  progress: () => `Level ${load().level}`,
  mount,
};

function mount(root, { exit }) {
  const saved = load();
  let puz, geo, marks, solSet, cells = [];

  const shell = createShell(root, {
    name: 'Catnap',
    rules,
    winArt: `<div class="win-cats">${catSvg}${catSvg}${catSvg}</div>`,
    onBack: exit,
    onRestart: () => { marks.fill(EMPTY); refresh(); },
    onRetry: () => { marks.fill(EMPTY); saved.lives = LIVES; shell.setLives(LIVES); refresh(); },
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });
  const board = h('<div class="cat-board" role="grid" aria-label="Puzzle grid" hidden></div>');
  shell.stage.append(board);
  shell.controls.append(h(`<nav class="hints" aria-label="Hints">
    <button class="hint" data-hint="x"><span class="hint-ic">${xSvg}</span><span>Show an X</span></button>
    <button class="hint" data-hint="cat"><span class="hint-ic cat-ic">${catSvg}</span><span>Show a cat</span></button>
    <button class="hint" data-hint="auto"><span class="hint-ic">${icons.auto}</span><span>Auto-X</span></button>
  </nav>`));
  shell.controls.addEventListener('click', (e) => {
    const k = e.target.closest('[data-hint]')?.dataset.hint;
    if (!k || shell.won || !puz) return;
    if (k !== 'auto') saved.hinted = true;
    ({ x: hintX, cat: hintCat, auto: autoX })[k]();
  });

  function persist() {
    saved.marks = marks.join('');
    save(saved);
  }

  function startLevel() {
    shell.hideWin();
    board.hidden = true;
    shell.loading(true);
    shell.setLevel(saved.level);
    const level = saved.level;
    requestLevel(level).then((p) => {
      if (level !== saved.level || !shell.el.isConnected) return;
      puz = p;
      geo = geometry(puz.n, puz.reg);
      solSet = new Set(puz.sol.map((c, r) => r * puz.n + c));
      marks = saved.marks && saved.marks.length === puz.n * puz.n ? [...saved.marks].map(Number) : new Array(puz.n * puz.n).fill(EMPTY);
      shell.setTier(puz.actualTier);
      shell.setLives(saved.lives);
      renderBoard();
      shell.loading(false);
      board.hidden = false;
      if (!saved.seenRules) shell.openRules();
      requestLevel(level + 1);
    });
  }

  function renderBoard() {
    const n = puz.n;
    board.style.setProperty('--n', n);
    board.replaceChildren();
    cells = [];
    for (let i = 0; i < n * n; i++) {
      const cell = h(`<div class="cell" role="gridcell" data-i="${i}"><span class="mark"></span></div>`);
      cell.style.setProperty('--fill', `var(--r${(puz.reg[i] * 4 + saved.level) % 15})`);
      board.append(cell);
      cells.push(cell);
    }
    refresh();
  }

  function conflicts() {
    const cats = [], bad = new Set();
    marks.forEach((m, i) => m === CAT && cats.push(i));
    for (let a = 0; a < cats.length; a++) for (let b = a + 1; b < cats.length; b++) {
      const i = cats[a], j = cats[b];
      const ri = Math.floor(i / puz.n), ci = i % puz.n, rj = Math.floor(j / puz.n), cj = j % puz.n;
      if (ri === rj || ci === cj || puz.reg[i] === puz.reg[j] || (Math.abs(ri - rj) < 2 && Math.abs(ci - cj) < 2)) bad.add(i).add(j);
    }
    return { cats, bad };
  }

  function refresh() {
    const { cats, bad } = conflicts();
    cells.forEach((cell, i) => {
      const m = marks[i];
      if (cell.dataset.m !== String(m)) {
        cell.dataset.m = m;
        cell.firstChild.innerHTML = m === CAT ? catSvg : m === X ? xSvg : '';
        cell.setAttribute('aria-label', `Row ${Math.floor(i / puz.n) + 1}, column ${(i % puz.n) + 1}: ${['empty', 'X', 'cat'][m]}`);
      }
      cell.classList.toggle('bad', bad.has(i));
    });
    persist();
    if (!shell.won && cats.length === puz.n && !bad.size && cats.every((i) => solSet.has(i))) win();
  }

  function flash(i) {
    const c = cells[i];
    c.classList.remove('hinted');
    void c.offsetWidth;
    c.classList.add('hinted');
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = stats.win('catnap', puz.actualTier, saved.hinted).solved;
    saved.hinted = false;
    saved.lives = LIVES;
    board.classList.add('solved');
    const level = saved.level;
    saved.level += 1;
    saved.marks = null;
    save(saved);
    setTimeout(() => {
      board.classList.remove('solved');
      shell.showWin(level, `${TIER_LABEL[puz.actualTier]} · ${puz.n}×${puz.n} · ${saved.solved} solved so far`);
    }, 900);
  }

  function logicState() {
    const st = newState(geo);
    marks.forEach((m, i) => { if (m === X && !solSet.has(i)) st.cand[i] = 0; });
    marks.forEach((m, i) => { if (m === CAT && solSet.has(i)) place(geo, st, i); });
    return st;
  }

  function hintX() {
    const st = logicState();
    for (let k = 0; k < 300 && st.cats.size < puz.n; k++) {
      const d = step(geo, st);
      if (!d) break;
      const pool = d.place !== undefined ? geo.attack[d.place] : d.elim;
      const target = pool.find((i) => marks[i] === EMPTY && !solSet.has(i));
      if (target !== undefined) return setMark(target, X, true);
      apply(geo, st, d);
    }
    const rest = marks.map((_, i) => i).filter((i) => marks[i] !== X && !solSet.has(i));
    if (!rest.length) return toast('Every square that needs an X has one');
    setMark(rest.find((j) => marks[j] === EMPTY) ?? rest[0], X, true);
  }

  function hintCat() {
    const st = logicState();
    for (let k = 0; k < 300 && st.cats.size < puz.n; k++) {
      const d = step(geo, st);
      if (!d) break;
      if (d.place !== undefined && marks[d.place] !== CAT) return setMark(d.place, CAT, true);
      apply(geo, st, d);
    }
    const missing = [...solSet].find((i) => marks[i] !== CAT);
    if (missing !== undefined) setMark(missing, CAT, true);
  }

  function autoX() {
    let changed = 0;
    marks.forEach((m, i) => {
      if (m !== CAT) return;
      for (const j of geo.attack[i]) if (marks[j] === EMPTY) { marks[j] = X; changed++; }
    });
    if (!changed) return toast(marks.includes(CAT) ? 'No new X’s to add' : 'Place a cat first');
    haptic.tap();
    refresh();
  }

  function setMark(i, m, hinted) {
    if (marks[i] === CAT) return;
    if (m === CAT && !solSet.has(i)) {
      marks[i] = X;
      refresh();
      cells[i].classList.remove('wrong');
      void cells[i].offsetWidth;
      cells[i].classList.add('wrong');
      saved.lives -= 1;
      save(saved);
      return shell.loseLife(saved.lives);
    }
    marks[i] = m;
    if (m === CAT) haptic.place(); else haptic.tap();
    refresh();
    if (hinted) flash(i);
  }

  let drag = null;
  const cellAt = (e) => {
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell');
    return t && board.contains(t) ? +t.dataset.i : -1;
  };
  board.addEventListener('pointerdown', (e) => {
    if (shell.won) return;
    const i = cellAt(e);
    if (i < 0) return;
    drag = { start: i, moved: false, mode: marks[i] === EMPTY ? X : marks[i] === X ? EMPTY : null, from: marks[i] === EMPTY ? EMPTY : X };
    board.setPointerCapture(e.pointerId);
  });
  board.addEventListener('pointermove', (e) => {
    if (!drag || drag.mode === null) return;
    const i = cellAt(e);
    if (i < 0 || (i === drag.start && !drag.moved)) return;
    let changed = false;
    if (!drag.moved) { drag.moved = true; marks[drag.start] = drag.mode; changed = true; }
    if (marks[i] === drag.from) { marks[i] = drag.mode; changed = true; }
    if (changed) { haptic.tap(); refresh(); }
  });
  board.addEventListener('pointerup', () => {
    if (!drag) return;
    if (!drag.moved && marks[drag.start] !== CAT) setMark(drag.start, marks[drag.start] + 1);
    drag = null;
  });
  board.addEventListener('pointercancel', () => { drag = null; });

  startLevel();
  return { destroy: () => shell.el.remove() };
}
