import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { animationDurations } from '../rough-utils';

/**
 * Property 9: Animation Duration Bounds
 *
 * For any micro-animation defined on interactive elements in the Sketchbook_UI,
 * the animation duration SHALL be between 150ms and 400ms inclusive.
 *
 * **Validates: Requirements 5.4**
 */
describe('Feature: video-downloader-site, Property 9: Animation Duration Bounds', () => {
  it('all animation durations are between 150ms and 400ms inclusive', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.entries(animationDurations)),
        ([name, duration]) => {
          expect(duration).toBeGreaterThanOrEqual(150);
          expect(duration).toBeLessThanOrEqual(400);
        }
      ),
      { numRuns: 100 }
    );
  });
});
