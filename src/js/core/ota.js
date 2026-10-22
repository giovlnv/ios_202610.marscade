import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const FEED = 'https://raw.githubusercontent.com/giovlnv/ios_202610.marscade/ota/latest.json';
let busy = false;
export const ota = { status: Capacitor.isNativePlatform() ? 'Not checked yet' : 'Updates work in the app only' };

export const buildLabel = (n = BUILD) => {
  const d = new Date(n * 1000);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

async function check() {
  if (busy) return;
  busy = true;
  ota.status = 'Checking for updates…';
  try {
    const res = await fetch(`${FEED}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`update feed answered ${res.status}`);
    const { version, url } = await res.json();
    if (!(Number(version) > BUILD)) { ota.status = 'Up to date'; return; }
    const { bundles } = await CapacitorUpdater.list();
    const ready = bundles.find((b) => b.version === String(version) && b.status === 'success');
    ota.status = `Downloading update from ${buildLabel(Number(version))}…`;
    const bundle = ready ?? await CapacitorUpdater.download({ url, version: String(version) });
    await CapacitorUpdater.next({ id: bundle.id });
    ota.status = `Update from ${buildLabel(Number(version))} ready: it applies when you leave the app`;
  } catch (e) {
    ota.status = `Update check failed: ${e?.message || e}`;
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
