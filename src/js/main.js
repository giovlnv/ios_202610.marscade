import { initStore, store } from './core/store.js';
import { h } from './core/ui.js';
import { settings, apply as applySettings } from './core/settings.js';
import { stats } from './core/stats.js';
import { TIER_LABEL } from './core/shell.js';
import { games, upcoming } from './games/index.js';
import { startOta } from './core/ota.js';

const app = document.getElementById('app');
let current = null;

const gear = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M12 2.8 V5.2 M12 18.8 V21.2 M2.8 12 H5.2 M18.8 12 H21.2 M5.5 5.5 L7.2 7.2 M16.8 16.8 L18.5 18.5 M5.5 18.5 L7.2 16.8 M16.8 7.2 L18.5 5.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="currentColor" stroke-width="2.1"/></svg>`;
const chart = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 H20 M7 17 V11 M12 17 V6 M17 17 V13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;

const seg = (key, options) => `<div class="seg-ctl" role="radiogroup" data-key="${key}">${options.map(([v, label]) =>
  `<button role="radio" data-v="${v}" aria-checked="${String(settings.get(key)) === String(v)}">${label}</button>`).join('')}</div>`;

function settingsSheet() {
  return `<div class="sheet-backdrop" data-sheet="settings" hidden>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <h2 id="settings-title">Settings</h2>
      <div class="setting"><span>Vibration</span>${seg('haptics', [[true, 'On'], [false, 'Off']])}</div>
      <div class="setting"><span>Appearance</span>${seg('theme', [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div>
      <div class="setting"><span>Word games</span>${seg('lang', [['en', 'English'], ['pt', 'Português']])}</div>
      <button class="primary" data-close>Done</button>
    </div>
  </div>`;
}

function statsSheet() {
  const rows = games.map((g) => {
    const s = stats.of(g.id);
    return `<li class="stat">
      <span class="stat-art" style="--art:${g.color}">${g.art}</span>
      <div class="stat-body">
        <b>${g.name}</b>
        <span class="stat-main">${s.solved} solved · best streak without hints: ${s.best}</span>
        <span class="stat-tiers">${s.byTier.map((n, t) => `<span>${TIER_LABEL[t]} <b>${n}</b></span>`).join('')}</span>
      </div>
    </li>`;
  }).join('');
  return `<div class="sheet-backdrop" data-sheet="stats" hidden>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="stats-title">
      <h2 id="stats-title">Your stats</h2>
      <ul class="stats">${rows}</ul>
      <button class="primary" data-close>Done</button>
    </div>
  </div>`;
}

const planet = `<svg class="planet" viewBox="0 0 64 64" aria-hidden="true">
  <ellipse cx="32" cy="34" rx="30" ry="7" fill="none" stroke="var(--haze)" stroke-width="3" transform="rotate(-14 32 34)"/>
  <circle cx="32" cy="32" r="19" fill="var(--rust)"/>
  <circle cx="25" cy="26" r="4" fill="var(--rust-deep)"/><circle cx="38" cy="38" r="5.5" fill="var(--rust-deep)"/><circle cx="39" cy="24" r="2.5" fill="var(--rust-deep)"/>
  <path d="M5 40 Q32 30 59 28" fill="none" stroke="var(--haze)" stroke-width="3" stroke-linecap="round" transform="rotate(-14 32 34)"/>
</svg>`;

function hub() {
  const el = h(`<section class="screen hub">
    <header class="brand">
      ${planet}
      <div>
        <h1>Marscade</h1>
        <p>Your puzzles, all in one place.</p>
      </div>
      <div class="brand-tools">
        <button class="icon-btn" data-open="stats" aria-label="Stats">${chart}</button>
        <button class="icon-btn" data-open="settings" aria-label="Settings">${gear}</button>
      </div>
    </header>
    <div class="game-list"></div>
    <section class="soon" aria-labelledby="soon-title">
      <h2 id="soon-title">Coming to Marscade</h2>
      <ul>${upcoming.map((g) => `<li>${g}</li>`).join('')}</ul>
    </section>
  </section>`);
  const list = el.querySelector('.game-list');
  for (const g of games) {
    const card = h(`<button class="game-card" data-game="${g.id}">
      <span class="game-art" style="--art:${g.color}">${g.art}</span>
      <span class="game-text">
        <span class="game-name">${g.name}</span>
        <span class="game-blurb">${g.blurb}</span>
      </span>
      <span class="game-progress">${g.progress()}</span>
    </button>`);
    card.addEventListener('click', () => open(g.id));
    list.append(card);
  }
  const sheets = h(`<div>${settingsSheet()}${statsSheet()}</div>`);
  el.append(sheets);
  el.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]')?.dataset.open;
    if (open) el.querySelector(`[data-sheet="${open}"]`).hidden = false;
    const back = e.target.closest('[data-sheet]');
    if (back && (e.target === back || e.target.closest('[data-close]'))) back.hidden = true;
    const opt = e.target.closest('.seg-ctl [data-v]');
    if (opt) {
      const ctl = opt.parentElement, raw = opt.dataset.v;
      settings.set(ctl.dataset.key, raw === 'true' ? true : raw === 'false' ? false : raw);
      ctl.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-checked', b === opt));
    }
  });
  return { el, destroy: () => el.remove() };
}

function show(view) {
  current?.destroy();
  current = view;
}

function home() {
  store.set('last', null);
  const v = hub();
  app.append(v.el);
  show(v);
}

function open(id) {
  const g = games.find((x) => x.id === id);
  if (!g) return home();
  current?.destroy();
  current = g.mount(app, { exit: home });
  store.set('last', id);
}

initStore().then(() => {
  applySettings();
  const last = store.get('last', null);
  last ? open(last) : home();
  startOta();
});
