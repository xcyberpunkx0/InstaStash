import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PlatformDetector, isDetectSuccess } from '../platform-detector';

/**
 * Property 2: URL Normalization Invariance
 *
 * For any valid video URL, adding arbitrary leading/trailing whitespace,
 * appending additional query parameters (e.g., utm_source, igshid, si),
 * changing the scheme between http and https, adding or removing the www
 * subdomain, or adding or removing a trailing slash SHALL all produce the
 * same detected platform, content type, and video identifier as the canonical URL.
 *
 * **Validates: Requirements 6.3, 6.4, 6.5**
 */

const detector = new PlatformDetector();

// --- Generators ---

/** Generate a valid Instagram shortcode (1-30 alphanumeric + _ + -) */
const instagramShortcode = fc.stringMatching(/^[A-Za-z0-9_-]{1,30}$/);

/** Generate a canonical Instagram URL (post or reel) */
const canonicalInstagramUrl = fc.oneof(
  instagramShortcode.map(id => `https://www.instagram.com/p/${id}`),
  instagramShortcode.map(id => `https://www.instagram.com/reel/${id}`),
  instagramShortcode.map(id => `https://www.instagram.com/reels/${id}`)
);

/** Generate any valid canonical URL */
const canonicalUrl = canonicalInstagramUrl;

// --- Transformation functions ---

/** Tracking parameters that may be appended to URLs */
const trackingParams = fc.subarray(
  [
    'utm_source=ig_web_copy_link',
    'utm_medium=social',
    'utm_campaign=share',
    'igshid=MzRlODBiNWFlZA',
    'feature=share',
  ],
  { minLength: 0, maxLength: 4 }
);

/** Generate leading/trailing whitespace */
const whitespace = fc.stringMatching(/^[ \t\n\r]{0,5}$/);

/** Apply a random combination of transformations to a URL */
const transformedUrl = fc.tuple(
  canonicalUrl,
  whitespace,
  whitespace,
  trackingParams,
  fc.boolean(), // change scheme to http
  fc.boolean(), // toggle www
  fc.boolean()  // add trailing slash
).map(([url, leadingWs, trailingWs, params, useHttp, toggleWww, addSlash]) => {
  let transformed = url;

  // Toggle www subdomain
  if (toggleWww) {
    if (transformed.includes('://www.')) {
      transformed = transformed.replace('://www.', '://');
    } else {
      transformed = transformed.replace('://', '://www.');
    }
  }

  // Change scheme to http
  if (useHttp) {
    transformed = transformed.replace('https://', 'http://');
  }

  // Add trailing slash
  if (addSlash && !transformed.endsWith('/')) {
    if (!transformed.includes('?')) {
      transformed = transformed + '/';
    }
  }

  // Append tracking parameters
  if (params.length > 0) {
    const separator = transformed.includes('?') ? '&' : '?';
    transformed = transformed + separator + params.join('&');
  }

  // Add leading/trailing whitespace
  transformed = leadingWs + transformed + trailingWs;

  return { canonical: url, transformed };
});

describe('Feature: video-downloader-site, Property 2: URL Normalization Invariance', () => {
  it('all URL transformations produce the same detection result as the canonical URL', () => {
    fc.assert(
      fc.property(transformedUrl, ({ canonical, transformed }) => {
        const canonicalResult = detector.detect(canonical);
        const transformedResult = detector.detect(transformed);

        // Both should be successful detections
        expect(isDetectSuccess(canonicalResult)).toBe(true);
        expect(isDetectSuccess(transformedResult)).toBe(true);

        if (isDetectSuccess(canonicalResult) && isDetectSuccess(transformedResult)) {
          // Platform must match
          expect(transformedResult.platform).toBe(canonicalResult.platform);
          // Content type must match
          expect(transformedResult.contentType).toBe(canonicalResult.contentType);
          // Video ID must match
          expect(transformedResult.videoId).toBe(canonicalResult.videoId);
        }
      }),
      { numRuns: 100 }
    );
  });
});
