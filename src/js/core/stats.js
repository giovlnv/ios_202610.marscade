import { store } from './store.js';

const blank = () => ({ solved: 0, byTier: [0, 0, 0, 0], clean: 0, streak: 0, best: 0 });

export const stats = {
  of: (id) => ({ ...blank(), ...store.get('stats', {})[id] }),
  win(id, tier, hinted) {
    const all = store.get('stats', {});
    const s = { ...blank(), ...all[id] };
    s.solved++;
    s.byTier = s.byTier.slice();
    s.byTier[tier]++;
    if (hinted) s.streak = 0;
    else { s.clean++; s.streak++; s.best = Math.max(s.best, s.streak); }
    store.set('stats', { ...all, [id]: s });
    return s;
  },
};
