import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h, toast } from '../../core/ui.js';
import { createShell, TIER_LABEL, LIVES } from '../../core/shell.js';
import { stats } from '../../core/stats.js';
import { settings } from '../../core/settings.js';
import { buildLevel } from './levels.js';

const art = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <rect x="5" y="5" width="30" height="30" rx="6" fill="var(--surface)" stroke="var(--edge)" stroke-width="2"/>
  <path d="M12 13 L28 13" stroke="var(--p8)" stroke-width="6" stroke-linecap="round" opacity=".55"/>
  <path d="M12 20 L26 27" stroke="var(--p4)" stroke-width="6" stroke-linecap="round" opacity=".55"/>
  ${[['M', 12, 13], ['A', 20, 13], ['R', 28, 13], ['S', 12, 20], ['C', 19, 23.5], ['T', 26, 27], ['O', 12, 28], ['E', 28, 20]].map(([l, x, y]) =>
    `<text x="${x}" y="${y + 2.4}" font-size="6.6" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" fill="var(--ink)">${l}</text>`).join('')}
</svg>`;
const bulb = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 H15 M10 20.5 H14 M8.5 14 Q6 12 6 9 A6 6 0 0 1 18 9 Q18 12 15.5 14 L15 17 H9 Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const rules = `<ul class="rules">
  <li><span class="rule-ic">${art}</span><span><b>Find every word</b> in the list, hidden in straight lines.</span></li>
  <li><span class="rule-ic">${art}</span><span><b>Words can run any way</b> on harder levels: backwards, up, and diagonally.</span></li>
  <li><span class="rule-ic rule-num">3</span><span><b>You have 3 lives.</b> Selecting 3 or more letters that aren't a word costs one.</span></li>
</ul>
<p class="sheet-note">Drag from the first letter to the last. Change between English and Portuguese words in Settings on the home screen.</p>`;

const LINE_COLORS = [8, 4, 1, 5, 3, 9, 7, 0, 12, 13, 11, 2];
const load = () => ({ level: 1, found: [], solved: 0, lives: LIVES, ...store.get('wordsearch', {}) });
const save = (s) => store.set('wordsearch', s);

export default {
  id: 'wordsearch',
  name: 'Word Search',
  blurb: 'Find hidden words by theme, in English or Portuguese.',
  art,
  color: 'var(--r14)',
  progress: () => `Level ${load().level}`,
  mount,
};

function mount(root, { exit }) {
  const saved = load();
  let puz, found = new Set(), drag = null, cells = [];

  const shell = createShell(root, {
    name: 'Word Search',
    rules,
    winArt: `<div class="win-icon">${art}</div>`,
    onBack: exit,
    onRestart: () => { found.clear(); render(); },
    onRetry: () => { found.clear(); saved.lives = LIVES; shell.setLives(LIVES); render(); },
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });
  const wrap = h(`<div class="ws-wrap" hidden>
    <p class="ws-theme"></p>
    <div class="ws-board"><div class="ws-grid"></div><svg class="ws-lines" aria-hidden="true"></svg></div>
  </div>`);
  shell.stage.append(wrap);
  const board = wrap.querySelector('.ws-board'), grid = wrap.querySelector('.ws-grid'), lines = wrap.querySelector('.ws-lines');
  const list = h('<ul class="ws-words" aria-label="Words to find"></ul>');
  shell.controls.append(list, h(`<div class="ws-tools"><button class="tool" data-tool="hint"><span class="tool-ic">${bulb}</span><span>Show a word</span></button></div>`));

  function startLevel() {
    shell.hideWin();
    wrap.hidden = true;
    shell.loading(true);
    shell.setLevel(saved.level);
    const level = saved.level, lang = settings.get('lang');
    setTimeout(() => {
      if (level !== saved.level || !shell.el.isConnected) return;
      puz = buildLevel(level, lang);
      if (saved.lang !== lang) { saved.found = []; saved.lang = lang; }
      found = new Set(saved.found.filter((p) => puz.words.some((w) => w.plain === p)));
      shell.setTier(puz.tier);
      shell.setLives(saved.lives);
      wrap.querySelector('.ws-theme').textContent = puz.theme;
      grid.style.setProperty('--n', puz.size);
      grid.replaceChildren(...puz.grid.map((l, i) => h(`<span class="ws-cell" data-i="${i}">${l}</span>`)));
      cells = [...grid.children];
      lines.setAttribute('viewBox', `0 0 ${puz.size} ${puz.size}`);
      render();
      shell.loading(false);
      wrap.hidden = false;
      if (!saved.seenRules) shell.openRules();
      setTimeout(() => buildLevel(level + 1, lang), 400);
    }, 30);
  }

  const center = (i) => [(i % puz.size) + 0.5, Math.floor(i / puz.size) + 0.5];
  const line = (a, b, cls, color) => {
    const [x1, y1] = center(a), [x2, y2] = center(b);
    return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${color ? ` style="stroke:var(--p${color})"` : ''}/>`;
  };

  function render() {
    const parts = puz.words.map((w, k) => (found.has(w.plain) ? line(w.cells[0], w.cells.at(-1), 'found', LINE_COLORS[k % LINE_COLORS.length]) : '')).join('');
    lines.innerHTML = parts + (drag?.path.length ? line(drag.path[0], drag.path.at(-1), 'current') : '');
    list.replaceChildren(...puz.words.map((w) => h(`<li class="${found.has(w.plain) ? 'got' : ''}">${w.word}</li>`)));
    saved.found = [...found];
    save(saved);
    if (!shell.won && found.size === puz.words.length) win();
  }

  function pathTo(start, end) {
    const n = puz.size, r0 = Math.floor(start / n), c0 = start % n;
    let dr = Math.floor(end / n) - r0, dc = (end % n) - c0;
    const len = Math.max(Math.abs(dr), Math.abs(dc));
    if (!len) return [start];
    const angle = Math.round(Math.atan2(dr, dc) / (Math.PI / 4)) * (Math.PI / 4);
    dr = Math.round(Math.sin(angle)); dc = Math.round(Math.cos(angle));
    const out = [];
    for (let k = 0; k <= len; k++) {
      const r = r0 + dr * k, c = c0 + dc * k;
      if (r < 0 || r >= n || c < 0 || c >= n) break;
      out.push(r * n + c);
    }
    return out;
  }

  function check(path) {
    const key = path.join(), rev = [...path].reverse().join();
    const w = puz.words.find((x) => !found.has(x.plain) && (x.cells.join() === key || x.cells.join() === rev));
    if (w) {
      found.add(w.plain);
      haptic.place();
      return;
    }
    if (path.length < 3 || puz.words.some((x) => found.has(x.plain) && (x.cells.join() === key || x.cells.join() === rev))) return;
    path.forEach((i) => {
      cells[i].classList.remove('miss');
      void cells[i].offsetWidth;
      cells[i].classList.add('miss');
    });
    saved.lives -= 1;
    save(saved);
    shell.loseLife(saved.lives);
  }

  function hint() {
    const w = puz.words.find((x) => !found.has(x.plain));
    if (!w) return;
    saved.hinted = true;
    const c = cells[w.cells[0]];
    c.classList.remove('hinted');
    void c.offsetWidth;
    c.classList.add('hinted');
    haptic.tap();
    toast(`${w.word} starts at the glowing letter`);
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = stats.win('wordsearch', puz.tier, saved.hinted).solved;
    saved.hinted = false;
    saved.lives = LIVES;
    const level = saved.level;
    saved.level += 1;
    saved.found = [];
    save(saved);
    setTimeout(() => shell.showWin(level, `${TIER_LABEL[puz.tier]} · ${puz.theme} · ${saved.solved} solved so far`), 700);
  }

  const cellAt = (e) => {
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ws-cell');
    return t && grid.contains(t) ? +t.dataset.i : -1;
  };
  board.addEventListener('pointerdown', (e) => {
    if (shell.won || !puz) return;
    const i = cellAt(e);
    if (i < 0) return;
    drag = { start: i, path: [i] };
    board.setPointerCapture(e.pointerId);
    haptic.tap();
    render();
  });
  board.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const i = cellAt(e);
    if (i < 0) return;
    const path = pathTo(drag.start, i);
    if (path.length !== drag.path.length || path.at(-1) !== drag.path.at(-1)) {
      drag.path = path;
      render();
    }
  });
  board.addEventListener('pointerup', () => {
    if (!drag) return;
    const path = drag.path;
    drag = null;
    check(path);
    render();
  });
  board.addEventListener('pointercancel', () => { drag = null; render(); });
  shell.controls.addEventListener('click', (e) => {
    if (e.target.closest('[data-tool="hint"]') && !shell.won && puz) hint();
  });

  startLevel();
  return { destroy: () => shell.el.remove() };
}
