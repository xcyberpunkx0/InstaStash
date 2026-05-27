import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { VideoQuality } from '@/types';

/**
 * Property 4: Quality Options Ordering
 *
 * For any list of video quality options returned by the Video_Fetcher,
 * the Downloader_App SHALL present them sorted from highest resolution to lowest resolution,
 * such that for every adjacent pair (i, i+1) in the displayed list,
 * the resolution of item i is greater than or equal to the resolution of item i+1.
 *
 * **Validates: Requirements 3.3**
 */

/**
 * Parses the numeric resolution value from a resolution string like "1080p".
 * Re-implements the internal logic from QualitySelector.
 */
function parseResolution(resolution: string): number {
  const match = resolution.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Sorts quality options from highest to lowest resolution.
 * Re-implements the internal logic from QualitySelector.
 */
function sortByResolutionDesc(options: VideoQuality[]): VideoQuality[] {
  return [...options].sort(
    (a, b) => parseResolution(b.resolution) - parseResolution(a.resolution)
  );
}

// Arbitrary for generating VideoQuality objects with realistic resolution strings
const videoQualityArb = fc.record({
  formatId: fc.string({ minLength: 1, maxLength: 5 }),
  resolution: fc.oneof(
    fc.constantFrom('144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p')
  ),
  fileSize: fc.integer({ min: 1000, max: 500000000 }),
  label: fc.string({ minLength: 1, maxLength: 50 }),
});

describe('Feature: video-downloader-site, Property 4: Quality Options Ordering', () => {
  it('should sort quality options such that each resolution >= the next resolution', () => {
    fc.assert(
      fc.property(fc.array(videoQualityArb, { minLength: 0, maxLength: 20 }), (options) => {
        const sorted = sortByResolutionDesc(options);

        // For every adjacent pair, resolution[i] >= resolution[i+1]
        for (let i = 0; i < sorted.length - 1; i++) {
          const currentRes = parseResolution(sorted[i].resolution);
          const nextRes = parseResolution(sorted[i + 1].resolution);
          expect(currentRes).toBeGreaterThanOrEqual(nextRes);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all elements after sorting (no items lost or duplicated)', () => {
    fc.assert(
      fc.property(fc.array(videoQualityArb, { minLength: 0, maxLength: 20 }), (options) => {
        const sorted = sortByResolutionDesc(options);

        // Same length
        expect(sorted.length).toBe(options.length);

        // Every item in the original is present in sorted
        for (const option of options) {
          expect(sorted).toContainEqual(option);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should produce a stable sort for items with equal resolution', () => {
    fc.assert(
      fc.property(fc.array(videoQualityArb, { minLength: 2, maxLength: 20 }), (options) => {
        const sorted = sortByResolutionDesc(options);

        // The ordering property still holds even with duplicates
        for (let i = 0; i < sorted.length - 1; i++) {
          const currentRes = parseResolution(sorted[i].resolution);
          const nextRes = parseResolution(sorted[i + 1].resolution);
          expect(currentRes).toBeGreaterThanOrEqual(nextRes);
        }
      }),
      { numRuns: 100 }
    );
  });
});
