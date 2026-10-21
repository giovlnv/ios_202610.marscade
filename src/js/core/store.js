import { loadRaw, saveRaw } from './native.js';

const KEY = 'marscade.v1';
let data = {};
let timer = null;

export async function initStore() {
  try { data = JSON.parse((await loadRaw(KEY)) || '{}'); } catch { data = {}; }
}

export const store = {
  get: (k, fallback) => (k in data ? data[k] : fallback),
  set(k, v) {
    data[k] = v;
    clearTimeout(timer);
    timer = setTimeout(() => saveRaw(KEY, JSON.stringify(data)), 250);
  },
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveRaw(KEY, JSON.stringify(data));
});
