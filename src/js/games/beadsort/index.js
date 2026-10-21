import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h, toast } from '../../core/ui.js';
import { createShell, TIER_LABEL, LIVES } from '../../core/shell.js';
import { stats } from '../../core/stats.js';
import { CAP, fromRows, exposed, trayFor, take, empty, solve, cloneState, ART, LETTERS } from './engine.js';
import { buildLevel } from './levels.js';

const shade = (hex) => (parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16) < 90 ? 'var(--bead-k)' : hex);
const title = (name) => name.split('/')[1].replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const art = `<svg viewBox="0 0 40 40" aria-hidden="true">
  ${[[14, 9, 'k'], [20, 9, 'k'], [26, 9, 'k'], [11, 15, 'k'], [17, 15, '5'], [23, 15, '5'], [29, 15, 'k'], [11, 21, 'k'], [17, 21, '5'], [23, 21, '0'], [29, 21, 'k'], [14, 27, 'k'], [20, 27, '5'], [26, 27, 'k'], [20, 33, 'k']]
    .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.7" fill="${c === 'k' ? 'var(--bead-k)' : `var(--p${c})`}"/>`).join('')}
</svg>`;
const bulb = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 H15 M10 20.5 H14 M8.5 14 Q6 12 6 9 A6 6 0 0 1 18 9 Q18 12 15.5 14 L15 17 H9 Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const rules = `<ul class="rules">
  <li><span class="rule-ic">${art}</span><span><b>Take the picture apart</b> one bead at a time, starting from the edges.</span></li>
  <li><span class="rule-ic">${art}</span><span><b>Each tray holds 9 beads of one color.</b> It empties when it's full or that color is used up.</span></li>
  <li><span class="rule-ic rule-num">3</span><span><b>You have 3 lives.</b> Tapping a bead when no tray can take it costs one.</span></li>
</ul>
<p class="sheet-note">Only beads touching the outside or an empty space can be picked; the others look dimmer. Clear every bead to finish. Pictures come from the free (CC0) Dungeon Crawl Stone Soup tile set.</p>`;

const load = () => ({ lives: LIVES, ...store.get('beadsort', { level: 1, beads: null, trays: null, solved: 0, seenRules: false }) });
const save = (s) => store.set('beadsort', s);

export default {
  id: 'beadsort',
  name: 'Bead Sort',
  blurb: 'Pick beads off a pixel picture and fill trays of one color.',
  art,
  color: 'var(--r6)',
  progress: () => `Level ${load().level}`,
  mount,
};

function mount(root, { exit }) {
  const saved = load();
  let puz, st, colors, beadEls = [];

  const fresh = () => ({ ...fromRows(puz.rows, LETTERS.slice(0, puz.palette.length)), trays: Array.from({ length: puz.trays }, () => ({ c: -1, n: 0 })) });
  const shell = createShell(root, {
    name: 'Bead Sort',
    rules,
    winArt: `<div class="win-icon">${art}</div>`,
    onBack: exit,
    onRestart: () => { st = fresh(); render(); },
    onRetry: () => { st = fresh(); saved.lives = LIVES; shell.setLives(LIVES); render(); },
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });
  const wrap = h('<div class="bead-wrap"><p class="ws-theme"></p><div class="bead-board" role="grid" aria-label="Bead picture" hidden></div></div>');
  shell.stage.append(wrap);
  const board = wrap.querySelector('.bead-board'), caption = wrap.querySelector('.ws-theme');
  const trays = h('<div class="trays" aria-label="Trays"></div>');
  shell.controls.append(trays, h(`<div class="ws-tools"><button class="tool" data-tool="hint"><span class="tool-ic">${bulb}</span><span>Show a bead</span></button></div>`));

  function startLevel() {
    shell.hideWin();
    board.hidden = true;
    shell.loading(true);
    shell.setLevel(saved.level);
    const level = saved.level;
    setTimeout(() => {
      if (level !== saved.level || !shell.el.isConnected) return;
      puz = buildLevel(level);
      const info = ART[puz.name];
      colors = info.title ? puz.palette.slice() : puz.palette.map(shade);
      caption.innerHTML = info.title ? `${info.title}<small>${info.artist}, ${info.year}</small>` : title(puz.name);
      st = fresh();
      if (saved.beads?.length === st.beads.length && saved.trays?.length === puz.trays) {
        st.beads = Int16Array.from(saved.beads);
        st.trays = saved.trays.map((t) => ({ ...t }));
        st.left = st.left.map((_, c) => saved.beads.filter((b) => b === c).length);
      }
      shell.setTier(puz.tier);
      shell.setLives(saved.lives);
      board.style.setProperty('--w', st.w);
      board.style.setProperty('--h', st.h);
      board.replaceChildren(...[...st.beads].map((_, i) => h(`<span class="bead" data-i="${i}"></span>`)));
      beadEls = [...board.children];
      render();
      shell.loading(false);
      board.hidden = false;
      if (!saved.seenRules) shell.openRules();
      setTimeout(() => buildLevel(level + 1), 400);
    }, 30);
  }

  function render() {
    beadEls.forEach((el, i) => {
      const c = st.beads[i];
      el.classList.toggle('gone', c < 0);
      el.classList.toggle('deep', c >= 0 && !exposed(st, i));
      el.style.background = c >= 0 ? colors[c] : '';
    });
    trays.replaceChildren(...st.trays.map((t) => h(`<div class="tray">${Array.from({ length: CAP }, (_, k) =>
      `<span class="slot"${k < t.n ? ` style="background:${colors[t.c]}"` : ''}></span>`).join('')}</div>`)));
    saved.beads = [...st.beads];
    saved.trays = st.trays;
    save(saved);
    if (!shell.won && empty(st)) win();
  }

  function pick(i, hinted) {
    if (st.beads[i] < 0) return;
    if (!exposed(st, i)) return toast('Pick beads from the edges first');
    if (trayFor(st, st.beads[i]) < 0) {
      beadEls[i].classList.remove('miss');
      void beadEls[i].offsetWidth;
      beadEls[i].classList.add('miss');
      saved.lives -= 1;
      save(saved);
      return shell.loseLife(saved.lives);
    }
    const before = st.trays.map((t) => t.n);
    const k = take(st, i);
    haptic.place();
    render();
    if (hinted) beadEls[i].classList.add('hinted');
    if (before[k] === CAP - 1) {
      trays.children[k].classList.add('cleared');
      haptic.tap();
    }
  }

  let plan = null;
  function planWorks(path) {
    const s = cloneState(st);
    for (const i of path) if (!exposed(s, i) || take(s, i) < 0) return false;
    return empty(s);
  }

  function hint() {
    saved.hinted = true;
    if (!plan || !planWorks(plan)) plan = planWorks(puz.path) ? puz.path.slice() : solve(st, saved.level * 17 + st.left.reduce((a, b) => a + b, 0), 120);
    if (!plan) return toast('No way to finish from here. Restart to try again.');
    pick(plan.shift(), true);
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = stats.win('beadsort', puz.tier, saved.hinted).solved;
    saved.hinted = false;
    saved.lives = LIVES;
    const level = saved.level;
    saved.level += 1;
    saved.beads = null;
    saved.trays = null;
    save(saved);
    setTimeout(() => shell.showWin(level, `${TIER_LABEL[puz.tier]} · ${puz.beadCount} beads · ${saved.solved} solved so far`), 600);
  }

  board.addEventListener('click', (e) => {
    const b = e.target.closest('.bead');
    if (b && !shell.won && puz) pick(+b.dataset.i);
  });
  shell.controls.addEventListener('click', (e) => {
    if (e.target.closest('[data-tool="hint"]') && !shell.won && puz) hint();
  });

  startLevel();
  return { destroy: () => shell.el.remove() };
}
