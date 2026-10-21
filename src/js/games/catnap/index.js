import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h, toast } from '../../core/ui.js';
import { geometry, newState, place, step, apply } from './engine.js';
import { requestLevel, TIER_LABEL } from './levels.js';
import { catSvg, xSvg, icons } from './art.js';

const EMPTY = 0, X = 1, CAT = 2;
const load = () => store.get('catnap', { level: 1, marks: null, solved: 0, seenRules: false });
const save = (s) => store.set('catnap', s);

export default {
  id: 'catnap',
  name: 'Catnap',
  blurb: 'Place sleepy cats so none share a row, column or color, and none touch.',
  status: 'ready',
  art: catSvg,
  progress: () => `Level ${load().level}`,
  mount,
};

function mount(root, { exit }) {
  let saved = load();
  let puz, geo, marks, solSet, cells = [], won = false, restartArmed = 0;

  const el = h(`<section class="screen catnap">
    <header class="bar">
      <button class="icon-btn" data-act="back" aria-label="Back to games">${icons.back}</button>
      <div class="bar-title">
        <span class="lvl">Level <b></b></span>
        <span class="tier"></span>
      </div>
      <div class="bar-end">
        <button class="icon-btn" data-act="help" aria-label="How to play">${icons.help}</button>
        <button class="icon-btn" data-act="restart" aria-label="Clear board">${icons.restart}</button>
      </div>
    </header>
    <div class="stage">
      <div class="board" role="grid" aria-label="Puzzle grid"></div>
      <p class="loading" hidden>Making the next puzzle…</p>
    </div>
    <nav class="hints" aria-label="Hints">
      <button class="hint" data-act="hint-x"><span class="hint-ic">${xSvg}</span><span>Show an X</span></button>
      <button class="hint" data-act="hint-cat"><span class="hint-ic cat-ic">${catSvg}</span><span>Show a cat</span></button>
      <button class="hint" data-act="auto-x"><span class="hint-ic">${icons.auto}</span><span>Auto-X</span></button>
    </nav>
    <div class="sheet-backdrop" data-sheet hidden>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <h2 id="rules-title">How to play</h2>
        <ul class="rules">
          <li><span class="rule-ic">${catSvg}</span><span><b>One cat per color.</b> Every colored area gets exactly one cat.</span></li>
          <li><span class="rule-ic">${catSvg}</span><span><b>One cat per row and column.</b></span></li>
          <li><span class="rule-ic">${catSvg}</span><span><b>Cats need their space.</b> No two cats may touch, not even diagonally.</span></li>
        </ul>
        <p class="sheet-note">Tap a square once for an X, twice for a cat, three times to clear it. Drag across squares to mark several X's at once.</p>
        <button class="primary" data-act="close-sheet">Got it</button>
      </div>
    </div>
    <div class="win-backdrop" hidden>
      <div class="win" role="dialog" aria-modal="true" aria-labelledby="win-title">
        <div class="win-cats">${catSvg}${catSvg}${catSvg}</div>
        <h2 id="win-title">Level <span></span> solved</h2>
        <p class="win-sub"></p>
        <button class="primary" data-act="next">Next level</button>
      </div>
    </div>
  </section>`);
  root.append(el);

  const $ = (s) => el.querySelector(s);
  const board = $('.board');

  function persist() {
    saved.marks = marks.join('');
    save(saved);
  }

  function startLevel() {
    won = false;
    $('.win-backdrop').hidden = true;
    board.hidden = true;
    $('.loading').hidden = false;
    $('.lvl b').textContent = saved.level;
    const level = saved.level;
    requestLevel(level).then((p) => {
      if (level !== saved.level || !el.isConnected) return;
      puz = p;
      geo = geometry(puz.n, puz.reg);
      solSet = new Set(puz.sol.map((c, r) => r * puz.n + c));
      marks = saved.marks && saved.marks.length === puz.n * puz.n ? [...saved.marks].map(Number) : new Array(puz.n * puz.n).fill(EMPTY);
      $('.tier').textContent = TIER_LABEL[puz.actualTier];
      $('.tier').dataset.tier = puz.actualTier;
      renderBoard();
      $('.loading').hidden = true;
      board.hidden = false;
      if (!saved.seenRules) openRules();
    });
  }

  function renderBoard() {
    const n = puz.n;
    board.style.setProperty('--n', n);
    board.replaceChildren();
    cells = [];
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n), c = i % n, g = puz.reg[i];
      const cell = h(`<div class="cell" role="gridcell" data-i="${i}"><span class="mark"></span></div>`);
      cell.style.setProperty('--fill', `var(--r${(g * 3 + saved.level) % 10})`);
      if (r > 0 && puz.reg[i - n] !== g) cell.classList.add('et');
      if (r < n - 1 && puz.reg[i + n] !== g) cell.classList.add('eb');
      if (c > 0 && puz.reg[i - 1] !== g) cell.classList.add('el');
      if (c < n - 1 && puz.reg[i + 1] !== g) cell.classList.add('er');
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
      cell.dataset.m = m;
      cell.classList.toggle('bad', bad.has(i));
      cell.firstChild.innerHTML = m === CAT ? catSvg : m === X ? xSvg : '';
      cell.setAttribute('aria-label', `Row ${Math.floor(i / puz.n) + 1}, column ${(i % puz.n) + 1}: ${['empty', 'X', 'cat'][m]}`);
    });
    persist();
    if (!won && cats.length === puz.n && !bad.size && cats.every((i) => solSet.has(i))) win();
  }

  function flash(i) {
    const c = cells[i];
    c.classList.remove('hinted');
    void c.offsetWidth;
    c.classList.add('hinted');
  }

  function win() {
    won = true;
    haptic.win();
    saved.solved = (saved.solved || 0) + 1;
    board.classList.add('solved');
    setTimeout(() => {
      board.classList.remove('solved');
      $('.win h2 span').textContent = saved.level;
      $('.win-sub').textContent = `${TIER_LABEL[puz.actualTier]} · ${puz.n}×${puz.n} · ${saved.solved} solved so far`;
      $('.win-backdrop').hidden = false;
      saved.level += 1;
      saved.marks = null;
      save(saved);
      requestLevel(saved.level);
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
    for (let k = 0; k < 200 && st.cats.size < puz.n; k++) {
      const d = step(geo, st);
      if (!d) break;
      const pool = d.place !== undefined ? geo.attack[d.place] : d.elim;
      const target = pool.find((i) => marks[i] === EMPTY && !solSet.has(i));
      if (target !== undefined) return setMark(target, X, true);
      apply(geo, st, d);
    }
    const rest = marks.map((_, i) => i).filter((i) => marks[i] !== X && !solSet.has(i));
    if (!rest.length) return toast('Every square that needs an X has one');
    const i = rest.find((j) => marks[j] === EMPTY) ?? rest[0];
    if (marks[i] === CAT) toast('This cat was in the wrong spot');
    setMark(i, X, true);
  }

  function hintCat() {
    const wrong = marks.findIndex((m, i) => m === CAT && !solSet.has(i));
    if (wrong >= 0) {
      setMark(wrong, X, true);
      return toast('This cat was in the wrong spot');
    }
    const st = logicState();
    for (let k = 0; k < 200 && st.cats.size < puz.n; k++) {
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
    marks[i] = m;
    if (m === CAT) haptic.place(); else haptic.tap();
    refresh();
    if (hinted) flash(i);
  }

  function openRules() {
    $('[data-sheet]').hidden = false;
    $('[data-act="close-sheet"]').focus();
  }

  let drag = null;
  const cellAt = (e) => {
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell');
    return t && board.contains(t) ? +t.dataset.i : -1;
  };
  board.addEventListener('pointerdown', (e) => {
    if (won) return;
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
  const end = () => {
    if (!drag) return;
    if (!drag.moved) setMark(drag.start, (marks[drag.start] + 1) % 3);
    drag = null;
  };
  board.addEventListener('pointerup', end);
  board.addEventListener('pointercancel', () => { drag = null; });

  el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'back') exit();
    if (act === 'help') openRules();
    if (act === 'close-sheet') {
      $('[data-sheet]').hidden = true;
      saved.seenRules = true;
      save(saved);
    }
    if (won && act !== 'next' && act !== 'back') return;
    if (act === 'hint-x') hintX();
    if (act === 'hint-cat') hintCat();
    if (act === 'auto-x') autoX();
    if (act === 'next') startLevel();
    if (act === 'restart') {
      if (Date.now() - restartArmed < 2500) {
        marks.fill(EMPTY);
        refresh();
        restartArmed = 0;
        toast('Board cleared');
      } else {
        restartArmed = Date.now();
        toast('Tap again to clear the board');
      }
    }
  });
  $('[data-sheet]').addEventListener('click', (e) => {
    if (e.target.matches('[data-sheet]')) $('[data-act="close-sheet"]').click();
  });

  startLevel();
  return { destroy: () => el.remove() };
}
