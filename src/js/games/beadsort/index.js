import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h, toast } from '../../core/ui.js';
import { createShell, TIER_LABEL, LIVES } from '../../core/shell.js';
import { stats } from '../../core/stats.js';
import { ART, SLOTS, HOLE, target, lift, place, settle, jammed, unjam, solved, correct, total, bestLift } from './engine.js';
import { buildLevel } from './levels.js';

const shade = (hex) => (parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16) < 90 ? 'var(--bead-k)' : hex);
const title = (name) => name.split('/')[1].replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const art = `<svg viewBox="0 0 40 40" aria-hidden="true">
  ${[[14, 9, 'k'], [20, 9, 'k'], [26, 9, 'k'], [11, 15, 'k'], [17, 15, '5'], [23, 15, '0'], [29, 15, 'k'], [11, 21, 'k'], [17, 21, '5'], [23, 21, '5'], [29, 21, 'k'], [14, 27, 'k'], [20, 27, '0'], [26, 27, 'k'], [20, 33, 'k']]
    .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.7" fill="${c === 'k' ? 'var(--bead-k)' : `var(--p${c})`}"/>`).join('')}
</svg>`;
const autoIc = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="17" r="3" fill="currentColor"/><circle cx="17" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 14.5 L14.5 9.5 M11 9.5 H14.5 V13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const bulb = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 H15 M10 20.5 H14 M8.5 14 Q6 12 6 9 A6 6 0 0 1 18 9 Q18 12 15.5 14 L15 17 H9 Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const rules = `<ul class="rules">
  <li><span class="rule-ic">${art}</span><span><b>The picture is scrambled.</b> Rebuild it to match the small preview.</span></li>
  <li><span class="rule-ic">${art}</span><span><b>Tap a bead</b> to lift it into the trays, which hold any colors. Then tap a bead in the trays and an empty spot to place it.</span></li>
  <li><span class="rule-ic rule-num">3</span><span><b>You have 3 lives.</b> Placing a bead in a spot of another color costs one, and so does filling every tray slot with beads that fit nowhere.</span></li>
</ul>
<p class="sheet-note">Empty spots show a ring in the color they need. The level is done when the picture is complete. Auto-place is a hint that drops every fitting tray bead into place.</p>`;

const load = () => ({ level: 1, board: null, trays: [], solved: 0, lives: LIVES, ...store.get('beadsort', {}) });
const save = (s) => store.set('beadsort', s);

export default {
  id: 'beadsort',
  name: 'Bead Sort',
  blurb: 'Unscramble pixel pictures and famous paintings, bead by bead.',
  art,
  color: 'var(--r6)',
  progress: () => `Level ${load().level}`,
  mount,
};

function mount(root, { exit }) {
  const saved = load();
  let puz, goal, st, cap, colors, beadEls = [], sel = -1;

  const reset = () => { st = { board: puz.board.slice(), trays: [] }; sel = -1; render(); };
  const shell = createShell(root, {
    name: 'Bead Sort',
    rules,
    winArt: `<div class="win-icon">${art}</div>`,
    onBack: exit,
    onRestart: reset,
    onRetry: () => { saved.lives = LIVES; shell.setLives(LIVES); reset(); },
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });
  const wrap = h(`<div class="bead-wrap" hidden>
    <div class="bead-head"><svg class="bead-goal" aria-label="Finished picture"></svg><p class="ws-theme"></p></div>
    <div class="bead-progress"><span></span><b>0%</b></div>
    <div class="bead-board" role="grid" aria-label="Bead picture"></div>
  </div>`);
  shell.stage.append(wrap);
  const board = wrap.querySelector('.bead-board'), goalSvg = wrap.querySelector('.bead-goal'), caption = wrap.querySelector('.ws-theme');
  const bar = wrap.querySelector('.bead-progress span'), pct = wrap.querySelector('.bead-progress b');
  const trays = h('<div class="trays" aria-label="Trays"></div>');
  shell.controls.append(trays, h(`<div class="ms-tools bead-tools">
    <button class="tool" data-tool="hint"><span class="tool-ic">${bulb}</span><span>Show a bead</span></button>
    <button class="tool" data-tool="auto"><span class="tool-ic">${autoIc}</span><span>Auto-place</span></button>
  </div>`));

  function startLevel() {
    shell.hideWin();
    wrap.hidden = true;
    shell.loading(true);
    shell.setLevel(saved.level);
    const level = saved.level;
    setTimeout(() => {
      if (level !== saved.level || !shell.el.isConnected) return;
      puz = buildLevel(level);
      goal = target(puz.name);
      cap = puz.trays * SLOTS;
      const info = ART[puz.name];
      colors = info.title ? info.palette.slice() : info.palette.map(shade);
      caption.innerHTML = info.title ? `${info.title}<small>${info.artist}, ${info.year}</small>` : title(puz.name);
      st = saved.board?.length === puz.board.length ? { board: saved.board.slice(), trays: saved.trays.slice() } : { board: puz.board.slice(), trays: [] };
      shell.setTier(puz.tier);
      shell.setLives(saved.lives);
      goalSvg.setAttribute('viewBox', `0 0 ${goal.w} ${goal.h}`);
      goalSvg.innerHTML = Array.from(goal.cells).map((c, i) => (c >= 0 ? `<rect x="${i % goal.w}" y="${Math.floor(i / goal.w)}" width="1.02" height="1.02" style="fill:${colors[c]}"/>` : '')).join('');
      board.style.setProperty('--w', goal.w);
      board.style.setProperty('--h', goal.h);
      board.replaceChildren(...Array.from(goal.cells).map((c, i) => h(`<span class="bead${c < 0 ? ' off' : ''}" data-i="${i}"></span>`)));
      beadEls = [...board.children];
      render();
      shell.loading(false);
      wrap.hidden = false;
      if (!saved.seenRules) shell.openRules();
      setTimeout(() => buildLevel(level + 1), 400);
    }, 30);
  }

  function render(flash = [], cls = 'placed') {
    st.board.forEach((c, i) => {
      if (goal.cells[i] < 0) return;
      const el = beadEls[i];
      el.classList.toggle('hole', c === HOLE);
      el.style.background = c >= 0 ? colors[c] : '';
      el.style.setProperty('--goal', colors[goal.cells[i]]);
    });
    flash.forEach((i) => {
      beadEls[i].classList.remove(cls);
      void beadEls[i].offsetWidth;
      beadEls[i].classList.add(cls);
    });
    trays.replaceChildren(...Array.from({ length: puz.trays }, (_, t) => h(`<div class="tray">${Array.from({ length: SLOTS }, (_, k) => {
      const n = t * SLOTS + k, c = st.trays[n];
      return c !== undefined
        ? `<button class="slot full${n === sel ? ' sel' : ''}" data-k="${n}" style="background:${colors[c]}" aria-label="Tray bead ${n + 1}"></button>`
        : '<span class="slot"></span>';
    }).join('')}</div>`)));
    const p = Math.floor((correct(goal, st.board) / total(goal)) * 100);
    bar.style.setProperty('--w', `${p}%`);
    pct.textContent = `${p}%`;
    saved.board = st.board;
    saved.trays = st.trays;
    save(saved);
    if (!shell.won && solved(goal, st)) win();
  }

  function mistake(i) {
    saved.lives -= 1;
    save(saved);
    render([i], 'returned');
    shell.loseLife(saved.lives);
  }

  function pick(i, hinted) {
    if (goal.cells[i] < 0) return;
    if (st.board[i] === HOLE) {
      if (sel < 0) return toast('Pick a bead from the trays first');
      if (!place(goal, st, sel, i)) return mistake(i);
      sel = -1;
      haptic.place();
      return render([i]);
    }
    if (st.trays.length >= cap) return toast('The trays are full');
    lift(st, i, cap);
    sel = -1;
    haptic.tap();
    render(hinted ? [i] : []);
    if (jammed(goal, st, cap)) {
      setTimeout(() => {
        const back = unjam(st);
        saved.lives -= 1;
        save(saved);
        render(back, 'returned');
        shell.loseLife(saved.lives);
      }, 450);
    }
  }

  function hint() {
    const i = bestLift(goal, st);
    if (i === undefined) return;
    saved.hinted = true;
    pick(i, true);
  }

  function autoPlace() {
    const placed = settle(goal, st);
    if (!placed.length) return toast('No tray bead fits an empty spot yet');
    saved.hinted = true;
    sel = -1;
    haptic.place();
    render(placed);
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = stats.win('beadsort', puz.tier, saved.hinted).solved;
    saved.hinted = false;
    saved.lives = LIVES;
    const level = saved.level;
    saved.level += 1;
    saved.board = null;
    saved.trays = [];
    save(saved);
    const info = ART[puz.name];
    setTimeout(() => shell.showWin(level, `${TIER_LABEL[puz.tier]} · ${info.title || title(puz.name)} · ${saved.solved} solved so far`), 600);
  }

  board.addEventListener('click', (e) => {
    const b = e.target.closest('.bead');
    if (b && !shell.won && puz) pick(+b.dataset.i);
  });
  shell.controls.addEventListener('click', (e) => {
    if (shell.won || !puz) return;
    const slot = e.target.closest('.slot.full');
    if (slot) {
      sel = sel === +slot.dataset.k ? -1 : +slot.dataset.k;
      haptic.tap();
      return render();
    }
    const tool = e.target.closest('[data-tool]')?.dataset.tool;
    if (tool === 'hint') hint();
    if (tool === 'auto') autoPlace();
  });

  startLevel();
  return { destroy: () => shell.el.remove() };
}
