import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PlatformDetector, isDetectError, isDetectSuccess } from '../platform-detector';

/**
 * Property 3: Invalid URL Rejection
 *
 * For any string that is either (a) composed entirely of whitespace characters,
 * (b) a URL on a supported platform domain that does not contain a valid video
 * identifier path, or (c) a URL from an unsupported domain, the Platform_Detector
 * SHALL return an error result and never produce a successful detection.
 *
 * **Validates: Requirements 1.4, 1.6, 2.5, 6.6**
 */
describe('Feature: video-downloader-site, Property 3: Invalid URL Rejection', () => {
  const detector = new PlatformDetector();

  it('rejects whitespace-only strings', () => {
    const whitespaceArb = fc
      .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 20 })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(whitespaceArb, (whitespaceStr) => {
        const result = detector.detect(whitespaceStr);
        expect(isDetectError(result)).toBe(true);
        expect(isDetectSuccess(result)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects supported domain with bad paths (Instagram)', () => {
    // Generate random path segments that don't match /p/{id} or /reel/{id} or /reels/{id}
    const alphanumChars = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
    const badInstagramPathArb = fc
      .array(fc.constantFrom(...alphanumChars), { minLength: 1, maxLength: 20 })
      .map((chars) => chars.join(''))
      .filter((path) => {
        const lower = path.toLowerCase();
        return lower !== 'p' && lower !== 'reel' && lower !== 'reels';
      });

    fc.assert(
      fc.property(
        fc.record({
          www: fc.constantFrom('www.', ''),
          path: badInstagramPathArb,
        }),
        ({ www, path }) => {
          const url = `https://${www}instagram.com/${path}`;
          const result = detector.detect(url);
          expect(isDetectError(result)).toBe(true);
          expect(isDetectSuccess(result)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects unsupported domains', () => {
    // Generate random domain names that are NOT instagram.com
    const alphanumChars = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
    const unsupportedDomainArb = fc
      .tuple(
        fc.array(fc.constantFrom(...alphanumChars), { minLength: 2, maxLength: 15 }).map((chars) => chars.join('')),
        fc.constantFrom('.com', '.org', '.net', '.io', '.co', '.tv')
      )
      .map(([name, tld]) => `${name}${tld}`)
      .filter((domain) => {
        const lower = domain.toLowerCase();
        return (
          lower !== 'instagram.com' &&
          !lower.endsWith('.instagram.com')
        );
      });

    const pathArb = fc
      .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789/-_'.split('')), { minLength: 0, maxLength: 30 })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(
        fc.record({
          domain: unsupportedDomainArb,
          path: pathArb,
        }),
        ({ domain, path }) => {
          const url = `https://${domain}/${path}`;
          const result = detector.detect(url);
          expect(isDetectError(result)).toBe(true);
          expect(isDetectSuccess(result)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
