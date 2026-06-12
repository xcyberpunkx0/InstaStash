/**
 * SSRF-safe fetch for Instagram/Facebook CDN resources.
 *
 * The proxy routes accept a caller-supplied URL, so without validation they
 * are an open proxy into anything the server can reach (cloud metadata
 * endpoints, internal services). Every URL — including each redirect hop —
 * must be HTTPS and on a Meta-controlled CDN hostname before it is fetched.
 *
 * Residual risk: a hostname allowlist doesn't guard against the allowlisted
 * domains themselves resolving to internal IPs. These domains are controlled
 * by Meta, so that would require a DNS compromise upstream of us; accepted.
 */

const ALLOWED_HOST_SUFFIXES = ['.fbcdn.net', '.cdninstagram.com', '.instagram.com'];

const MAX_REDIRECTS = 5;

/** Thrown when a URL (initial or redirect target) fails validation. */
export class CdnUrlError extends Error {
  constructor(message = 'Only Instagram CDN URLs are allowed') {
    super(message);
    this.name = 'CdnUrlError';
  }
}

/** True when `raw` is an https URL on an allowed Instagram/Facebook CDN host. */
export function isAllowedCdnUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

/**
 * Fetches `rawUrl` with redirects followed manually so each hop is
 * re-validated against the CDN allowlist. Throws CdnUrlError when any hop
 * is off-allowlist, and a plain Error after too many redirects.
 */
export async function fetchFromCdn(
  rawUrl: string,
  headers: Record<string, string>,
): Promise<Response> {
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedCdnUrl(current)) {
      throw new CdnUrlError();
    }

    const response = await fetch(current, { headers, redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (!location) return response;
      current = new URL(location, current).toString();
      continue;
    }

    return response;
  }

  throw new Error('Too many redirects from CDN');
}
