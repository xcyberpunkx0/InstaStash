import { existsSync } from 'fs';

/**
 * Optional Instagram authentication for yt-dlp.
 *
 * Instagram rate-limits or blocks anonymous access, especially from
 * datacenter IPs. Operators can supply cookies via environment variables
 * (e.g. in .env.local):
 *
 *   INSTAGRAM_COOKIES_FILE=C:\path\to\cookies.txt
 *     Netscape-format cookie file (export with a browser extension like
 *     "Get cookies.txt LOCALLY" while logged in to instagram.com).
 *
 *   INSTAGRAM_COOKIES_FROM_BROWSER=chrome
 *     Extract cookies from a local browser profile (dev machines only —
 *     the browser must be installed on the server). Accepts the same
 *     values as yt-dlp's --cookies-from-browser (chrome, edge, firefox,
 *     optionally with a profile, e.g. "chrome:Profile 1").
 *
 * When both are set, the cookie file wins. A configured-but-missing file
 * is skipped with a server-side warning rather than failing every
 * download on a config typo.
 */

let warnedMissingFile = false;

function resolveCookieSource(): { kind: 'file' | 'browser'; value: string } | null {
  const file = process.env.INSTAGRAM_COOKIES_FILE?.trim();
  if (file) {
    if (existsSync(file)) {
      return { kind: 'file', value: file };
    }
    if (!warnedMissingFile) {
      warnedMissingFile = true;
      console.warn(
        `[ytdlp-cookies] INSTAGRAM_COOKIES_FILE is set but the file does not exist: ${file} — continuing without cookies`,
      );
    }
  }

  const browser = process.env.INSTAGRAM_COOKIES_FROM_BROWSER?.trim();
  if (browser) {
    return { kind: 'browser', value: browser };
  }

  return null;
}

/** Extra CLI args for a raw `spawn('yt-dlp', ...)` call. */
export function getCookieArgs(): string[] {
  const source = resolveCookieSource();
  if (!source) return [];
  return source.kind === 'file'
    ? ['--cookies', source.value]
    : ['--cookies-from-browser', source.value];
}

/** Extra options for a youtube-dl-exec invocation. */
export function getCookieOptions(): { cookies?: string; cookiesFromBrowser?: string } {
  const source = resolveCookieSource();
  if (!source) return {};
  return source.kind === 'file'
    ? { cookies: source.value }
    : { cookiesFromBrowser: source.value };
}

/** Test hook: reset the warn-once latch. */
export function resetCookieWarning(): void {
  warnedMissingFile = false;
}
