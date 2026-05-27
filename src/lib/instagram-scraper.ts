/**
 * Instagram video scraper that extracts video URLs from public posts/reels
 * without requiring authentication. Works by fetching the page HTML and
 * parsing the embedded JSON data (similar to how download sites work).
 */

export interface InstagramVideoData {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  duration: number;
}

/**
 * Extracts video URL from a public Instagram post/reel by scraping the page.
 * This mimics what sites like savefrom.net do — fetch the HTML and parse
 * the embedded media data from script tags.
 */
export async function scrapeInstagramVideo(url: string): Promise<InstagramVideoData> {
  // Normalize the URL
  const normalizedUrl = url.replace(/\?.*$/, '').replace(/\/$/, '') + '/';

  // Try multiple approaches
  const videoData = await tryGraphQLApproach(normalizedUrl)
    ?? await tryHtmlScrapeApproach(normalizedUrl);

  if (!videoData) {
    throw new Error('Could not extract video from Instagram. The post may be private or unavailable.');
  }

  return videoData;
}

/**
 * Approach 1: Use Instagram's GraphQL endpoint to get media info.
 * Appends ?__a=1&__d=dis to the URL to get JSON response.
 */
async function tryGraphQLApproach(url: string): Promise<InstagramVideoData | null> {
  try {
    const apiUrl = url + '?__a=1&__d=dis';

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Mode': 'navigate',
        'X-IG-App-ID': '936619743392459',
      },
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const text = await response.text();

    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      return extractFromGraphQLResponse(data);
    } catch {
      // Not JSON, try to extract from HTML
      return extractFromHtml(text);
    }
  } catch {
    return null;
  }
}

/**
 * Approach 2: Fetch the page HTML and extract video URL from embedded data.
 */
async function tryHtmlScrapeApproach(url: string): Promise<InstagramVideoData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const html = await response.text();
    return extractFromHtml(html);
  } catch {
    return null;
  }
}

/**
 * Extract video data from Instagram's GraphQL JSON response.
 */
function extractFromGraphQLResponse(data: unknown): InstagramVideoData | null {
  try {
    // Navigate the nested structure
    const items = (data as Record<string, unknown>)?.items
      ?? (data as Record<string, Record<string, unknown>>)?.graphql?.shortcode_media
      ?? null;

    if (Array.isArray(items) && items.length > 0) {
      const item = items[0];
      const videoVersions = item.video_versions ?? item.video_url;

      if (Array.isArray(videoVersions) && videoVersions.length > 0) {
        return {
          videoUrl: videoVersions[0].url,
          thumbnailUrl: item.image_versions2?.candidates?.[0]?.url ?? '',
          title: item.caption?.text?.slice(0, 100) ?? 'Instagram Video',
          duration: item.video_duration ?? 0,
        };
      }

      // Single video_url field
      if (typeof item.video_url === 'string') {
        return {
          videoUrl: item.video_url,
          thumbnailUrl: item.display_url ?? item.thumbnail_src ?? '',
          title: item.edge_media_to_caption?.edges?.[0]?.node?.text?.slice(0, 100) ?? 'Instagram Video',
          duration: item.video_duration ?? 0,
        };
      }
    }

    // Try graphql.shortcode_media format
    const media = (data as Record<string, Record<string, Record<string, unknown>>>)?.graphql?.shortcode_media;
    if (media && media.is_video && typeof media.video_url === 'string') {
      return {
        videoUrl: media.video_url as string,
        thumbnailUrl: (media.display_url ?? media.thumbnail_src ?? '') as string,
        title: ((media as Record<string, unknown>).edge_media_to_caption as Record<string, unknown[]>)?.edges?.[0]
          ? 'Instagram Video'
          : 'Instagram Video',
        duration: (media.video_duration ?? 0) as number,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract video URL from Instagram page HTML by finding it in script tags
 * or meta tags.
 */
function extractFromHtml(html: string): InstagramVideoData | null {
  // Method 1: Look for video URL in og:video meta tag
  const ogVideoMatch = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i)
    ?? html.match(/<meta\s+content="([^"]+)"\s+property="og:video"/i);

  if (ogVideoMatch) {
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
      ?? html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
      ?? html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);

    return {
      videoUrl: decodeHtmlEntities(ogVideoMatch[1]),
      thumbnailUrl: ogImageMatch ? decodeHtmlEntities(ogImageMatch[1]) : '',
      title: ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1]).slice(0, 100) : 'Instagram Video',
      duration: 0,
    };
  }

  // Method 2: Look for video_url in embedded JSON within script tags
  const videoUrlMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
  if (videoUrlMatch) {
    const thumbnailMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/);
    return {
      videoUrl: decodeUnicodeEscapes(videoUrlMatch[1]),
      thumbnailUrl: thumbnailMatch ? decodeUnicodeEscapes(thumbnailMatch[1]) : '',
      title: 'Instagram Video',
      duration: 0,
    };
  }

  // Method 3: Look in window._sharedData or similar embedded JSON
  const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});<\/script>/);
  if (sharedDataMatch) {
    try {
      const sharedData = JSON.parse(sharedDataMatch[1]);
      const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
      if (media?.is_video && media?.video_url) {
        return {
          videoUrl: media.video_url,
          thumbnailUrl: media.display_url ?? '',
          title: media.edge_media_to_caption?.edges?.[0]?.node?.text?.slice(0, 100) ?? 'Instagram Video',
          duration: media.video_duration ?? 0,
        };
      }
    } catch {
      // JSON parse failed
    }
  }

  return null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodeUnicodeEscapes(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
}
