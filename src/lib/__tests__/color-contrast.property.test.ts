import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property 8: Color Contrast Accessibility
 *
 * For any text/background color combination defined in the Sketchbook theme,
 * the computed contrast ratio SHALL be at least 4.5:1 for normal text
 * (below 18.66px bold or 24px regular) and at least 3:1 for large text.
 *
 * **Validates: Requirements 5.2**
 */

// Theme colors from the sketchbook design
const themeColors = {
  background: '#FFF8F0',
  surface: '#FFFDF9',
  primary: '#BF5540',
  secondary: '#7BB5A3',
  accent: '#F4C06F',
  text: '#3D3229',
  textMuted: '#756558',
  error: '#C04038',
  success: '#6BA87B',
  border: '#C4B5A4',
} as const;

// Color pairs used in the app for normal text (requires >= 4.5:1)
const normalTextPairs: Array<{ name: string; foreground: string; background: string }> = [
  { name: 'text on background', foreground: themeColors.text, background: themeColors.background },
  { name: 'text on surface', foreground: themeColors.text, background: themeColors.surface },
  { name: 'textMuted on background', foreground: themeColors.textMuted, background: themeColors.background },
];

// Color pairs used in the app for large text / headings (requires >= 3:1)
const largeTextPairs: Array<{ name: string; foreground: string; background: string }> = [
  { name: 'text on background (large)', foreground: themeColors.text, background: themeColors.background },
  { name: 'primary on background (large)', foreground: themeColors.primary, background: themeColors.background },
  { name: 'error on background (large)', foreground: themeColors.error, background: themeColors.background },
];

// Button text pairs (white on primary is normal text context)
const buttonTextPairs: Array<{ name: string; foreground: string; background: string }> = [
  { name: 'white on primary (button)', foreground: '#FFFFFF', background: themeColors.primary },
  { name: 'text on surface (button)', foreground: themeColors.text, background: themeColors.surface },
];

/**
 * Parse a hex color string to RGB components.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

/**
 * Compute relative luminance per WCAG 2.1 definition.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Compute contrast ratio between two colors per WCAG 2.1.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Feature: video-downloader-site, Property 8: Color Contrast Accessibility', () => {
  it('normal text color pairs have contrast ratio >= 4.5:1', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...normalTextPairs),
        (pair) => {
          const ratio = contrastRatio(pair.foreground, pair.background);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('large text color pairs have contrast ratio >= 3:1', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...largeTextPairs),
        (pair) => {
          const ratio = contrastRatio(pair.foreground, pair.background);
          expect(ratio).toBeGreaterThanOrEqual(3.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('button text color pairs have contrast ratio >= 4.5:1', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...buttonTextPairs),
        (pair) => {
          const ratio = contrastRatio(pair.foreground, pair.background);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
