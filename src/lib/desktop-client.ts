// ─── Desktop bridge (renderer side) ──────────────────────────────────────────
//
// Thin, safe accessor for the `window.instastash` API exposed by the Electron
// preload. Components call these instead of `fetch('/api/...')`. When the UI is
// somehow loaded outside Electron (e.g. a plain browser), `isDesktop()` is false
// and callers can show a "run the desktop app" message rather than crashing.

import type { InstaStashAPI } from '@/shared/ipc';

/** True when running inside the Electron shell with the bridge available. */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && typeof window.instastash !== 'undefined';
}

/** The bridge, asserted. Call only after `isDesktop()` returns true. */
export function bridge(): InstaStashAPI {
  if (!isDesktop()) {
    throw new Error('InstaStash desktop bridge is unavailable (not running in the app).');
  }
  return window.instastash;
}

/**
 * Build a URL for the custom media protocol so <img>/<video> can load remote
 * Instagram CDN assets through the main process (replaces /api/proxy-*).
 * Kept in sync with electron/media-protocol.ts.
 */
export function mediaUrl(cdnUrl: string): string {
  return `instastash-media://fetch?url=${encodeURIComponent(cdnUrl)}`;
}
