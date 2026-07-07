'use client';

import { useEffect, useState } from 'react';
import { bridge, isDesktop } from '@/lib/desktop-client';

/**
 * DesktopTitleBar — merges the window chrome with the app theme.
 *
 * The Electron window is created with `titleBarStyle: 'hidden'` plus a
 * window-controls overlay, so the OS only draws the min/max/close buttons and
 * the web content owns the rest of the title bar. This component:
 *
 *  - renders a fixed, draggable strip across the top painted with the
 *    theme's canvas color (see `.desktop-titlebar` in globals.css);
 *  - marks <html data-desktop> so the page pads itself below the strip;
 *  - resolves the active theme's canvas/ink tokens to hex and sends them to
 *    the main process, which re-tints the native window controls — so the
 *    buttons follow the theme too, WhatsApp-desktop style.
 *
 * Renders nothing outside Electron (plain browser / SSR).
 */

/** Resolve a CSS color expression (var() refs included) to "#rrggbb". */
function resolveHex(expr: string): string | null {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.color = expr;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  return (
    '#' + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
  );
}

export function DesktopTitleBar() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    setDesktop(true);
    document.documentElement.dataset.desktop = '';

    const pushColors = () => {
      const color = resolveHex('var(--color-bg-canvas)');
      const symbolColor = resolveHex('var(--color-ink-900)');
      if (color && symbolColor) bridge().setTitleBarColors({ color, symbolColor });
    };
    pushColors();

    // Theme switches land as a data-theme attribute change on <html>.
    const observer = new MutationObserver(pushColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.desktop;
    };
  }, []);

  if (!desktop) return null;
  return (
    <div className="desktop-titlebar" aria-hidden="true">
      <span className="desktop-titlebar-label">InstaStash</span>
    </div>
  );
}
