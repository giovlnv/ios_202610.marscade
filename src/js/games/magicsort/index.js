import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h, toast } from '../../core/ui.js';
import { createShell, TIER_LABEL, LIVES } from '../../core/shell.js';
import { stats } from '../../core/stats.js';
import { canPour, pour, runLength, solve, solved } from './engine.js';
import { buildLevel } from './levels.js';

const COLORS = [0, 1, 3, 4, 8, 9, 5, 7, 10, 11, 2, 13, 6, 12, 14];
const color = (c) => `var(--p${COLORS[c]})`;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const done = (a) => a.finished.catch(() => {});

const tubeSvg = (fills) => `<svg viewBox="0 0 40 40" aria-hidden="true">
  ${[8, 17, 26].map((x, k) => `<g>
    <rect x="${x}" y="${7 + k * 2}" width="7" height="${26 - k * 2}" rx="3.5" fill="var(--surface)" stroke="var(--edge)" stroke-width="1.6"/>
    ${fills[k].map((c, j) => `<rect x="${x + 1.3}" y="${30.2 - (j + 1) * 5.4}" width="4.4" height="5.4" rx="${j === 0 ? 2 : 0.5}" fill="${c}"/>`).join('')}
  </g>`).join('')}
</svg>`;
const art = tubeSvg([['var(--p0)', 'var(--p8)', 'var(--p0)'], ['var(--p8)', 'var(--p1)'], ['var(--p1)', 'var(--p0)', 'var(--p8)', 'var(--p1)']]);
const bulb = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 H15 M10 20.5 H14 M8.5 14 Q6 12 6 9 A6 6 0 0 1 18 9 Q18 12 15.5 14 L15 17 H9 Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const undoIc = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 L4.5 11.5 L9 16 M5 11.5 H14 Q19.5 11.5 19.5 16 Q19.5 19.5 15 19.5 H12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const plusTube = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4 V17 Q5 20.5 8.5 20.5 Q12 20.5 12 17 V4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M18 6 V14 M14 10 H22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;

const rules = `<ul class="rules">
  <li><span class="rule-ic">${art}</span><span><b>Sort the colors</b> so each tube holds a single color.</span></li>
  <li><span class="rule-ic">${art}</span><span><b>Pour onto the same color</b> or into an empty tube, as long as there's room.</span></li>
  <li><span class="rule-ic rule-num">3</span><span><b>You have 3 lives.</b> A pour that leaves no way to finish costs one and is taken back.</span></li>
</ul>
<p class="sheet-note">Tap a tube to pick it up, then tap where to pour. Layers marked ? stay hidden until they reach the top. A tube filled with one color gets a cap and stays put. Undo is free; you can add one extra empty tube per level.</p>`;

const load = () => ({ lives: LIVES, ...store.get('magicsort', { level: 1, tubes: null, solved: 0, seenRules: false }) });
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
  let puz, tubes, hidden, extra, sel = -1, history = [];
  let busy = false, token = 0, pouring = null, lastCapped = null, fly = null;

  const reset = () => {
    token++;
    busy = false;
    pouring = null;
    lastCapped = null;
    fly?.remove();
    tubes = puz.tubes.map((t) => t.slice());
    hidden = puz.hidden.slice();
    extra = false;
    history = [];
    sel = -1;
  };

  const shell = createShell(root, {
    name: 'Magic Sort',
    rules,
    winArt: `<div class="win-icon">${art}</div>`,
    onBack: exit,
    onRestart: () => { reset(); render(); },
    onRetry: () => { reset(); saved.lives = LIVES; shell.setLives(LIVES); render(); },
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });
  const rack = h('<div class="rack" hidden></div>');
  shell.stage.append(rack);
  const tools = h(`<div class="ms-tools">
    <button class="tool" data-tool="undo"><span class="tool-ic">${undoIc}</span><span>Undo</span></button>
    <button class="tool" data-tool="tube"><span class="tool-ic">${plusTube}</span><span>Add a tube</span></button>
    <button class="tool" data-tool="hint"><span class="tool-ic">${bulb}</span><span>Show a move</span></button>
  </div>`);
  shell.controls.append(tools);

  function startLevel() {
    shell.hideWin();
    rack.hidden = true;
    shell.loading(true);
    shell.setLevel(saved.level);
    const level = saved.level;
    setTimeout(() => {
      if (level !== saved.level || !shell.el.isConnected) return;
      puz = buildLevel(level);
      reset();
      if (saved.tubes?.length >= puz.tubes.length) {
        tubes = saved.tubes.map((t) => t.slice());
        hidden = saved.hidden?.length === tubes.length ? saved.hidden.slice() : tubes.map(() => 0);
        extra = !!saved.extra;
      }
      shell.setTier(puz.tier);
      shell.setLives(saved.lives);
      render();
      shell.loading(false);
      rack.hidden = false;
      if (!saved.seenRules) shell.openRules();
      setTimeout(() => buildLevel(level + 1), 400);
    }, 30);
  }

  function render(flash = []) {
    hidden = hidden.map((n, i) => Math.min(n, Math.max(0, tubes[i].length - 1)));
    const n = tubes.length, perRow = n <= 6 ? n : Math.ceil(n / 2);
    rack.style.setProperty('--per-row', perRow);
    rack.style.setProperty('--cap', puz.cap);
    const capped = new Set(tubes.map((t, i) => (isCapped(i) ? i : -1)).filter((i) => i >= 0));
    capped.forEach((i) => { hidden[i] = 0; });
    const fresh = lastCapped ? [...capped].filter((i) => !lastCapped.has(i)) : [];
    if (!pouring || pouring.n === undefined) {
      if (fresh.length) haptic.tap();
      lastCapped = capped;
    }
    rack.replaceChildren(...tubes.map((t, i) => {
      const el = h(`<button class="tube" data-i="${i}" aria-label="Tube ${i + 1}: ${capped.has(i) ? 'finished' : t.length ? t.length + ' layers' : 'empty'}"><span class="glass"></span></button>`);
      el.classList.toggle('sel', i === sel);
      el.classList.toggle('full', capped.has(i));
      if (capped.has(i) && !(pouring && pouring.b === i && pouring.n !== undefined)) {
        el.style.setProperty('--cc', color(t[0]));
        el.prepend(h(`<span class="cap${fresh.includes(i) ? ' cap-new' : ''}"></span>`));
      }
      if (pouring?.a === i) el.classList.add('away');
      if (flash.includes(i)) el.classList.add('hinted');
      const fillFrom = pouring?.b === i && pouring.n !== undefined ? t.length - pouring.n : Infinity;
      el.lastChild.append(...t.map((c, j) => {
        const s = h(`<span class="seg${j >= fillFrom ? ' in' : ''}"></span>`);
        if (j < hidden[i]) {
          s.classList.add('mystery');
          s.textContent = '?';
        } else s.style.background = color(c);
        return s;
      }));
      return el;
    }));
    tools.querySelector('[data-tool="undo"]').disabled = !history.length;
    tools.querySelector('[data-tool="tube"]').disabled = extra;
    Object.assign(saved, { tubes, hidden, extra });
    save(saved);
    if (!pouring && !shell.won && solved(tubes, puz.cap)) win();
  }

  function snapshot() {
    history.push({ tubes: tubes.map((t) => t.slice()), hidden: hidden.slice() });
    if (history.length > 200) history.shift();
  }

  function undo() {
    const prev = history.pop();
    if (!prev) return;
    tubes = prev.tubes;
    hidden = prev.hidden.map((n, i) => Math.min(n, hidden[i]));
    sel = -1;
    haptic.tap();
    render();
  }

  function isCapped(i) {
    const t = tubes[i];
    return t.length === puz.cap && t.every((c) => c === t[0]);
  }

  async function animatePour(a, b, n, c) {
    const my = token;
    const src = rack.children[a], dst = rack.children[b];
    const sg = src.querySelector('.glass').getBoundingClientRect();
    const dg = dst.querySelector('.glass').getBoundingClientRect();
    const segH = src.querySelector('.seg').getBoundingClientRect().height;
    fly = h(`<div class="ms-fly"></div>`);
    const glass = src.querySelector('.glass').cloneNode(true);
    Object.assign(fly.style, { left: `${sg.left}px`, top: `${sg.top}px`, width: `${sg.width}px`, height: `${sg.height}px`, transformOrigin: '50% 0' });
    fly.style.setProperty('--seg', `${segH}px`);
    fly.append(glass);
    document.body.append(fly);
    src.style.visibility = 'hidden';
    const right = dg.left + dg.width / 2 > sg.left + sg.width / 2;
    const tx = dg.left + dg.width / 2 - (sg.left + sg.width / 2) + (right ? -1 : 1) * dg.width * 0.18;
    const gap = segH * 0.9;
    const ty = dg.top - gap - sg.top;
    const tilt = `translate(${tx}px, ${ty}px) rotate(${right ? 96 : -96}deg)`;
    const T = { move: 240, pour: Math.min(520, 220 + n * 90), back: 220 };
    await done(fly.animate([{ transform: 'none' }, { transform: tilt }], { duration: T.move, easing: 'ease-in-out', fill: 'forwards' }));
    if (my !== token) return false;

    pour(tubes, puz.cap, a, b);
    pouring = { a, b, n };
    rack.style.setProperty('--pour', `${T.pour}ms`);
    render();
    const after = tubes[b].length;
    const stream = h('<span class="ms-stream"></span>');
    const sx = dg.left + dg.width / 2 + (right ? -1 : 1) * dg.width * 0.18;
    Object.assign(stream.style, {
      left: `${sx - Math.max(3, segH * 0.14)}px`, top: `${dg.top - gap}px`, width: `${Math.max(6, segH * 0.28)}px`,
      height: `${Math.max(8, dg.height - after * segH + gap)}px`, background: color(c),
    });
    document.body.append(stream);
    stream.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.2 }, { transform: 'scaleY(1)', opacity: 1, offset: 0.85 }, { transform: 'scaleY(1)', opacity: 0 }], { duration: T.pour, fill: 'forwards' });
    [...glass.querySelectorAll('.seg')].slice(-n).forEach((el) => el.animate([{ height: `${segH}px` }, { height: '0px' }], { duration: T.pour, easing: 'linear', fill: 'forwards' }));
    await new Promise((r) => setTimeout(r, T.pour));
    stream.remove();
    if (my !== token) return false;

    pouring = { a };
    render();
    glass.replaceChildren(...rack.children[a].querySelector('.glass').cloneNode(true).childNodes);
    await done(fly.animate([{ transform: tilt }, { transform: 'none' }], { duration: T.back, easing: 'ease-in-out', fill: 'forwards' }));
    fly.remove();
    fly = null;
    if (my !== token) return false;
    pouring = null;
    return true;
  }

  async function move(a, b, flash = []) {
    snapshot();
    sel = -1;
    if (reduceMotion.matches) pour(tubes, puz.cap, a, b);
    else {
      busy = true;
      const n = Math.min(runLength(tubes[a]), puz.cap - tubes[b].length);
      const ok = await animatePour(a, b, n, tubes[a][tubes[a].length - 1]);
      busy = false;
      if (!ok) return;
    }
    if (!solved(tubes, puz.cap) && solve(tubes, puz.cap, 40000) === null) {
      render([a, b]);
      setTimeout(() => {
        const prev = history.pop();
        tubes = prev.tubes;
        hidden = hidden.map((n, i) => Math.min(n, prev.hidden[i]));
        saved.lives -= 1;
        save(saved);
        render();
        shell.loseLife(saved.lives);
      }, 450);
      return;
    }
    haptic.place();
    render(flash);
  }

  function hint() {
    saved.hinted = true;
    const path = solve(tubes, puz.cap, 150000);
    if (path === undefined) return toast('Couldn’t find a move in time. Try Undo or another pour.');
    if (!path) return toast('No way to finish from here. Use Undo or restart.');
    if (path.length) move(path[0][0], path[0][1], path[0]);
  }

  function addTube() {
    if (extra) return;
    saved.hinted = true;
    extra = true;
    tubes.push([]);
    hidden.push(0);
    history = [];
    haptic.tap();
    render([tubes.length - 1]);
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = stats.win('magicsort', puz.tier, saved.hinted).solved;
    saved.hinted = false;
    saved.lives = LIVES;
    const level = saved.level;
    saved.level += 1;
    saved.tubes = null;
    save(saved);
    rack.classList.add('solved');
    setTimeout(() => {
      rack.classList.remove('solved');
      shell.showWin(level, `${TIER_LABEL[puz.tier]} · ${puz.tubes.filter((t) => t.length).length} colors · ${saved.solved} solved so far`);
    }, 800);
  }

  rack.addEventListener('click', (e) => {
    const t = e.target.closest('.tube');
    if (!t || shell.won || busy) return;
    const i = +t.dataset.i;
    const pickable = tubes[i].length && !isCapped(i);
    if (sel < 0) {
      if (pickable) { sel = i; haptic.tap(); render(); }
    } else if (sel === i) {
      sel = -1;
      render();
    } else if (canPour(tubes, puz.cap, sel, i)) {
      move(sel, i);
    } else {
      sel = pickable ? i : -1;
      haptic.tap();
      render();
    }
  });
  tools.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]')?.dataset.tool;
    if (!t || shell.won || !puz || busy) return;
    ({ undo, tube: addTube, hint })[t]();
  });

  startLevel();
  return { destroy: () => { token++; fly?.remove(); shell.el.remove(); } };
}
