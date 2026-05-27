import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { VideoFetcher, VideoFetchError, MAX_DURATION_SECONDS } from '../video-fetcher';

/**
 * Property 5: Duration Boundary Enforcement
 *
 * For any video metadata with a duration value, the system SHALL accept videos
 * with duration ≤ 3600 seconds (60 minutes) and reject videos with duration > 3600 seconds,
 * with no false acceptances or rejections at the boundary.
 *
 * **Validates: Requirements 3.7**
 */

// Mock youtube-dl-exec
vi.mock('youtube-dl-exec', () => ({
  default: vi.fn(),
}));

import youtubeDlExec from 'youtube-dl-exec';
const mockYtDlp = vi.mocked(youtubeDlExec);

function mockYtDlpWithDuration(duration: number): void {
  mockYtDlp.mockResolvedValue({
    title: 'Test Video',
    duration,
    thumbnail: 'https://img.youtube.com/thumb.jpg',
    formats: [
      {
        format_id: '22',
        ext: 'mp4',
        height: 720,
        width: 1280,
        filesize: 45000000,
        vcodec: 'avc1',
        acodec: 'mp4a',
      },
    ],
  } as never);
}

describe('Feature: video-downloader-site, Property 5: Duration Boundary Enforcement', () => {
  let fetcher: VideoFetcher;

  beforeEach(() => {
    fetcher = new VideoFetcher();
    vi.clearAllMocks();
  });

  it('should accept videos with duration ≤ 3600 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: MAX_DURATION_SECONDS }), async (duration) => {
        mockYtDlpWithDuration(duration);

        const result = await fetcher.fetchMetadata(
          'https://www.youtube.com/watch?v=test123',
          'youtube'
        );

        expect(result.duration).toBe(duration);
        expect(result.title).toBe('Test Video');
      }),
      { numRuns: 100 }
    );
  });

  it('should reject videos with duration > 3600 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: MAX_DURATION_SECONDS + 1, max: 7200 }), async (duration) => {
        mockYtDlpWithDuration(duration);

        try {
          await fetcher.fetchMetadata(
            'https://www.youtube.com/watch?v=test123',
            'youtube'
          );
          // Should not reach here
          expect.fail('Expected VideoFetchError to be thrown');
        } catch (e) {
          expect(e).toBeInstanceOf(VideoFetchError);
          expect((e as VideoFetchError).code).toBe('DURATION_EXCEEDED');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should accept at exact boundary (3600 seconds) and reject at 3601 seconds', async () => {
    // Exact boundary: 3600 should be accepted
    mockYtDlpWithDuration(3600);
    const accepted = await fetcher.fetchMetadata(
      'https://www.youtube.com/watch?v=boundary',
      'youtube'
    );
    expect(accepted.duration).toBe(3600);

    // One above boundary: 3601 should be rejected
    mockYtDlpWithDuration(3601);
    try {
      await fetcher.fetchMetadata(
        'https://www.youtube.com/watch?v=boundary',
        'youtube'
      );
      expect.fail('Expected VideoFetchError to be thrown for duration 3601');
    } catch (e) {
      expect(e).toBeInstanceOf(VideoFetchError);
      expect((e as VideoFetchError).code).toBe('DURATION_EXCEEDED');
    }
  });

  it('should enforce boundary with durations focused around 3500-3700', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3500, max: 3700 }), async (duration) => {
        mockYtDlpWithDuration(duration);

        if (duration <= MAX_DURATION_SECONDS) {
          const result = await fetcher.fetchMetadata(
            'https://www.youtube.com/watch?v=test123',
            'youtube'
          );
          expect(result.duration).toBe(duration);
        } else {
          try {
            await fetcher.fetchMetadata(
              'https://www.youtube.com/watch?v=test123',
              'youtube'
            );
            expect.fail(`Expected VideoFetchError for duration ${duration}`);
          } catch (e) {
            expect(e).toBeInstanceOf(VideoFetchError);
            expect((e as VideoFetchError).code).toBe('DURATION_EXCEEDED');
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
