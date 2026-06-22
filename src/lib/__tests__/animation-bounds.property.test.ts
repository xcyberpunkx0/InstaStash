import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { animationDurations } from '../rough-utils';

/**
 * Property 9: Animation Duration Bounds
 *
 * For any micro-animation defined on interactive elements,
 * the animation duration SHALL be between 100ms and 500ms inclusive.
 * (Updated to match InstaStash design system: 140ms / 240ms / 420ms)
 */
describe('Feature: video-downloader-site, Property 9: Animation Duration Bounds', () => {
  it('all animation durations are between 100ms and 500ms inclusive', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.entries(animationDurations)),
        ([name, duration]) => {
          expect(duration).toBeGreaterThanOrEqual(100);
          expect(duration).toBeLessThanOrEqual(500);
        }
      ),
      { numRuns: 100 }
    );
  });
});
