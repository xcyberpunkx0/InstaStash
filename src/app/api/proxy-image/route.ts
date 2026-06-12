import { NextRequest } from 'next/server';

/**
 * GET /api/proxy-image?url=...
 *
 * Proxies Instagram thumbnail/poster images through our server to bypass
 * CDN hotlinking blocks (CORS / Referer check rejections).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Pretend to be a standard browser request
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new Response(`Failed to fetch image: Instagram CDN returned ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, must-revalidate',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Error proxying image: ${message}`, { status: 500 });
  }
}
