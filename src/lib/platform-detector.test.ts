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

    describe('YouTube video URLs', () => {
      it('detects youtube.com/watch?v={id} format', () => {
        const result = detector.detect('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('youtube');
          expect(result.contentType).toBe('video');
          expect(result.videoId).toBe('dQw4w9WgXcQ');
        }
      });

      it('detects m.youtube.com/watch?v={id} format', () => {
        const result = detector.detect('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('youtube');
          expect(result.contentType).toBe('video');
          expect(result.videoId).toBe('dQw4w9WgXcQ');
        }
      });

      it('detects youtube.com/watch?v={id} without www', () => {
        const result = detector.detect('https://youtube.com/watch?v=dQw4w9WgXcQ');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('youtube');
          expect(result.contentType).toBe('video');
          expect(result.videoId).toBe('dQw4w9WgXcQ');
        }
      });
    });

    describe('YouTube shorts URLs', () => {
      it('detects youtube.com/shorts/{id} format', () => {
        const result = detector.detect('https://www.youtube.com/shorts/dQw4w9WgXcQ');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('youtube');
          expect(result.contentType).toBe('short');
          expect(result.videoId).toBe('dQw4w9WgXcQ');
        }
      });
    });

    describe('YouTube short URLs (youtu.be)', () => {
      it('detects youtu.be/{id} format', () => {
        const result = detector.detect('https://youtu.be/dQw4w9WgXcQ');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.platform).toBe('youtube');
          expect(result.contentType).toBe('video');
          expect(result.videoId).toBe('dQw4w9WgXcQ');
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

      it('returns INVALID_FORMAT for youtube.com without video path', () => {
        const result = detector.detect('https://www.youtube.com/channel/UCxyz');
        expect(isDetectError(result)).toBe(true);
        if (isDetectError(result)) {
          expect(result.code).toBe('INVALID_FORMAT');
        }
      });

      it('returns INVALID_FORMAT for youtube.com homepage', () => {
        const result = detector.detect('https://www.youtube.com/');
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
      it('handles URLs with tracking params', () => {
        const result = detector.detect('https://www.instagram.com/p/ABC123/?utm_source=ig_web&igshid=xyz');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.videoId).toBe('ABC123');
        }
      });

      it('handles URLs with leading/trailing whitespace', () => {
        const result = detector.detect('  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.videoId).toBe('dQw4w9WgXcQ');
        }
      });

      it('handles http scheme (normalizes to https)', () => {
        const result = detector.detect('http://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(isDetectSuccess(result)).toBe(true);
        if (isDetectSuccess(result)) {
          expect(result.videoId).toBe('dQw4w9WgXcQ');
        }
      });
    });
  });

  describe('normalize()', () => {
    it('trims whitespace', () => {
      const result = detector.normalize('  https://youtube.com/watch?v=abc12345678  ');
      expect(result).toBe('https://youtube.com/watch?v=abc12345678');
    });

    it('removes tracking params', () => {
      const result = detector.normalize('https://www.instagram.com/p/ABC123/?utm_source=ig&igshid=xyz');
      expect(result).not.toContain('utm_source');
      expect(result).not.toContain('igshid');
    });

    it('standardizes http to https', () => {
      const result = detector.normalize('http://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.startsWith('https://')).toBe(true);
    });

    it('removes trailing slash from paths', () => {
      const result = detector.normalize('https://www.instagram.com/p/ABC123/');
      expect(result.endsWith('/')).toBe(false);
    });

    it('preserves the v parameter for YouTube', () => {
      const result = detector.normalize('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking123');
      expect(result).toContain('v=dQw4w9WgXcQ');
      expect(result).not.toContain('si=');
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

    it('extracts YouTube video ID from watch URL', () => {
      const id = detector.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('extracts YouTube video ID from shorts URL', () => {
      const id = detector.extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('extracts YouTube video ID from youtu.be URL', () => {
      const id = detector.extractVideoId('https://youtu.be/dQw4w9WgXcQ', 'youtube');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('returns null for non-matching URL', () => {
      const id = detector.extractVideoId('https://www.instagram.com/username', 'instagram');
      expect(id).toBeNull();
    });

    it('returns null for wrong platform', () => {
      const id = detector.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'instagram');
      expect(id).toBeNull();
    });
  });
});
