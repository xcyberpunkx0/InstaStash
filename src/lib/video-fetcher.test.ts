import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoFetcher, VideoFetchError, MAX_DURATION_SECONDS } from './video-fetcher';

// Mock youtube-dl-exec and instagram-scraper
vi.mock('youtube-dl-exec', () => ({
  default: vi.fn(),
}));

vi.mock('./instagram-scraper', () => ({
  scrapeInstagramVideo: vi.fn().mockRejectedValue(new Error('Scrape failed')),
}));

import youtubeDlExec from 'youtube-dl-exec';
const mockYtDlp = vi.mocked(youtubeDlExec);

describe('VideoFetcher', () => {
  let fetcher: VideoFetcher;

  beforeEach(() => {
    fetcher = new VideoFetcher();
    vi.clearAllMocks();
  });

  describe('fetchMetadata', () => {
    it('should return a single format for Instagram', async () => {
      mockYtDlp.mockResolvedValue({
        title: 'Instagram Reel',
        duration: 30,
        thumbnail: 'https://instagram.com/thumb.jpg',
        formats: [
          { format_id: '0', ext: 'mp4', height: 1080, width: 1080, filesize: 5000000, vcodec: 'avc1', acodec: 'mp4a' },
          { format_id: '1', ext: 'mp4', height: 720, width: 720, filesize: 3000000, vcodec: 'avc1', acodec: 'mp4a' },
        ],
      } as never);

      const result = await fetcher.fetchMetadata('https://www.instagram.com/reel/abc123/', 'instagram');

      expect(result.title).toBe('Instagram Reel');
      expect(result.duration).toBe(30);
      expect(result.formats).toHaveLength(1);
      // Should pick the highest resolution
      expect(result.formats[0].resolution).toBe('1080p');
    });

    it('should reject videos exceeding 3600 seconds with DURATION_EXCEEDED', async () => {
      mockYtDlp.mockResolvedValue({
        title: 'Long Video',
        duration: 3601,
        thumbnail: 'https://instagram.com/thumb.jpg',
        formats: [
          { format_id: '1', ext: 'mp4', height: 720, width: 1280, filesize: 500000000, vcodec: 'avc1', acodec: 'mp4a' },
        ],
      } as never);

      await expect(
        fetcher.fetchMetadata('https://www.instagram.com/reel/longvideo', 'instagram')
      ).rejects.toThrow(VideoFetchError);

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/reel/longvideo', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('DURATION_EXCEEDED');
      }
    });

    it('should accept videos at exactly 3600 seconds', async () => {
      mockYtDlp.mockResolvedValue({
        title: 'Exactly 60 min',
        duration: 3600,
        thumbnail: '',
        formats: [
          { format_id: '1', ext: 'mp4', height: 720, width: 1280, filesize: 400000000, vcodec: 'avc1', acodec: 'mp4a' },
        ],
      } as never);

      const result = await fetcher.fetchMetadata('https://www.instagram.com/reel/exact60', 'instagram');
      expect(result.duration).toBe(3600);
    });
  });

  describe('error mapping', () => {
    it('should map private video errors to PRIVATE code', async () => {
      mockYtDlp.mockRejectedValue(new Error('This video is private. Sign in if you have access.'));

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/p/private', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('PRIVATE');
      }
    });

    it('should map login required errors to PRIVATE code', async () => {
      mockYtDlp.mockRejectedValue(new Error('Login required to access this content'));

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/p/private123/', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('PRIVATE');
      }
    });

    it('should map age-restricted errors to AGE_RESTRICTED code', async () => {
      mockYtDlp.mockRejectedValue(new Error('This video is age-restricted'));

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/reel/agegate', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('AGE_RESTRICTED');
      }
    });

    it('should map geo-blocked errors to GEO_BLOCKED code', async () => {
      mockYtDlp.mockRejectedValue(new Error('Video not available in your country'));

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/reel/geoblocked', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('GEO_BLOCKED');
      }
    });

    it('should map unavailable errors to UNAVAILABLE code', async () => {
      mockYtDlp.mockRejectedValue(new Error('This video is unavailable'));

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/reel/deleted', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('UNAVAILABLE');
      }
    });

    it('should map rate limit errors to RATE_LIMITED code with retryAfter', async () => {
      mockYtDlp.mockRejectedValue(new Error('HTTP Error 429: Too Many Requests. Retry after: 120'));

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/reel/ratelimit', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('RATE_LIMITED');
        expect((e as VideoFetchError).retryAfter).toBe(120);
      }
    });

    it('should map network errors to NETWORK_ERROR code', async () => {
      mockYtDlp.mockRejectedValue(new Error('Network connection timed out'));

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/reel/timeout', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should map unknown errors to NETWORK_ERROR code', async () => {
      mockYtDlp.mockRejectedValue(new Error('Something completely unexpected happened'));

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/reel/unknown', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should check stderr for error classification', async () => {
      const error = new Error('Command failed') as Error & { stderr: string };
      error.stderr = 'ERROR: This video is private';
      mockYtDlp.mockRejectedValue(error);

      try {
        await fetcher.fetchMetadata('https://www.instagram.com/reel/stderrtest', 'instagram');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('PRIVATE');
      }
    });
  });

  describe('duration validation', () => {
    it('should accept videos at 1 second', async () => {
      mockYtDlp.mockResolvedValue({
        title: 'Short',
        duration: 1,
        thumbnail: '',
        formats: [{ format_id: '0', ext: 'mp4', height: 720, width: 1280, filesize: 1000, vcodec: 'avc1', acodec: 'mp4a' }],
      } as never);

      const result = await fetcher.fetchMetadata('https://www.instagram.com/reel/short', 'instagram');
      expect(result.duration).toBe(1);
    });

    it('should reject videos at 3601 seconds', async () => {
      mockYtDlp.mockResolvedValue({
        title: 'Too Long',
        duration: 3601,
        thumbnail: '',
        formats: [{ format_id: '0', ext: 'mp4', height: 720, width: 1280, filesize: 1000, vcodec: 'avc1', acodec: 'mp4a' }],
      } as never);

      await expect(
        fetcher.fetchMetadata('https://www.instagram.com/reel/toolong', 'instagram')
      ).rejects.toMatchObject({ code: 'DURATION_EXCEEDED' });
    });
  });

  describe('MAX_DURATION_SECONDS constant', () => {
    it('should be 3600', () => {
      expect(MAX_DURATION_SECONDS).toBe(3600);
    });
  });
});
