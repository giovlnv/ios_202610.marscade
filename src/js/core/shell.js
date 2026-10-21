import { h, toast } from './ui.js';

export const icons = {
  back: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  restart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 A7 7 0 1 0 8 6.3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M8.5 2.5 L8 6.6 L12 7.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  help: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9.5 9.5 Q9.8 7 12 7 Q14.5 7 14.5 9.3 Q14.5 11 12.3 11.8 L12.1 13.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1.3" fill="currentColor"/></svg>`,
};

const heart = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 Q4 15 3 9.5 Q2.5 5 6.8 4.3 Q10 4 12 7.2 Q14 4 17.2 4.3 Q21.5 5 21 9.5 Q20 15 12 20.5 Z" fill="currentColor"/></svg>`;
export const LIVES = 3;

export const TIER_LABEL = ['Easy', 'Medium', 'Hard', 'Super hard'];

export function createShell(root, { name, rules, winArt, onBack, onRestart, onRulesClosed, onNext, onRetry, lives = true }) {
  const el = h(`<section class="screen game">
    <header class="bar">
      <button class="icon-btn" data-act="back" aria-label="Back to games">${icons.back}</button>
      <div class="bar-title">
        <span class="lvl">Level <b></b></span>
        <span class="title-row"><span class="tier"></span><span class="lives" role="img"${lives ? '' : ' hidden'}>${heart.repeat(LIVES)}</span></span>
      </div>
      <div class="bar-end">
        <button class="icon-btn" data-act="help" aria-label="How to play ${name}">${icons.help}</button>
        <button class="icon-btn restart-btn" data-act="restart"><span class="restart-ic">${icons.restart}</span><span>Restart</span></button>
      </div>
    </header>
    <div class="stage"><p class="loading" hidden>Making the next puzzle…</p></div>
    <div class="controls"></div>
    <div class="sheet-backdrop" data-sheet hidden>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="How to play ${name}">
        <h2>How to play</h2>
        ${rules}
        <button class="primary" data-act="close-sheet">Got it</button>
      </div>
    </div>
    <div class="win-backdrop" hidden>
      <div class="win" role="dialog" aria-modal="true" aria-labelledby="win-title">
        <div class="win-art">${winArt}</div>
        <h2 id="win-title">Level <span></span> solved</h2>
        <p class="win-sub"></p>
        <button class="primary" data-act="next">Next level</button>
        <button class="secondary" data-act="back">Back to games</button>
      </div>
    </div>
    <div class="win-backdrop" data-lost hidden>
      <div class="win" role="dialog" aria-modal="true" aria-labelledby="lost-title">
        <div class="lost-art">${heart}</div>
        <h2 id="lost-title">Out of lives</h2>
        <p class="win-sub">That was your third mistake on this level. Try it again from the start.</p>
        <button class="primary" data-act="retry">Try again</button>
        <button class="secondary" data-act="back">Back to games</button>
      </div>
    </div>
  </section>`);
  root.append(el);
  const $ = (s) => el.querySelector(s);

  const shell = {
    el,
    stage: $('.stage'),
    controls: $('.controls'),
    won: false,
    setLevel: (n) => { $('.lvl b').textContent = n; },
    setTier(t) {
      $('.tier').textContent = TIER_LABEL[t];
      $('.tier').dataset.tier = t;
    },
    loading(on) { $('.loading').hidden = !on; },
    setLives(n) {
      [...$('.lives').children].forEach((h, i) => h.classList.toggle('lost', i >= n));
      $('.lives').setAttribute('aria-label', `${n} of ${LIVES} lives left`);
    },
    showLost(title, text) {
      shell.won = true;
      $('#lost-title').textContent = title;
      $('[data-lost] .win-sub').textContent = text;
      $('[data-lost]').hidden = false;
    },
    loseLife(n) {
      shell.setLives(n);
      const lives = $('.lives');
      lives.classList.remove('shake');
      void lives.offsetWidth;
      lives.classList.add('shake');
      if (n <= 0) {
        shell.won = true;
        setTimeout(() => shell.showLost('Out of lives', 'That was your third mistake on this level. Try it again from the start.'), 500);
      } else toast(`Mistake. ${n} ${n === 1 ? 'life' : 'lives'} left`);
    },
    openRules() {
      $('[data-sheet]').hidden = false;
      $('[data-act="close-sheet"]').focus();
    },
    showWin(level, sub) {
      shell.won = true;
      $('.win h2 span').textContent = level;
      $('.win-sub').textContent = sub;
      $('.win-backdrop').hidden = false;
    },
    hideWin() {
      shell.won = false;
      $('.win-backdrop').hidden = true;
    },
  };

  el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'back') onBack();
    else if (act === 'help') shell.openRules();
    else if (act === 'close-sheet') { $('[data-sheet]').hidden = true; onRulesClosed?.(); }
    else if (act === 'next') onNext();
    else if (act === 'retry') { $('[data-lost]').hidden = true; shell.won = false; onRetry(); }
    else if (act === 'restart' && !shell.won) {
      onRestart();
      toast('Level restarted');
    }
  });
  $('[data-sheet]').addEventListener('click', (e) => {
    if (e.target.matches('[data-sheet]')) $('[data-act="close-sheet"]').click();
  });
  return shell;
}
