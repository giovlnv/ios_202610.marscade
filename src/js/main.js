import { initStore, store } from './core/store.js';
import { h } from './core/ui.js';
import { games, upcoming } from './games/index.js';

const app = document.getElementById('app');
let current = null;

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
      <span class="game-art">${g.art}</span>
      <span class="game-text">
        <span class="game-name">${g.name}</span>
        <span class="game-blurb">${g.blurb}</span>
      </span>
      <span class="game-progress">${g.progress()}</span>
    </button>`);
    card.addEventListener('click', () => open(g.id));
    list.append(card);
  }
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
  const last = store.get('last', null);
  last ? open(last) : home();
});
