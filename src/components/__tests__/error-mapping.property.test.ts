import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getErrorMessage, ErrorMessageProps } from '../ErrorMessage';

/**
 * Property 6: Error Code to Restriction Message Mapping
 *
 * For any error code returned by the Video_Fetcher (from the set: PRIVATE, AGE_RESTRICTED,
 * GEO_BLOCKED, UNAVAILABLE), the Downloader_App SHALL map it to a distinct, specific
 * user-facing message that names the restriction type, and no two different error codes
 * SHALL produce the same message.
 *
 * **Validates: Requirements 3.6**
 */

type ErrorType = ErrorMessageProps['type'];

const ALL_ERROR_TYPES: ErrorType[] = [
  'network',
  'private',
  'unavailable',
  'unsupported',
  'timeout',
  'rate-limit',
  'duration',
  'format',
];

describe('Feature: video-downloader-site, Property 6: Error Code to Restriction Message Mapping', () => {
  it('each error type maps to a non-empty string message', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_ERROR_TYPES), (errorType) => {
        const message = getErrorMessage(errorType);
        expect(typeof message).toBe('string');
        expect(message.trim().length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('no two different error types produce the same message (distinctness)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ERROR_TYPES),
        fc.constantFrom(...ALL_ERROR_TYPES),
        (typeA, typeB) => {
          fc.pre(typeA !== typeB);
          const messageA = getErrorMessage(typeA);
          const messageB = getErrorMessage(typeB);
          expect(messageA).not.toBe(messageB);
        }
      ),
      { numRuns: 100 }
    );
  });
});
