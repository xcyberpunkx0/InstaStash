import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PlatformDetector, isDetectSuccess } from '../platform-detector';

/**
 * Property 1: URL Detection Correctness
 *
 * For any valid URL belonging to a supported platform (Instagram post, Instagram Reel,
 * YouTube video, YouTube Short, or youtu.be short link), the PlatformDetector SHALL
 * correctly identify the platform, content type, and extract the video identifier.
 *
 * **Validates: Requirements 1.2, 2.1, 2.2, 3.1, 3.2, 6.1, 6.2**
 */
describe('Feature: video-downloader-site, Property 1: URL Detection Correctness', () => {
  const detector = new PlatformDetector();

  // Generator for Instagram shortcodes: [A-Za-z0-9_-]+ (1 to 30 chars)
  const instagramShortcode = fc.stringMatching(/^[A-Za-z0-9_-]{1,30}$/);

  // Generator for YouTube video IDs: exactly 11 chars from [A-Za-z0-9_-]
  const youtubeVideoId = fc.stringMatching(/^[A-Za-z0-9_-]{11}$/);

  // Generator for Instagram post URLs
  const instagramPostUrl = fc.tuple(
    fc.constantFrom('https://www.instagram.com', 'https://instagram.com'),
    instagramShortcode
  ).map(([base, shortcode]) => ({
    url: `${base}/p/${shortcode}/`,
    expectedPlatform: 'instagram' as const,
    expectedContentType: 'post' as const,
    expectedVideoId: shortcode,
  }));

  // Generator for Instagram reel URLs (both /reel/ and /reels/)
  const instagramReelUrl = fc.tuple(
    fc.constantFrom('https://www.instagram.com', 'https://instagram.com'),
    fc.constantFrom('reel', 'reels'),
    instagramShortcode
  ).map(([base, path, shortcode]) => ({
    url: `${base}/${path}/${shortcode}/`,
    expectedPlatform: 'instagram' as const,
    expectedContentType: 'reel' as const,
    expectedVideoId: shortcode,
  }));

  // Generator for YouTube video URLs (watch?v=)
  const youtubeVideoUrl = fc.tuple(
    fc.constantFrom('https://www.youtube.com', 'https://youtube.com', 'https://m.youtube.com'),
    youtubeVideoId
  ).map(([base, id]) => ({
    url: `${base}/watch?v=${id}`,
    expectedPlatform: 'youtube' as const,
    expectedContentType: 'video' as const,
    expectedVideoId: id,
  }));

  // Generator for YouTube shorts URLs
  const youtubeShortsUrl = fc.tuple(
    fc.constantFrom('https://www.youtube.com', 'https://youtube.com', 'https://m.youtube.com'),
    youtubeVideoId
  ).map(([base, id]) => ({
    url: `${base}/shorts/${id}`,
    expectedPlatform: 'youtube' as const,
    expectedContentType: 'short' as const,
    expectedVideoId: id,
  }));

  // Generator for youtu.be short URLs
  const youtuBeUrl = youtubeVideoId.map((id) => ({
    url: `https://youtu.be/${id}`,
    expectedPlatform: 'youtube' as const,
    expectedContentType: 'video' as const,
    expectedVideoId: id,
  }));

  // Combined generator for all valid URL types
  const validUrl = fc.oneof(
    instagramPostUrl,
    instagramReelUrl,
    youtubeVideoUrl,
    youtubeShortsUrl,
    youtuBeUrl
  );

  it('correctly detects platform, content type, and video ID for all generated valid URLs', () => {
    fc.assert(
      fc.property(validUrl, ({ url, expectedPlatform, expectedContentType, expectedVideoId }) => {
        const result = detector.detect(url);

        // Result must be a successful detection
        expect(isDetectSuccess(result)).toBe(true);

        if (isDetectSuccess(result)) {
          expect(result.platform).toBe(expectedPlatform);
          expect(result.contentType).toBe(expectedContentType);
          expect(result.videoId).toBe(expectedVideoId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('correctly detects Instagram post URLs', () => {
    fc.assert(
      fc.property(instagramPostUrl, ({ url, expectedPlatform, expectedContentType, expectedVideoId }) => {
        const result = detector.detect(url);

        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe(expectedPlatform);
          expect(result.contentType).toBe(expectedContentType);
          expect(result.videoId).toBe(expectedVideoId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('correctly detects Instagram reel URLs', () => {
    fc.assert(
      fc.property(instagramReelUrl, ({ url, expectedPlatform, expectedContentType, expectedVideoId }) => {
        const result = detector.detect(url);

        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe(expectedPlatform);
          expect(result.contentType).toBe(expectedContentType);
          expect(result.videoId).toBe(expectedVideoId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('correctly detects YouTube video URLs', () => {
    fc.assert(
      fc.property(youtubeVideoUrl, ({ url, expectedPlatform, expectedContentType, expectedVideoId }) => {
        const result = detector.detect(url);

        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe(expectedPlatform);
          expect(result.contentType).toBe(expectedContentType);
          expect(result.videoId).toBe(expectedVideoId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('correctly detects YouTube shorts URLs', () => {
    fc.assert(
      fc.property(youtubeShortsUrl, ({ url, expectedPlatform, expectedContentType, expectedVideoId }) => {
        const result = detector.detect(url);

        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe(expectedPlatform);
          expect(result.contentType).toBe(expectedContentType);
          expect(result.videoId).toBe(expectedVideoId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('correctly detects youtu.be short URLs', () => {
    fc.assert(
      fc.property(youtuBeUrl, ({ url, expectedPlatform, expectedContentType, expectedVideoId }) => {
        const result = detector.detect(url);

        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe(expectedPlatform);
          expect(result.contentType).toBe(expectedContentType);
          expect(result.videoId).toBe(expectedVideoId);
        }
      }),
      { numRuns: 100 }
    );
  });
});
