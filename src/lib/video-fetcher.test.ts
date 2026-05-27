import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoFetcher, VideoFetchError, MAX_DURATION_SECONDS } from './video-fetcher';

// Mock youtube-dl-exec
vi.mock('youtube-dl-exec', () => ({
  default: vi.fn(),
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
    it('should return metadata for a YouTube video with multiple formats', async () => {
      mockYtDlp.mockResolvedValue({
        title: 'Test Video',
        duration: 300,
        thumbnail: 'https://img.youtube.com/thumb.jpg',
        formats: [
          { format_id: '18', ext: 'mp4', height: 360, width: 640, filesize: 15000000, vcodec: 'avc1', acodec: 'mp4a' },
          { format_id: '22', ext: 'mp4', height: 720, width: 1280, filesize: 45000000, vcodec: 'avc1', acodec: 'mp4a' },
          { format_id: '137', ext: 'mp4', height: 1080, width: 1920, filesize: 90000000, vcodec: 'avc1', acodec: 'mp4a' },
          { format_id: '251', ext: 'webm', height: 0, vcodec: 'none', acodec: 'opus' }, // audio-only, should be filtered
        ],
      } as never);

      const result = await fetcher.fetchMetadata('https://www.youtube.com/watch?v=abc123', 'youtube');

      expect(result.title).toBe('Test Video');
      expect(result.duration).toBe(300);
      expect(result.thumbnail).toBe('https://img.youtube.com/thumb.jpg');
      expect(result.formats).toHaveLength(3);
      // Should be sorted highest to lowest
      expect(result.formats[0].resolution).toBe('1080p');
      expect(result.formats[1].resolution).toBe('720p');
      expect(result.formats[2].resolution).toBe('360p');
    });

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
        thumbnail: 'https://img.youtube.com/thumb.jpg',
        formats: [
          { format_id: '18', ext: 'mp4', height: 720, width: 1280, filesize: 500000000, vcodec: 'avc1', acodec: 'mp4a' },
        ],
      } as never);

      await expect(
        fetcher.fetchMetadata('https://www.youtube.com/watch?v=longvideo', 'youtube')
      ).rejects.toThrow(VideoFetchError);

      try {
        await fetcher.fetchMetadata('https://www.youtube.com/watch?v=longvideo', 'youtube');
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
          { format_id: '18', ext: 'mp4', height: 720, width: 1280, filesize: 400000000, vcodec: 'avc1', acodec: 'mp4a' },
        ],
      } as never);

      const result = await fetcher.fetchMetadata('https://www.youtube.com/watch?v=exact60', 'youtube');
      expect(result.duration).toBe(3600);
    });

    it('should filter out non-mp4 formats for YouTube', async () => {
      mockYtDlp.mockResolvedValue({
        title: 'Mixed Formats',
        duration: 120,
        thumbnail: '',
        formats: [
          { format_id: '18', ext: 'mp4', height: 360, width: 640, filesize: 15000000, vcodec: 'avc1', acodec: 'mp4a' },
          { format_id: '43', ext: 'webm', height: 360, width: 640, filesize: 12000000, vcodec: 'vp8', acodec: 'vorbis' },
          { format_id: '22', ext: 'mp4', height: 720, width: 1280, filesize: 45000000, vcodec: 'avc1', acodec: 'mp4a' },
          { format_id: '248', ext: 'webm', height: 1080, width: 1920, filesize: 80000000, vcodec: 'vp9', acodec: 'none' },
        ],
      } as never);

      const result = await fetcher.fetchMetadata('https://www.youtube.com/watch?v=mixed', 'youtube');

      // Only mp4 formats with video should be included
      expect(result.formats.every((f) => f.ext === 'mp4')).toBe(true);
      expect(result.formats).toHaveLength(2);
    });

    it('should deduplicate YouTube formats by resolution, keeping largest file size', async () => {
      mockYtDlp.mockResolvedValue({
        title: 'Duplicate Resolutions',
        duration: 60,
        thumbnail: '',
        formats: [
          { format_id: '18', ext: 'mp4', height: 720, width: 1280, filesize: 30000000, vcodec: 'avc1', acodec: 'mp4a' },
          { format_id: '22', ext: 'mp4', height: 720, width: 1280, filesize: 50000000, vcodec: 'avc1', acodec: 'mp4a' },
        ],
      } as never);

      const result = await fetcher.fetchMetadata('https://www.youtube.com/watch?v=dupes', 'youtube');

      expect(result.formats).toHaveLength(1);
      expect(result.formats[0].fileSize).toBe(50000000);
    });
  });

  describe('error mapping', () => {
    it('should map private video errors to PRIVATE code', async () => {
      mockYtDlp.mockRejectedValue(new Error('This video is private. Sign in if you have access.'));

      try {
        await fetcher.fetchMetadata('https://www.youtube.com/watch?v=private', 'youtube');
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
        await fetcher.fetchMetadata('https://www.youtube.com/watch?v=agegate', 'youtube');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('AGE_RESTRICTED');
      }
    });

    it('should map geo-blocked errors to GEO_BLOCKED code', async () => {
      mockYtDlp.mockRejectedValue(new Error('Video not available in your country'));

      try {
        await fetcher.fetchMetadata('https://www.youtube.com/watch?v=geoblocked', 'youtube');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('GEO_BLOCKED');
      }
    });

    it('should map unavailable errors to UNAVAILABLE code', async () => {
      mockYtDlp.mockRejectedValue(new Error('This video is unavailable'));

      try {
        await fetcher.fetchMetadata('https://www.youtube.com/watch?v=deleted', 'youtube');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('UNAVAILABLE');
      }
    });

    it('should map rate limit errors to RATE_LIMITED code with retryAfter', async () => {
      mockYtDlp.mockRejectedValue(new Error('HTTP Error 429: Too Many Requests. Retry after: 120'));

      try {
        await fetcher.fetchMetadata('https://www.youtube.com/watch?v=ratelimit', 'youtube');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('RATE_LIMITED');
        expect((e as VideoFetchError).retryAfter).toBe(120);
      }
    });

    it('should map network errors to NETWORK_ERROR code', async () => {
      mockYtDlp.mockRejectedValue(new Error('Network connection timed out'));

      try {
        await fetcher.fetchMetadata('https://www.youtube.com/watch?v=timeout', 'youtube');
      } catch (e) {
        expect(e).toBeInstanceOf(VideoFetchError);
        expect((e as VideoFetchError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should map unknown errors to NETWORK_ERROR code', async () => {
      mockYtDlp.mockRejectedValue(new Error('Something completely unexpected happened'));

      try {
        await fetcher.fetchMetadata('https://www.youtube.com/watch?v=unknown', 'youtube');
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
        await fetcher.fetchMetadata('https://www.youtube.com/watch?v=stderrtest', 'youtube');
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

      const result = await fetcher.fetchMetadata('https://www.youtube.com/watch?v=short', 'youtube');
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
        fetcher.fetchMetadata('https://www.youtube.com/watch?v=toolong', 'youtube')
      ).rejects.toMatchObject({ code: 'DURATION_EXCEEDED' });
    });
  });

  describe('MAX_DURATION_SECONDS constant', () => {
    it('should be 3600', () => {
      expect(MAX_DURATION_SECONDS).toBe(3600);
    });
  });
});
