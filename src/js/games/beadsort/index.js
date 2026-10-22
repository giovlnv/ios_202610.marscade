import { store } from '../../core/store.js';
import { haptic } from '../../core/native.js';
import { h, toast } from '../../core/ui.js';
import { createShell, TIER_LABEL } from '../../core/shell.js';
import { stats } from '../../core/stats.js';
import { ART, SLOTS, HOLE, target, newState, group, wrong, trayFits, toTray, toHoles, bestMove, apply, solved, correct, total } from './engine.js';
import { buildLevel } from './levels.js';

const shade = (hex) => (parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16) < 90 ? 'var(--bead-k)' : hex);
const title = (name) => name.split('/')[1].replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const art = `<svg viewBox="0 0 40 40" aria-hidden="true">
  ${[[14, 9, 'k'], [20, 9, 'k'], [26, 9, 'k'], [11, 15, 'k'], [17, 15, '5'], [23, 15, '0'], [29, 15, 'k'], [11, 21, 'k'], [17, 21, '5'], [23, 21, '5'], [29, 21, 'k'], [14, 27, 'k'], [20, 27, '0'], [26, 27, 'k'], [20, 33, 'k']]
    .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.7" fill="${c === 'k' ? 'var(--bead-k)' : `var(--p${c})`}"/>`).join('')}
</svg>`;
const clock = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M12 9 V13 L15 15 M9.5 2.5 H14.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`;
const flake = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 V21.5 M3.8 7.2 L20.2 16.8 M3.8 16.8 L20.2 7.2 M9.5 3.8 L12 6.3 L14.5 3.8 M9.5 20.2 L12 17.7 L14.5 20.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const bulb = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 H15 M10 20.5 H14 M8.5 14 Q6 12 6 9 A6 6 0 0 1 18 9 Q18 12 15.5 14 L15 17 H9 Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const rules = `<ul class="rules">
  <li><span class="rule-ic">${art}</span><span><b>Every bead starts in the wrong place.</b> Rebuild the picture: beads in the right place lie flat, and empty spots show a faded version of the color they need.</span></li>
  <li><span class="rule-ic">${art}</span><span><b>Tap a bead</b> to pick it up with its touching beads of the same color. Then tap a tray to store them, or an empty spot of their color to place them.</span></li>
  <li><span class="rule-ic">${clock}</span><span><b>Beat the clock.</b> Finish the picture before the timer runs out. There are no lives here.</span></li>
</ul>
<p class="sheet-note">Each tray holds up to 9 beads of one color. Tap a tray to pick its beads up, then tap a spot that needs them. Hints: show a move and freeze the timer for 20 seconds.</p>`;

const load = () => ({ level: 1, board: null, trays: [], solved: 0, left: null, ...store.get('beadsort', {}) });
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
  let puz, goal, st, colors, beadEls = [], left = 0, frozenUntil = 0, timer = null, flying = 0, sel = null;

  const reset = () => { sel = null; st = newState(puz.board, puz.trays); left = puz.seconds; frozenUntil = 0; clearFlying(); render(); };
  const shell = createShell(root, {
    name: 'Bead Sort',
    rules,
    winArt: `<div class="win-icon">${art}</div>`,
    onBack: exit,
    onRestart: reset,
    onRetry: reset,
    lives: false,
    onRulesClosed: () => { saved.seenRules = true; save(saved); },
    onNext: startLevel,
  });
  const wrap = h(`<div class="bead-wrap" hidden>
    <div class="bead-head"><svg class="bead-goal" aria-label="Finished picture"></svg><p class="ws-theme"></p></div>
    <div class="bead-timer"><span class="tool-ic">${clock}</span><b>0:00</b></div>
    <div class="bead-progress"><span></span><b>0%</b></div>
    <div class="bead-board" role="grid" aria-label="Bead picture"></div>
  </div>`);
  shell.stage.append(wrap);
  const board = wrap.querySelector('.bead-board'), goalSvg = wrap.querySelector('.bead-goal'), caption = wrap.querySelector('.ws-theme');
  const bar = wrap.querySelector('.bead-progress span'), pct = wrap.querySelector('.bead-progress b');
  const trays = h('<div class="trays" aria-label="Trays"></div>');
  shell.controls.append(trays, h(`<div class="ms-tools bead-tools">
    <button class="tool" data-tool="hint"><span class="tool-ic">${bulb}</span><span>Show a move</span></button>
    <button class="tool" data-tool="freeze"><span class="tool-ic">${flake}</span><span>Freeze time</span></button>
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
      const info = ART[puz.name];
      colors = info.title ? info.palette.slice() : info.palette.map(shade);
      caption.innerHTML = info.title ? `${info.title}<small>${info.artist}, ${info.year}</small>` : title(puz.name);
      const ok = saved.board?.length === puz.board.length && saved.trays?.length === puz.trays && saved.trays.every((t) => typeof t === 'object');
      st = ok ? { board: saved.board.slice(), trays: saved.trays.map((t) => ({ ...t })) } : newState(puz.board, puz.trays);
      shell.setTier(puz.tier);
      left = saved.left ?? puz.seconds;
      frozenUntil = 0;
      goalSvg.setAttribute('viewBox', `0 0 ${goal.w} ${goal.h}`);
      goalSvg.innerHTML = Array.from(goal.cells).map((c, i) => (c >= 0 ? `<rect x="${i % goal.w}" y="${Math.floor(i / goal.w)}" width="1.02" height="1.02" style="fill:${colors[c]}"/>` : '')).join('');
      board.style.setProperty('--w', goal.w);
      board.style.setProperty('--h', goal.h);
      board.replaceChildren(...Array.from(goal.cells).map((c, i) => h(`<span class="bead${c < 0 ? ' off' : ''}" data-i="${i}"${c >= 0 ? ` style="--goal:${colors[c]}"` : ''}></span>`)));
      beadEls = [...board.children];
      render();
      shell.loading(false);
      wrap.hidden = false;
      if (!saved.seenRules) shell.openRules();
      setTimeout(() => buildLevel(level + 1), 400);
    }, 30);
  }

  const hide = new Set(), hideSlots = new Set();
  function render() {
    st.board.forEach((c, i) => {
      if (goal.cells[i] < 0) return;
      const el = beadEls[i];
      const flat = c === goal.cells[i] && !hide.has(i);
      el.classList.toggle('flat', flat);
      el.classList.toggle('hole', c === HOLE || hide.has(i));
      el.style.setProperty('--bead', c >= 0 && !flat ? colors[c] : 'transparent');
      el.classList.toggle('sel', sel?.cells?.includes(i) ?? false);
    });
    trays.replaceChildren(...st.trays.map((t, k) => h(`<button class="tray${sel?.tray === k ? ' sel' : ''}" data-k="${k}" aria-label="Tray ${k + 1}: ${t.n} beads">${Array.from({ length: SLOTS }, (_, j) =>
      `<span class="slot${j < t.n && !hideSlots.has(`${k}:${j}`) ? ' full' : ''}"${j < t.n ? ` style="--bead:${colors[t.c]}"` : ''}></span>`).join('')}</button>`)));
    const p = Math.floor((correct(goal, st.board) / total(goal)) * 100);
    bar.style.setProperty('--w', `${p}%`);
    pct.textContent = `${p}%`;
    saved.board = st.board;
    saved.trays = st.trays;
    saved.left = left;
    save(saved);
    showTime();
    if (!flying && !shell.won && solved(goal, st)) win();
  }

  function showTime() {
    const t = Math.max(0, Math.ceil(left));
    const el = wrap.querySelector('.bead-timer');
    el.querySelector('b').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    el.classList.toggle('frozen', Date.now() < frozenUntil);
    el.classList.toggle('low', t <= 20);
  }

  function tick() {
    const now = Date.now(), dt = (now - (tick.last || now)) / 1000;
    tick.last = now;
    if (!puz || shell.won || document.hidden || !shell.el.querySelector('[data-sheet]').hidden || now < frozenUntil) return showTime();
    left -= dt;
    showTime();
    if (left <= 0) {
      left = 0;
      saved.left = puz.seconds;
      save(saved);
      shell.showLost('Time’s up', 'The picture wasn’t finished in time. Try it again from the start.');
    }
  }
  timer = setInterval(tick, 250);

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const flyers = new Set();
  function clearFlying() { flyers.forEach((f) => f.remove()); flyers.clear(); flying = 0; hide.clear(); hideSlots.clear(); }

  function animate(moves, before) {
    if (reduceMotion.matches || !moves.length) return render();
    const rect = (el) => el?.getBoundingClientRect();
    const fill = before.trays.map((t) => t.n);
    const pending = moves.map((m) => {
      const from = m.from !== undefined ? rect(beadEls[m.from]) : rect(trays.children[m.tray]);
      let slot = null;
      if (m.to === undefined) slot = `${m.tray}:${fill[m.tray]++}`;
      return { m, from, slot };
    });
    pending.forEach((p) => { if (p.slot) hideSlots.add(p.slot); else hide.add(p.m.to); });
    render();
    const delay = Math.min(28, 420 / moves.length);
    flying++;
    let left = pending.length;
    pending.forEach((p, n) => {
      const to = p.slot ? rect(trays.children[p.m.tray]?.children[+p.slot.split(':')[1]]) : rect(beadEls[p.m.to]);
      const from = p.from;
      const size = Math.min(from.width, to.width) * 0.86 || 12;
      const f = h('<span class="bead-fly"></span>');
      f.style.cssText = `width:${size}px;height:${size}px;left:${from.left + from.width / 2 - size / 2}px;top:${from.top + from.height / 2 - size / 2}px;--bead:${colors[p.m.c]}`;
      document.body.append(f);
      flyers.add(f);
      const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const a = f.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) scale(1.15)`, offset: 0.5 }, { transform: `translate(${dx}px, ${dy}px) scale(1)` }],
        { duration: 340, delay: n * delay, easing: 'ease-in-out', fill: 'forwards' });
      a.finished.catch(() => {}).then(() => {
        if (!flyers.has(f)) return;
        f.remove();
        flyers.delete(f);
        if (p.slot) hideSlots.delete(p.slot); else hide.delete(p.m.to);
        if (--left === 0) { flying--; haptic.place(); }
        render();
      });
    });
  }

  function bump(el, msg) {
    el.classList.remove('stuck');
    void el.offsetWidth;
    el.classList.add('stuck');
    if (msg) toast(msg);
  }

  function run(moves, before) {
    sel = null;
    if (!moves.length) return render();
    haptic.tap();
    animate(moves, before);
  }

  const snapshot = () => ({ board: st.board.slice(), trays: st.trays.map((t) => ({ ...t })) });

  function pick(i) {
    if (goal.cells[i] < 0 || flying) return;
    if (st.board[i] === HOLE) {
      if (!sel) return bump(beadEls[i], 'Pick some beads or a tray first');
      const c = sel.cells ? st.board[sel.cells[0]] : st.trays[sel.tray].c;
      if (goal.cells[i] !== c) return bump(beadEls[i], 'That spot needs another color');
      const before = snapshot();
      return run(toHoles(goal, st, sel.cells ?? sel.tray, i), before);
    }
    if (!wrong(goal, st.board, i)) { sel = null; return render(); }
    sel = sel?.cells?.includes(i) ? null : { cells: group(goal, st.board, i) };
    haptic.tap();
    render();
  }

  function tapTray(k) {
    if (flying) return;
    const t = st.trays[k], el = trays.children[k];
    if (sel?.cells) {
      const c = st.board[sel.cells[0]];
      if (!trayFits(st, k, c)) return bump(el, t.n >= SLOTS ? 'This tray is full' : 'Each tray holds one color');
      const before = snapshot();
      return run(toTray(st, sel.cells, k), before);
    }
    sel = sel?.tray === k || !t.n ? null : { tray: k };
    haptic.tap();
    render();
  }

  function hint() {
    if (flying) return;
    const m = bestMove(goal, st);
    if (!m) return;
    saved.hinted = true;
    const before = snapshot();
    run(apply(goal, st, m), before);
  }

  function win() {
    shell.won = true;
    haptic.win();
    saved.solved = stats.win('beadsort', puz.tier, saved.hinted).solved;
    saved.hinted = false;
    const level = saved.level;
    saved.level += 1;
    saved.board = null;
    saved.trays = null;
    saved.left = null;
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
    const tray = e.target.closest('.tray');
    if (tray) return tapTray(+tray.dataset.k);
    const tool = e.target.closest('[data-tool]')?.dataset.tool;
    if (tool === 'hint') hint();
    if (tool === 'freeze') {
      saved.hinted = true;
      frozenUntil = Date.now() + 20000;
      haptic.tap();
      toast('Timer frozen for 20 seconds');
      showTime();
    }
  });

  startLevel();
  return { destroy: () => { clearInterval(timer); clearFlying(); shell.el.remove(); } };
}
