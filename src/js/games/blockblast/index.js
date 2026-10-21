import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h, toast } from '../../core/ui.js';
import { createShell, TIER_LABEL, LIVES } from '../../core/shell.js';
import { stats } from '../../core/stats.js';
import { rng } from '../../core/rng.js';
import { N, SHAPES, fits, spots, place, score, deal, bestMove, obstacles } from './engine.js';
import { levelSpec } from './levels.js';

const COLORS = [8, 4, 3, 1, 0, 9, 5, 7, 13, 2];
const art = `<svg viewBox="0 0 40 40" aria-hidden="true">
  ${[[6, 22, 8], [14, 22, 8], [22, 22, 8], [6, 30, 4], [14, 30, 4], [22, 30, 3], [30, 30, 3], [30, 22, 3], [22, 14, 1], [22, 6, 1], [30, 14, 1]]
    .map(([x, y, c]) => `<rect x="${x}" y="${y}" width="7" height="7" rx="1.6" fill="var(--p${c})"/>`).join('')}
</svg>`;
const bulb = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 H15 M10 20.5 H14 M8.5 14 Q6 12 6 9 A6 6 0 0 1 18 9 Q18 12 15.5 14 L15 17 H9 Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const rules = `<ul class="rules">
  <li><span class="rule-ic">${art}</span><span><b>Drag the three pieces</b> onto the board. Full rows and columns clear.</span></li>
  <li><span class="rule-ic">${art}</span><span><b>Reach the target score</b> to finish the level. Clearing several lines at once, or in a row, scores more.</span></li>
  <li><span class="rule-ic rule-num">3</span><span><b>You have 3 lives.</b> Running out of room costs one, and you get three new pieces that fit.</span></li>
</ul>
<p class="sheet-note">Pieces can't be rotated. Grey stones on harder levels clear like any other block.</p>`;

const load = () => ({ level: 1, game: null, solved: 0, lives: LIVES, ...store.get('blockblast', {}) });
const save = (s) => store.set('blockblast', s);

export default {
  id: 'blockblast',
  name: 'Block Blast',
  blurb: 'Fit blocks on an 8×8 board, clear lines and reach the target score.',
  art,
  color: 'var(--r3)',
  progress: () => `Level ${load().level}`,
  mount,
};

function mount(root, { exit }) {
  const saved = load();
  let spec, g, cells = [], drag = null;

  const fresh = () => {
    const board = obstacles(spec.seed + 1, spec.stones);
    const game = { board, score: 0, streak: 0, deals: 0, pieces: [], colors: [] };
    dealInto(game, false);
    return game;
  };
  function dealInto(game, rescue) {
    const r = rng(spec.seed + ++game.deals * 7919);
    game.pieces = deal(r, game.board, rescue ? 0 : spec.tier, rescue || spec.guarantee);
    game.colors = game.pieces.map((_, k) => COLORS[(game.deals * 3 + k) % COLORS.length]);
  }

  const shell = createShell(root, {
    name: 'Block Blast',
    rules,
    winArt: `<div class="win-icon">${art}</div>`,
    onBack: exit,
    onRestart: () => { g = fresh(); render(); },
    onRetry: () => { saved.lives = LIVES; shell.setLives(LIVES); g = fresh(); render(); },
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });
  const wrap = h(`<div class="bb-wrap" hidden>
    <div class="bb-score"><b>0</b><span>of <i></i> points</span></div>
    <div class="bead-progress"><span></span><b></b></div>
    <div class="bb-board" aria-label="Board"></div>
  </div>`);
  shell.stage.append(wrap);
  const board = wrap.querySelector('.bb-board');
  for (let i = 0; i < N * N; i++) board.append(h('<span class="bb-cell"></span>'));
  cells = [...board.children];
  const tray = h('<div class="bb-tray" aria-label="Pieces"></div>');
  shell.controls.append(tray, h(`<div class="ws-tools"><button class="tool" data-tool="hint"><span class="tool-ic">${bulb}</span><span>Show a spot</span></button></div>`));

  function startLevel() {
    shell.hideWin();
    spec = levelSpec(saved.level);
    shell.setLevel(saved.level);
    shell.setTier(spec.tier);
    shell.setLives(saved.lives);
    g = saved.game?.level === saved.level ? saved.game : fresh();
    wrap.querySelector('.bb-score i').textContent = spec.target;
    wrap.hidden = false;
    render();
    if (!saved.seenRules) shell.openRules();
  }

  const colorOf = (v) => (v === 99 ? 'var(--stone)' : `var(--p${v})`);
  const pieceHtml = (p, color, size) => {
    const s = SHAPES[p];
    return `<span class="bb-piece" style="--pw:${s.w};--ph:${s.h};--cell:${size}px">${Array.from({ length: s.w * s.h }, (_, i) => {
      const on = s.cells.some(([y, x]) => y * s.w + x === i);
      return `<i${on ? ` style="background:${colorOf(color)}"` : ''}></i>`;
    }).join('')}</span>`;
  };

  function render(flash = []) {
    g.board.forEach((v, i) => {
      cells[i].style.background = v >= 0 ? colorOf(v) : '';
      cells[i].classList.toggle('on', v >= 0);
      cells[i].classList.remove('ghost', 'bad', 'hint');
    });
    flash.forEach((i) => {
      cells[i].classList.remove('clearing');
      void cells[i].offsetWidth;
      cells[i].classList.add('clearing');
    });
    tray.replaceChildren(...g.pieces.map((p, k) => h(`<div class="bb-slot" data-k="${k}">${p >= 0 ? pieceHtml(p, g.colors[k], 18) : ''}</div>`)));
    wrap.querySelector('.bb-score b').textContent = Math.floor(g.score);
    const pct = Math.min(100, Math.floor((g.score / spec.target) * 100));
    wrap.querySelector('.bead-progress span').style.setProperty('--w', `${pct}%`);
    wrap.querySelector('.bead-progress b').textContent = `${pct}%`;
    saved.game = { ...g, level: saved.level };
    save(saved);
  }

  function drop(k, r, c) {
    const shape = SHAPES[g.pieces[k]];
    const res = place(g.board, shape, r, c, g.colors[k]);
    g.board = res.board;
    g.streak = res.lines ? g.streak + 1 : 0;
    g.score += score(shape.cells.length, res.lines, g.streak);
    g.pieces[k] = -1;
    haptic.place();
    if (res.lines) {
      haptic.tap();
      if (res.lines > 1 || g.streak > 1) toast(res.lines > 1 ? `${res.lines} lines!` : `Streak ×${g.streak}`);
    }
    if (g.pieces.every((p) => p < 0)) dealInto(g, false);
    render(res.cleared);
    if (g.score >= spec.target) return win();
    if (!g.pieces.some((p) => p >= 0 && spots(g.board, SHAPES[p]).length)) {
      saved.lives -= 1;
      save(saved);
      shell.loseLife(saved.lives);
      if (saved.lives > 0) {
        dealInto(g, true);
        setTimeout(() => { toast('Out of room. Here are three new pieces'); render(); }, 600);
      }
    }
  }

  function hint() {
    const m = bestMove(g.board, g.pieces);
    if (!m) return;
    saved.hinted = true;
    SHAPES[g.pieces[m.k]].cells.forEach(([y, x]) => cells[(m.r + y) * N + m.c + x].classList.add('hint'));
    tray.children[m.k].classList.add('hint');
    setTimeout(() => {
      cells.forEach((c) => c.classList.remove('hint'));
      tray.children[m.k]?.classList.remove('hint');
    }, 1600);
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = stats.win('blockblast', spec.tier, saved.hinted).solved;
    saved.hinted = false;
    saved.lives = LIVES;
    const level = saved.level;
    saved.level += 1;
    saved.game = null;
    save(saved);
    setTimeout(() => shell.showWin(level, `${TIER_LABEL[spec.tier]} · ${Math.floor(g.score)} points · ${saved.solved} solved so far`), 600);
  }

  function metrics() {
    const rect = board.getBoundingClientRect(), pad = 6, gap = 3;
    const cell = (rect.width - pad * 2 - gap * (N - 1)) / N;
    return { left: rect.left + pad, top: rect.top + pad, cell, pitch: cell + gap };
  }

  function target() {
    const m = metrics(), fr = drag.el.getBoundingClientRect();
    return { r: Math.round((fr.top - m.top) / m.pitch), c: Math.round((fr.left - m.left) / m.pitch) };
  }

  function showGhost() {
    cells.forEach((c) => c.classList.remove('ghost', 'bad'));
    const { r, c } = target();
    const shape = SHAPES[g.pieces[drag.k]];
    const ok = fits(g.board, shape, r, c);
    drag.spot = ok ? [r, c] : null;
    if (!ok) return;
    shape.cells.forEach(([y, x]) => {
      const el = cells[(r + y) * N + c + x];
      el.classList.add('ghost');
      el.style.setProperty('--ghost', colorOf(g.colors[drag.k]));
    });
  }

  tray.addEventListener('pointerdown', (e) => {
    const slot = e.target.closest('.bb-slot');
    if (!slot || shell.won || g.pieces[+slot.dataset.k] < 0) return;
    e.preventDefault();
    const k = +slot.dataset.k, { cell, pitch } = metrics(), shape = SHAPES[g.pieces[k]];
    const el = h(pieceHtml(g.pieces[k], g.colors[k], cell));
    el.classList.add('bb-floating');
    document.body.append(el);
    drag = { k, el, dx: (shape.w * pitch) / 2, dy: shape.h * pitch + pitch * 1.2, spot: null };
    slot.classList.add('lifted');
    move(e);
    tray.setPointerCapture(e.pointerId);
  });
  const move = (e) => {
    if (!drag) return;
    drag.el.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
    showGhost();
  };
  tray.addEventListener('pointermove', move);
  const end = () => {
    if (!drag) return;
    const { k, spot, el } = drag;
    el.remove();
    drag = null;
    if (spot) drop(k, spot[0], spot[1]);
    else render();
  };
  tray.addEventListener('pointerup', end);
  tray.addEventListener('pointercancel', end);
  shell.controls.addEventListener('click', (e) => {
    if (e.target.closest('[data-tool="hint"]') && !shell.won) hint();
  });

  startLevel();
  return { destroy: () => { drag?.el.remove(); shell.el.remove(); } };
}
