// Custom protocol that replaces the old /api/proxy-image and /api/proxy-video
// routes. The renderer points <img>/<video> at:
//
//   instastash-media://fetch?url=<encoded CDN url>
//
// and the main process fetches the bytes (with an instagram.com referer, which
// the CDN requires) and streams them back. No browser CORS in play here.
import { protocol } from 'electron';
import { fetchFromCdn, CdnUrlError } from '@/lib/safe-cdn-fetch';

export const MEDIA_SCHEME = 'instastash-media';

/** Must run before app.whenReady(). */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } },
  ]);
}

/** Must run after app.whenReady(). */
export function handleMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const target = new URL(request.url).searchParams.get('url');
      if (!target) return new Response('missing url', { status: 400 });

      // SSRF guard: fetchFromCdn enforces HTTPS + a Meta CDN host allowlist and
      // re-validates every redirect hop, so a renderer can't point this at
      // internal/metadata endpoints.
      return await fetchFromCdn(target, {
        Referer: 'https://www.instagram.com/',
        'User-Agent': 'Mozilla/5.0',
      });
    } catch (err) {
      if (err instanceof CdnUrlError) return new Response('blocked', { status: 403 });
      return new Response('bad request', { status: 400 });
    }
  });
}

/** Helper the renderer-side bridge uses to build a media URL. */
export function mediaUrl(cdnUrl: string): string {
  return `${MEDIA_SCHEME}://fetch?url=${encodeURIComponent(cdnUrl)}`;
}
