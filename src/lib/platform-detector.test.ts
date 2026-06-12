import { describe, it, expect } from 'vitest';
import { PlatformDetector, isDetectError, isDetectSuccess } from './platform-detector';

describe('PlatformDetector', () => {
  const detector = new PlatformDetector();

  describe('detect()', () => {
    describe('Instagram post URLs', () => {
      it('detects instagram.com/p/{id} format', () => {
        const result = detector.detect('https://www.instagram.com/p/ABC123xyz/');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('instagram');
          expect(result.contentType).toBe('post');
          expect(result.videoId).toBe('ABC123xyz');
        }
      });

      it('detects instagram.com/p/{id} without www', () => {
        const result = detector.detect('https://instagram.com/p/TestPost_1/');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('instagram');
          expect(result.contentType).toBe('post');
          expect(result.videoId).toBe('TestPost_1');
        }
      });

      it('detects instagram.com/p/{id} without trailing slash', () => {
        const result = detector.detect('https://www.instagram.com/p/MyPost123');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('instagram');
          expect(result.contentType).toBe('post');
          expect(result.videoId).toBe('MyPost123');
        }
      });
    });

    describe('Instagram reel URLs', () => {
      it('detects instagram.com/reel/{id} format', () => {
        const result = detector.detect('https://www.instagram.com/reel/ReelId_123/');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('instagram');
          expect(result.contentType).toBe('reel');
          expect(result.videoId).toBe('ReelId_123');
        }
      });

      it('detects instagram.com/reels/{id} format (plural)', () => {
        const result = detector.detect('https://www.instagram.com/reels/ReelId_456/');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('instagram');
          expect(result.contentType).toBe('reel');
          expect(result.videoId).toBe('ReelId_456');
        }
      });
    });

    describe('Edge cases - empty/whitespace input', () => {
      it('returns EMPTY_URL error for empty string', () => {
        const result = detector.detect('');
        expect(isDetectError(result)).toBe(true);
        if (isDetectError(result)) {
          expect(result.code).toBe('EMPTY_URL');
        }
      });

      it('returns EMPTY_URL error for whitespace-only string', () => {
        const result = detector.detect('   \t\n  ');
        expect(isDetectError(result)).toBe(true);
        if (isDetectError(result)) {
          expect(result.code).toBe('EMPTY_URL');
        }
      });
    });

    describe('Edge cases - supported domain but invalid path', () => {
      it('returns INVALID_FORMAT for instagram.com without video path', () => {
        const result = detector.detect('https://www.instagram.com/username');
        expect(isDetectError(result)).toBe(true);
        if (isDetectError(result)) {
          expect(result.code).toBe('INVALID_FORMAT');
        }
      });
    });

    describe('Edge cases - unsupported domains', () => {
      it('returns UNSUPPORTED_PLATFORM for tiktok.com', () => {
        const result = detector.detect('https://www.tiktok.com/@user/video/123');
        expect(isDetectError(result)).toBe(true);
        if (isDetectError(result)) {
          expect(result.code).toBe('UNSUPPORTED_PLATFORM');
        }
      });

      it('returns UNSUPPORTED_PLATFORM for vimeo.com', () => {
        const result = detector.detect('https://vimeo.com/123456');
        expect(isDetectError(result)).toBe(true);
        if (isDetectError(result)) {
          expect(result.code).toBe('UNSUPPORTED_PLATFORM');
        }
      });

      it('returns UNSUPPORTED_PLATFORM for random text', () => {
        const result = detector.detect('not a url at all');
        expect(isDetectError(result)).toBe(true);
        if (isDetectError(result)) {
          expect(result.code).toBe('UNSUPPORTED_PLATFORM');
        }
      });
    });

    describe('URL normalization within detect', () => {
      it('handles Instagram URLs with tracking params', () => {
        const result = detector.detect('https://www.instagram.com/p/ABC123/?utm_source=ig_web&igshid=xyz');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.videoId).toBe('ABC123');
        }
      });

      it('handles Instagram URLs with leading/trailing whitespace', () => {
        const result = detector.detect('  https://www.instagram.com/p/ABC123/  ');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.videoId).toBe('ABC123');
        }
      });

      it('handles http scheme (normalizes to https)', () => {
        const result = detector.detect('http://www.instagram.com/p/ABC123/');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.videoId).toBe('ABC123');
        }
      });
    });
  });

  describe('normalize()', () => {
    it('trims whitespace', () => {
      const result = detector.normalize('  https://instagram.com/p/ABC12345678  ');
      expect(result).toBe('https://instagram.com/p/ABC12345678');
    });

    it('removes tracking params', () => {
      const result = detector.normalize('https://www.instagram.com/p/ABC123/?utm_source=ig&igshid=xyz');
      expect(result).not.toContain('utm_source');
      expect(result).not.toContain('igshid');
    });

    it('standardizes http to https', () => {
      const result = detector.normalize('http://www.instagram.com/p/ABC123/');
      expect(result.startsWith('https://')).toBe(true);
    });

    it('removes trailing slash from paths', () => {
      const result = detector.normalize('https://www.instagram.com/p/ABC123/');
      expect(result.endsWith('/')).toBe(false);
    });

    it('returns empty string for empty input', () => {
      expect(detector.normalize('')).toBe('');
      expect(detector.normalize('   ')).toBe('');
    });
  });

  describe('extractVideoId()', () => {
    it('extracts Instagram post ID', () => {
      const id = detector.extractVideoId('https://www.instagram.com/p/CxYz_123/', 'instagram');
      expect(id).toBe('CxYz_123');
    });

    it('extracts Instagram reel ID', () => {
      const id = detector.extractVideoId('https://www.instagram.com/reel/ReelABC/', 'instagram');
      expect(id).toBe('ReelABC');
    });

    it('returns null for non-matching URL', () => {
      const id = detector.extractVideoId('https://www.instagram.com/username', 'instagram');
      expect(id).toBeNull();
    });
  });
});
