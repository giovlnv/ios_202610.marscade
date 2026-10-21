import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

const native = Capacitor.isNativePlatform();
let buzz = native;

export const setHaptics = (on) => { buzz = native && on; };

export const haptic = {
  tap: () => buzz && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  place: () => buzz && Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
  win: () => buzz && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
};

export async function loadRaw(key) {
  if (native) {
    try {
      const { value } = await Preferences.get({ key });
      if (value) return value;
    } catch {}
  }
  try { return localStorage.getItem(key); } catch { return null; }
}

export async function saveRaw(key, value) {
  try { localStorage.setItem(key, value); } catch {}
  if (native) await Preferences.set({ key, value }).catch(() => {});
}
