import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h } from '../../core/ui.js';
import { createShell, TIER_LABEL, LIVES } from '../../core/shell.js';
import { stats } from '../../core/stats.js';
import { buildGrid, canExit, ray, freeArrows } from './engine.js';
import { buildLevel } from './levels.js';

const COLORS = [8, 4, 3, 1, 0, 7, 5, 9, 2, 13, 11, 12, 6, 10, 14];
const art = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <path d="M9 30 V18 H21" fill="none" stroke="var(--p3)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M20 13 L26 18 L20 23 Z" fill="var(--p3)"/>
  <path d="M31 33 V24" fill="none" stroke="var(--p8)" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M26 24 L31 17 L36 24 Z" fill="var(--p8)"/>
  <path d="M12 8 H28" fill="none" stroke="var(--p4)" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M27 3 L33 8 L27 13 Z" fill="var(--p4)"/>
</svg>`;
const bulb = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 H15 M10 20.5 H14 M8.5 14 Q6 12 6 9 A6 6 0 0 1 18 9 Q18 12 15.5 14 L15 17 H9 Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const rules = `<ul class="rules">
  <li><span class="rule-ic">${art}</span><span><b>Tap an arrow</b> to send it off the board in the direction it points.</span></li>
  <li><span class="rule-ic">${art}</span><span><b>It only leaves if the way ahead is clear.</b> Bent arrows follow their own path out.</span></li>
  <li><span class="rule-ic rule-num">3</span><span><b>You have 3 lives.</b> Tapping an arrow that's blocked costs one.</span></li>
</ul>
<p class="sheet-note">Clear every arrow to finish the level.</p>`;

const load = () => ({ level: 1, gone: [], solved: 0, lives: LIVES, ...store.get('arrowgo', {}) });
const save = (s) => store.set('arrowgo', s);

export default {
  id: 'arrowgo',
  name: 'Arrow Go',
  blurb: 'Send every arrow off the board, in the right order.',
  art,
  color: 'var(--r8)',
  progress: () => `Level ${load().level}`,
  mount,
};

function mount(root, { exit }) {
  const saved = load();
  let puz, arrows = [], n = 0;

  const reset = () => { arrows.forEach((a) => { a.gone = false; }); draw(); };
  const shell = createShell(root, {
    name: 'Arrow Go',
    rules,
    winArt: `<div class="win-icon">${art}</div>`,
    onBack: exit,
    onRestart: reset,
    onRetry: () => { saved.lives = LIVES; shell.setLives(LIVES); reset(); },
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });
  const board = h('<div class="ag-board" hidden><svg class="ag-svg" role="img" aria-label="Arrow board"></svg></div>');
  shell.stage.append(board);
  const svg = board.firstChild;
  shell.controls.append(h(`<div class="ws-tools"><button class="tool" data-tool="hint"><span class="tool-ic">${bulb}</span><span>Show an arrow</span></button></div>`));

  function startLevel() {
    shell.hideWin();
    board.hidden = true;
    shell.loading(true);
    shell.setLevel(saved.level);
    const level = saved.level;
    setTimeout(() => {
      if (level !== saved.level || !shell.el.isConnected) return;
      puz = buildLevel(level);
      n = puz.n;
      arrows = puz.arrows.map((a, k) => ({ cells: a.cells, gone: saved.gone.includes(k), color: `var(--p${COLORS[k % COLORS.length]})` }));
      shell.setTier(puz.tier);
      shell.setLives(saved.lives);
      svg.setAttribute('viewBox', `-0.15 -0.15 ${n + 0.3} ${n + 0.3}`);
      draw();
      shell.loading(false);
      board.hidden = false;
      if (!saved.seenRules) shell.openRules();
      setTimeout(() => buildLevel(level + 1), 400);
    }, 30);
  }

  const pts = (cells) => cells.map(([x, y]) => `${x + 0.5},${y + 0.5}`).join(' ');
  function head(cells) {
    const [hx, hy] = cells[cells.length - 1], [px, py] = cells[cells.length - 2];
    const dx = hx - px, dy = hy - py, cx = hx + 0.5 + dx * 0.18, cy = hy + 0.5 + dy * 0.18;
    const tip = [cx + dx * 0.3, cy + dy * 0.3], l = [cx - dx * 0.12 - dy * 0.3, cy - dy * 0.12 + dx * 0.3], r = [cx - dx * 0.12 + dy * 0.3, cy - dy * 0.12 - dx * 0.3];
    return `${tip} ${l} ${r}`;
  }
  const arrowEl = (a, k) => `<g class="ag-arrow" data-k="${k}" style="--c:${a.color}">
    <polyline class="hit" points="${pts(a.cells)}"/>
    <polyline class="body" points="${pts(a.cells)}"/>
    <polygon class="tip" points="${head(a.cells)}"/>
  </g>`;

  function draw() {
    let dots = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) dots += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.06"/>`;
    svg.innerHTML = `<g class="ag-dots">${dots}</g>` + arrows.map((a, k) => (a.gone ? '' : arrowEl(a, k))).join('');
    saved.gone = arrows.map((a, k) => (a.gone ? k : -1)).filter((k) => k >= 0);
    save(saved);
  }

  function slideOut(k) {
    const a = arrows[k], { out, dx, dy } = ray(n, a.cells), [hx, hy] = a.cells[a.cells.length - 1];
    const path = [...a.cells, ...out];
    for (let i = 1; i <= a.cells.length + 1; i++) path.push([hx + dx * (out.length + i), hy + dy * (out.length + i)]);
    const g = svg.querySelector(`[data-k="${k}"]`);
    let step = 0;
    const tick = () => {
      step++;
      const win = path.slice(step, step + a.cells.length);
      if (win.length < 2 || !g.isConnected) { g?.remove(); return; }
      g.querySelectorAll('polyline').forEach((p) => p.setAttribute('points', pts(win)));
      g.querySelector('.tip').setAttribute('points', head(win));
      setTimeout(tick, 32);
    };
    g.classList.add('leaving');
    tick();
  }

  function tap(k) {
    const a = arrows[k];
    if (a.gone) return;
    const grid = buildGrid(n, arrows);
    if (!canExit(n, grid, a)) {
      const g = svg.querySelector(`[data-k="${k}"]`);
      const blocker = ray(n, a.cells).out.find(([x, y]) => grid[y * n + x] >= 0);
      g.classList.remove('bump');
      void g.getBoundingClientRect();
      g.classList.add('bump');
      if (blocker) svg.querySelector(`[data-k="${grid[blocker[1] * n + blocker[0]]}"]`)?.classList.add('blocker');
      setTimeout(() => svg.querySelectorAll('.blocker').forEach((b) => b.classList.remove('blocker')), 700);
      saved.lives -= 1;
      save(saved);
      return shell.loseLife(saved.lives);
    }
    a.gone = true;
    haptic.place();
    saved.gone = arrows.map((x, i) => (x.gone ? i : -1)).filter((i) => i >= 0);
    save(saved);
    slideOut(k);
    if (arrows.every((x) => x.gone)) win();
  }

  function hint() {
    const free = freeArrows(n, arrows);
    if (!free.length) return;
    saved.hinted = true;
    const g = svg.querySelector(`[data-k="${free[0]}"]`);
    g.classList.remove('hinted');
    void g.getBoundingClientRect();
    g.classList.add('hinted');
    haptic.tap();
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = stats.win('arrowgo', puz.tier, saved.hinted).solved;
    saved.hinted = false;
    saved.lives = LIVES;
    const level = saved.level;
    saved.level += 1;
    saved.gone = [];
    save(saved);
    setTimeout(() => shell.showWin(level, `${TIER_LABEL[puz.tier]} · ${arrows.length} arrows · ${saved.solved} solved so far`), 700);
  }

  svg.addEventListener('click', (e) => {
    const g = e.target.closest('.ag-arrow');
    if (g && !shell.won && !g.classList.contains('leaving')) tap(+g.dataset.k);
  });
  shell.controls.addEventListener('click', (e) => {
    if (e.target.closest('[data-tool="hint"]') && !shell.won && puz) hint();
  });

  startLevel();
  return { destroy: () => shell.el.remove() };
}
