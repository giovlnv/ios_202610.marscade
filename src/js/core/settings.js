import { store } from './store.js';
import { setHaptics } from './native.js';

const DEFAULTS = { haptics: true, theme: 'system', lang: 'en' };

export const settings = {
  get: (k) => ({ ...DEFAULTS, ...store.get('settings', {}) })[k],
  set(k, v) {
    store.set('settings', { ...DEFAULTS, ...store.get('settings', {}), [k]: v });
    apply();
  },
};

export function apply() {
  setHaptics(settings.get('haptics'));
  const theme = settings.get('theme');
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  document.documentElement.lang = settings.get('lang') === 'pt' ? 'pt-BR' : 'en';
}
