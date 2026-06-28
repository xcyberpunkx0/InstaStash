import { Platform, ContentType, DetectResponse } from '@/types';
import { DetectErrorCode, DetectErrorResponse } from '@/types/errors';
import { URL_PATTERNS, SUPPORTED_DOMAINS } from './patterns';

/** Result type for the detect method - either success or error */
export type DetectResult = DetectResponse;

export type DetectError = DetectErrorResponse;

/** Tracking parameters to strip from URLs */
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'igshid', 'si', 'feature'];

/** Platforms we tell the user we support, in error responses. */
const SUPPORTED_PLATFORMS = ['Instagram', 'YouTube'];

/** Example URL formats shown when a URL isn't recognized. */
const EXAMPLE_FORMATS = [
  'https://www.instagram.com/reel/ABC123/',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
];

export class PlatformDetector {
  /**
   * Detects the platform, content type, and video ID from a URL.
   * Returns a DetectResult on success or a DetectError on failure.
   */
  detect(url: string): DetectResult | DetectError {
    // Handle empty/whitespace input
    if (!url || url.trim().length === 0) {
      return {
        error: 'Please paste a video URL to get started!',
        code: 'EMPTY_URL' as DetectErrorCode,
        supportedPlatforms: SUPPORTED_PLATFORMS,
      };
    }

    // Normalize the URL first
    const normalizedUrl = this.normalize(url);

    // Try Instagram patterns
    const instagramPost = URL_PATTERNS.instagram.post.exec(normalizedUrl);
    if (instagramPost) {
      const videoId = instagramPost[2];
      return {
        platform: 'instagram',
        contentType: 'post',
        videoId,
        normalizedUrl,
      };
    }

    const instagramReel = URL_PATTERNS.instagram.reel.exec(normalizedUrl);
    if (instagramReel) {
      const videoId = instagramReel[2];
      return {
        platform: 'instagram',
        contentType: 'reel',
        videoId,
        normalizedUrl,
      };
    }

    // Try YouTube patterns (watch, shorts, embed, youtu.be)
    const youtubeId = this.matchYouTubeId(normalizedUrl);
    if (youtubeId) {
      return {
        platform: 'youtube',
        contentType: 'video',
        videoId: youtubeId,
        normalizedUrl,
      };
    }

    // Check if it's a supported domain but invalid path
    if (this.isSupportedDomain(normalizedUrl)) {
      return {
        error: "This doesn't look like a video link. Check the URL?",
        code: 'INVALID_FORMAT' as DetectErrorCode,
        supportedPlatforms: SUPPORTED_PLATFORMS,
        exampleFormats: EXAMPLE_FORMATS,
      };
    }

    // Unsupported platform
    return {
      error: "We don't recognize this URL. We support Instagram and YouTube!",
      code: 'UNSUPPORTED_PLATFORM' as DetectErrorCode,
      supportedPlatforms: SUPPORTED_PLATFORMS,
      exampleFormats: EXAMPLE_FORMATS,
    };
  }

  /** Try each YouTube URL shape and return the 11-char video id, or null. */
  private matchYouTubeId(normalizedUrl: string): string | null {
    for (const pattern of Object.values(URL_PATTERNS.youtube)) {
      const match = pattern.exec(normalizedUrl);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Normalizes a URL by:
   * - Trimming whitespace
   * - Removing tracking parameters (utm_*, igshid, si, feature)
   * - Standardizing to https scheme
   * - Handling www/no-www (preserves as-is for pattern matching)
   * - Removing trailing slashes (except root)
   */
  normalize(url: string): string {
    // Trim whitespace (spaces, tabs, newlines)
    let normalized = url.trim();

    // If empty after trim, return as-is
    if (normalized.length === 0) {
      return normalized;
    }

    // Standardize scheme to https
    normalized = normalized.replace(/^http:\/\//, 'https://');

    // Add https:// if no scheme is present
    if (!normalized.startsWith('https://') && !normalized.startsWith('http://')) {
      normalized = 'https://' + normalized;
    }

    // Parse URL to remove tracking params
    try {
      const urlObj = new URL(normalized);

      // Remove tracking parameters
      for (const param of TRACKING_PARAMS) {
        urlObj.searchParams.delete(param);
      }

      // Rebuild the URL
      normalized = urlObj.toString();
    } catch {
      // If URL parsing fails, return the trimmed/scheme-fixed version
      return normalized;
    }

    // Remove trailing slash (but not for root paths)
    if (normalized.endsWith('/') && new URL(normalized).pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  /**
   * Extracts the video identifier from a URL for a given platform.
   * Returns null if the URL doesn't match the expected pattern.
   */
  extractVideoId(url: string, platform: Platform): string | null {
    const normalizedUrl = this.normalize(url);

    if (platform === 'instagram') {
      const postMatch = URL_PATTERNS.instagram.post.exec(normalizedUrl);
      if (postMatch) return postMatch[2];

      const reelMatch = URL_PATTERNS.instagram.reel.exec(normalizedUrl);
      if (reelMatch) return reelMatch[2];

      return null;
    }

    if (platform === 'youtube') {
      return this.matchYouTubeId(normalizedUrl);
    }

    return null;
  }

  /**
   * Checks if a URL belongs to a supported domain.
   */
  private isSupportedDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return SUPPORTED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    } catch {
      return false;
    }
  }
}

/** Singleton instance for convenience */
export const platformDetector = new PlatformDetector();

/** Type guard to check if a detect result is an error */
export function isDetectError(result: DetectResult | DetectError): result is DetectError {
  return 'error' in result && 'code' in result;
}

/** Type guard to check if a detect result is successful */
export function isDetectSuccess(result: DetectResult | DetectError): result is DetectResult {
  return 'platform' in result && 'videoId' in result;
}
