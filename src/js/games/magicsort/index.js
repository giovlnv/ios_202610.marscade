import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h, toast } from '../../core/ui.js';
import { createShell, TIER_LABEL } from '../../core/shell.js';
import { canPour, pour, solve, solved } from './engine.js';
import { buildLevel } from './levels.js';

const COLORS = [0, 1, 3, 4, 8, 9, 5, 7, 10, 11, 2, 13, 6, 12, 14];
const color = (c) => `var(--p${COLORS[c]})`;

const tubeSvg = (fills) => `<svg viewBox="0 0 40 40" aria-hidden="true">
  ${[8, 17, 26].map((x, k) => `<g>
    <rect x="${x}" y="${7 + k * 2}" width="7" height="${26 - k * 2}" rx="3.5" fill="var(--surface)" stroke="var(--edge)" stroke-width="1.6"/>
    ${fills[k].map((c, j) => `<rect x="${x + 1.3}" y="${30.2 - (j + 1) * 5.4}" width="4.4" height="5.4" rx="${j === 0 ? 2 : 0.5}" fill="${c}"/>`).join('')}
  </g>`).join('')}
</svg>`;
const art = tubeSvg([['var(--p0)', 'var(--p8)', 'var(--p0)'], ['var(--p8)', 'var(--p1)'], ['var(--p1)', 'var(--p0)', 'var(--p8)', 'var(--p1)']]);
const bulb = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 H15 M10 20.5 H14 M8.5 14 Q6 12 6 9 A6 6 0 0 1 18 9 Q18 12 15.5 14 L15 17 H9 Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const rules = `<ul class="rules">
  <li><span class="rule-ic">${art}</span><span><b>Sort the colors</b> so each tube holds a single color.</span></li>
  <li><span class="rule-ic">${art}</span><span><b>Pour onto the same color</b> or into an empty tube, as long as there's room.</span></li>
  <li><span class="rule-ic">${art}</span><span><b>Plan ahead.</b> If you get stuck, start the level over.</span></li>
</ul>
<p class="sheet-note">Tap a tube to pick it up, then tap where to pour. All matching layers on top pour together.</p>`;

const load = () => store.get('magicsort', { level: 1, tubes: null, solved: 0, seenRules: false });
const save = (s) => store.set('magicsort', s);

export default {
  id: 'magicsort',
  name: 'Magic Sort',
  blurb: 'Pour colored layers between tubes until every tube is one color.',
  art,
  color: 'var(--r13)',
  progress: () => `Level ${load().level}`,
  mount,
};

function mount(root, { exit }) {
  const saved = load();
  let puz, tubes, sel = -1;

  const shell = createShell(root, {
    name: 'Magic Sort',
    rules,
    winArt: `<div class="win-icon">${art}</div>`,
    onBack: exit,
    onRestart: () => { tubes = puz.tubes.map((t) => t.slice()); sel = -1; render(); },
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });
  const rack = h('<div class="rack" hidden></div>');
  shell.stage.append(rack);
  shell.controls.append(h(`<div class="ms-tools"><button class="tool" data-tool="hint"><span class="tool-ic">${bulb}</span><span>Show a move</span></button></div>`));

  function startLevel() {
    shell.hideWin();
    rack.hidden = true;
    shell.loading(true);
    shell.setLevel(saved.level);
    const level = saved.level;
    setTimeout(() => {
      if (level !== saved.level || !shell.el.isConnected) return;
      puz = buildLevel(level);
      tubes = saved.tubes?.length === puz.tubes.length ? saved.tubes.map((t) => t.slice()) : puz.tubes.map((t) => t.slice());
      sel = -1;
      shell.setTier(puz.tier);
      render();
      shell.loading(false);
      rack.hidden = false;
      if (!saved.seenRules) shell.openRules();
      setTimeout(() => buildLevel(level + 1), 400);
    }, 30);
  }

  function render(flash = []) {
    const n = tubes.length, perRow = n <= 6 ? n : Math.ceil(n / 2);
    rack.style.setProperty('--per-row', perRow);
    rack.style.setProperty('--cap', puz.cap);
    rack.replaceChildren(...tubes.map((t, i) => {
      const el = h(`<button class="tube" data-i="${i}" aria-label="Tube ${i + 1}: ${t.length ? t.length + ' layers' : 'empty'}"><span class="glass"></span></button>`);
      el.classList.toggle('sel', i === sel);
      el.classList.toggle('full', t.length === puz.cap && t.every((c) => c === t[0]));
      if (flash.includes(i)) el.classList.add('hinted');
      el.firstChild.append(...t.map((c) => {
        const s = h('<span class="seg"></span>');
        s.style.background = color(c);
        return s;
      }));
      return el;
    }));
    saved.tubes = tubes;
    save(saved);
    if (!shell.won && solved(tubes, puz.cap)) win();
  }

  function move(a, b, flash = []) {
    pour(tubes, puz.cap, a, b);
    haptic.place();
    sel = -1;
    render(flash);
  }

  function hint() {
    const path = solve(tubes, puz.cap);
    if (!path) return toast('No way to finish from here. Tap restart to try again.');
    if (!path.length) return;
    move(path[0][0], path[0][1], path[0]);
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = (saved.solved || 0) + 1;
    const level = saved.level;
    saved.level += 1;
    saved.tubes = null;
    save(saved);
    rack.classList.add('solved');
    setTimeout(() => {
      rack.classList.remove('solved');
      shell.showWin(level, `${TIER_LABEL[puz.tier]} · ${tubes.filter((t) => t.length).length} colors · ${saved.solved} solved so far`);
    }, 800);
  }

  rack.addEventListener('click', (e) => {
    const t = e.target.closest('.tube');
    if (!t || shell.won) return;
    const i = +t.dataset.i;
    if (sel < 0) {
      if (tubes[i].length) { sel = i; haptic.tap(); render(); }
    } else if (sel === i) {
      sel = -1;
      render();
    } else if (canPour(tubes, puz.cap, sel, i)) {
      move(sel, i);
    } else {
      sel = tubes[i].length ? i : -1;
      haptic.tap();
      render();
    }
  });
  shell.controls.addEventListener('click', (e) => {
    if (e.target.closest('[data-tool="hint"]') && !shell.won && puz) hint();
  });

  startLevel();
  return { destroy: () => shell.el.remove() };
}
