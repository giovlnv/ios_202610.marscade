import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const FEED = 'https://raw.githubusercontent.com/giovlnv/ios_202610.marscade/ota/latest.json';
let busy = false;

async function check() {
  if (busy) return;
  busy = true;
  try {
    const res = await fetch(`${FEED}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { version, url } = await res.json();
    if (!(Number(version) > BUILD)) return;
    const { bundles } = await CapacitorUpdater.list();
    const ready = bundles.find((b) => b.version === String(version) && b.status === 'success');
    const bundle = ready ?? await CapacitorUpdater.download({ url, version: String(version) });
    await CapacitorUpdater.next({ id: bundle.id });
  } catch {
  } finally {
    busy = false;
  }
}

export function startOta() {
  if (!Capacitor.isNativePlatform()) return;
  CapacitorUpdater.notifyAppReady().catch(() => {});
  check();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}
