import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseProgressLine, enforceMonotonic } from '../download-manager';

/**
 * Property 7: Progress Value Invariant
 *
 * For any progress update emitted by the Download_Manager during a download,
 * the value SHALL be an integer in the range [0, 100] inclusive, and successive
 * progress values SHALL be monotonically non-decreasing.
 *
 * **Validates: Requirements 4.2**
 */
describe('Feature: video-downloader-site, Property 7: Progress Value Invariant', () => {
  /**
   * Generator that produces yt-dlp-style progress line strings
   * with random percentage values between 0 and 100.
   */
  const progressLineArb = fc.float({ min: 0, max: 100, noNaN: true }).map(
    (pct) =>
      `[download]  ${pct.toFixed(1)}% of ~50.00MiB at 2.50MiB/s ETA 00:10`
  );

  it('all parsed progress values are integers in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.array(progressLineArb, { minLength: 1, maxLength: 50 }),
        (lines) => {
          for (const line of lines) {
            const value = parseProgressLine(line);
            if (value !== null) {
              // Must be an integer
              expect(value).toBe(Math.floor(value));
              // Must be in [0, 100]
              expect(value).toBeGreaterThanOrEqual(0);
              expect(value).toBeLessThanOrEqual(100);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('successive progress values after enforceMonotonic are monotonically non-decreasing', () => {
    fc.assert(
      fc.property(
        fc.array(progressLineArb, { minLength: 2, maxLength: 50 }),
        (lines) => {
          let lastProgress = 0;
          const emittedValues: number[] = [];

          for (const line of lines) {
            const parsed = parseProgressLine(line);
            if (parsed !== null) {
              const monotonic = enforceMonotonic(parsed, lastProgress);
              if (monotonic !== null) {
                emittedValues.push(monotonic);
                lastProgress = monotonic;
              }
            }
          }

          // Verify monotonically non-decreasing
          for (let i = 1; i < emittedValues.length; i++) {
            expect(emittedValues[i]).toBeGreaterThanOrEqual(emittedValues[i - 1]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('progress values from arbitrary percentage sequences are always integers in [0, 100] and non-decreasing', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 100, noNaN: true }), {
          minLength: 5,
          maxLength: 100,
        }),
        (rawPercentages) => {
          let lastProgress = 0;
          const emittedValues: number[] = [];

          for (const pct of rawPercentages) {
            const line = `[download]  ${pct.toFixed(1)}% of ~50.00MiB at 2.50MiB/s ETA 00:10`;
            const parsed = parseProgressLine(line);

            if (parsed !== null) {
              // Property 1: All parsed values are integers in [0, 100]
              expect(parsed).toBe(Math.floor(parsed));
              expect(parsed).toBeGreaterThanOrEqual(0);
              expect(parsed).toBeLessThanOrEqual(100);

              const monotonic = enforceMonotonic(parsed, lastProgress);
              if (monotonic !== null) {
                emittedValues.push(monotonic);
                lastProgress = monotonic;
              }
            }
          }

          // Property 2: Emitted sequence is monotonically non-decreasing
          for (let i = 1; i < emittedValues.length; i++) {
            expect(emittedValues[i]).toBeGreaterThanOrEqual(emittedValues[i - 1]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
