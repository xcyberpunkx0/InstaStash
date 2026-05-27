import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { VideoFetchError } from '@/lib/video-fetcher';

// Mock the VideoFetcher class
vi.mock('@/lib/video-fetcher', () => {
  const VideoFetchError = class VideoFetchError extends Error {
    code: string;
    retryAfter?: number;
    constructor(message: string, code: string, retryAfter?: number) {
      super(message);
      this.name = 'VideoFetchError';
      this.code = code;
      this.retryAfter = retryAfter;
    }
  };

  return {
    VideoFetcher: vi.fn().mockImplementation(() => ({
      fetchMetadata: vi.fn(),
    })),
    VideoFetchError,
  };
});

import { VideoFetcher } from '@/lib/video-fetcher';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/fetch', () => {
  let mockFetchMetadata: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchMetadata = vi.fn();
    vi.mocked(VideoFetcher).mockImplementation(() => ({
      fetchMetadata: mockFetchMetadata,
    }) as unknown as VideoFetcher);
  });

  describe('successful responses', () => {
    it('should return video metadata for a valid YouTube request', async () => {
      mockFetchMetadata.mockResolvedValue({
        title: 'Test Video',
        duration: 300,
        thumbnail: 'https://img.youtube.com/thumb.jpg',
        formats: [
          { formatId: '137', resolution: '1080p', fileSize: 90000000, ext: 'mp4', quality: '1080p HD (~86MB)' },
          { formatId: '22', resolution: '720p', fileSize: 45000000, ext: 'mp4', quality: '720p HD (~43MB)' },
        ],
      });

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=abc123', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Test Video');
      expect(data.duration).toBe(300);
      expect(data.thumbnail).toBe('https://img.youtube.com/thumb.jpg');
      expect(data.formats).toHaveLength(2);
      expect(data.formats[0].resolution).toBe('1080p');
    });

    it('should return video metadata for a valid Instagram request', async () => {
      mockFetchMetadata.mockResolvedValue({
        title: 'Instagram Reel',
        duration: 30,
        thumbnail: 'https://instagram.com/thumb.jpg',
        formats: [
          { formatId: '0', resolution: '1080p', fileSize: 5000000, ext: 'mp4', quality: '1080p HD (~5MB)' },
        ],
      });

      const request = createRequest({ url: 'https://www.instagram.com/reel/abc123/', platform: 'instagram' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Instagram Reel');
      expect(data.formats).toHaveLength(1);
    });

    it('should omit thumbnail when empty string', async () => {
      mockFetchMetadata.mockResolvedValue({
        title: 'No Thumb',
        duration: 60,
        thumbnail: '',
        formats: [
          { formatId: '18', resolution: '360p', fileSize: 10000000, ext: 'mp4', quality: '360p (~10MB)' },
        ],
      });

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=nothumb', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.thumbnail).toBeUndefined();
    });

    it('should trim whitespace from the URL before fetching', async () => {
      mockFetchMetadata.mockResolvedValue({
        title: 'Trimmed',
        duration: 60,
        thumbnail: '',
        formats: [],
      });

      const request = createRequest({ url: '  https://www.youtube.com/watch?v=trim  ', platform: 'youtube' });
      await POST(request);

      expect(mockFetchMetadata).toHaveBeenCalledWith('https://www.youtube.com/watch?v=trim', 'youtube');
    });
  });

  describe('input validation errors', () => {
    it('should return 400 for invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('NETWORK_ERROR');
    });

    it('should return 400 for missing url', async () => {
      const request = createRequest({ platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('URL');
    });

    it('should return 400 for empty url', async () => {
      const request = createRequest({ url: '   ', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('URL');
    });

    it('should return 400 for missing platform', async () => {
      const request = createRequest({ url: 'https://www.youtube.com/watch?v=abc' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Platform');
    });

    it('should return 400 for invalid platform value', async () => {
      const request = createRequest({ url: 'https://example.com', platform: 'tiktok' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Platform');
    });
  });

  describe('VideoFetchError responses', () => {
    it('should return 403 for PRIVATE error', async () => {
      mockFetchMetadata.mockRejectedValue(
        new VideoFetchError('This content is private.', 'PRIVATE')
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=priv', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('PRIVATE');
      expect(data.error).toBe('This content is private.');
    });

    it('should return 403 for AGE_RESTRICTED error', async () => {
      mockFetchMetadata.mockRejectedValue(
        new VideoFetchError('Age-restricted content.', 'AGE_RESTRICTED')
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=age', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('AGE_RESTRICTED');
    });

    it('should return 403 for GEO_BLOCKED error', async () => {
      mockFetchMetadata.mockRejectedValue(
        new VideoFetchError('Not available in your region.', 'GEO_BLOCKED')
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=geo', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('GEO_BLOCKED');
    });

    it('should return 404 for UNAVAILABLE error', async () => {
      mockFetchMetadata.mockRejectedValue(
        new VideoFetchError('Content no longer available.', 'UNAVAILABLE')
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=gone', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('UNAVAILABLE');
    });

    it('should return 400 for DURATION_EXCEEDED error', async () => {
      mockFetchMetadata.mockRejectedValue(
        new VideoFetchError('Video too long.', 'DURATION_EXCEEDED')
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=long', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('DURATION_EXCEEDED');
    });

    it('should return 429 for RATE_LIMITED error with retryAfter', async () => {
      mockFetchMetadata.mockRejectedValue(
        new VideoFetchError('Too many requests.', 'RATE_LIMITED', 120)
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=rate', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('RATE_LIMITED');
      expect(data.retryAfter).toBe(120);
    });

    it('should not include retryAfter for non-rate-limited errors', async () => {
      mockFetchMetadata.mockRejectedValue(
        new VideoFetchError('Private content.', 'PRIVATE')
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=priv2', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.retryAfter).toBeUndefined();
    });

    it('should return 502 for NETWORK_ERROR', async () => {
      mockFetchMetadata.mockRejectedValue(
        new VideoFetchError('Connection failed.', 'NETWORK_ERROR')
      );

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=net', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.code).toBe('NETWORK_ERROR');
    });
  });

  describe('unexpected errors', () => {
    it('should return 502 for non-VideoFetchError exceptions', async () => {
      mockFetchMetadata.mockRejectedValue(new Error('Something unexpected'));

      const request = createRequest({ url: 'https://www.youtube.com/watch?v=err', platform: 'youtube' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.code).toBe('NETWORK_ERROR');
      expect(data.error).toContain('unexpected');
    });
  });
});
