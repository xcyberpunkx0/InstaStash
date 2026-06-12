import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/proxy-video?url=...
 *
 * Proxies Instagram CDN video through our server so the browser's <video>
 * tag can play it without CORS blocks. Buffers the full response to ensure
 * proper Content-Length headers that <video> elements require for seeking.
 *
 * Restricted to Instagram/Facebook CDN hostnames to prevent open-proxy abuse.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Validate it's an Instagram/Facebook CDN URL
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const allowed =
      hostname.endsWith('.fbcdn.net') ||
      hostname.endsWith('.cdninstagram.com') ||
      hostname.endsWith('.instagram.com');
    if (!allowed) {
      return new Response('Only Instagram CDN URLs are allowed', { status: 403 });
    }
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
      },
    });

    if (!upstream.ok) {
      return new Response(
        `Instagram CDN returned ${upstream.status}`,
        { status: upstream.status },
      );
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('Content-Type') || 'video/mp4';

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Error proxying video: ${message}`, { status: 502 });
  }
}
