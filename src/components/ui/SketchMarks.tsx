'use client';

import React from 'react';

/**
 * Themeable inline SVG sketch marks.
 *
 * Every stroke uses `currentColor`, so they automatically pick up the
 * surrounding text color (e.g. `text-[var(--color-terra-500)]`,
 * `text-[var(--color-ink-700)]`, etc.). This way the marks adapt to any
 * theme — including dark themes — without us having to ship per-theme
 * SVG files.
 */

type DecorProps = Omit<React.SVGProps<SVGSVGElement>, 'opacity'> & {
  /**
   * Optional opacity (0–1) applied to the strokes. Extracted before the
   * remaining props are spread onto the <svg> so React never tries to
   * forward this custom prop as a DOM attribute.
   */
  decorOpacity?: number;
};

// ─── Sketch arrow ──────────────────────────────────────────────────────────

export function SketchArrow({ decorOpacity = 1, ...rest }: DecorProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 40"
      fill="none"
      aria-hidden={rest['aria-hidden'] ?? true}
      {...rest}
    >
      <path
        d="M4 22 C 28 6, 50 32, 78 16 C 90 10, 102 14, 110 22"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"
        opacity={decorOpacity}
      />
      <path
        d="M110 22 L 102 17 M 110 22 L 104 28"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"
        opacity={decorOpacity}
      />
    </svg>
  );
}

// ─── Sketch star ───────────────────────────────────────────────────────────

export function SketchStar({ decorOpacity = 1, ...rest }: DecorProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden={rest['aria-hidden'] ?? true}
      {...rest}
    >
      <path
        d="M20 4 L 22.6 14.4 L 33 15 L 24.6 21.6 L 27.4 32 L 20 25.6 L 12.6 32 L 15.4 21.6 L 7 15 L 17.4 14.4 Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"
        opacity={decorOpacity}
      />
    </svg>
  );
}

// ─── Doodle spiral ─────────────────────────────────────────────────────────

export function DoodleSpiral({ decorOpacity = 0.85, ...rest }: DecorProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden={rest['aria-hidden'] ?? true}
      {...rest}
    >
      <path
        d="M40 40 m -2 0 a 2 2 0 1 1 4 0 a 6 6 0 1 1 -10 -2 a 12 12 0 1 1 22 4 a 20 20 0 1 1 -34 -8 a 28 28 0 1 1 50 10"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"
        opacity={decorOpacity}
      />
    </svg>
  );
}

// ─── Doodle circles ────────────────────────────────────────────────────────

export function DoodleCircles({ decorOpacity = 1, ...rest }: DecorProps) {
  const o = decorOpacity;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 60"
      fill="none"
      aria-hidden={rest['aria-hidden'] ?? true}
      {...rest}
    >
      <circle cx="30" cy="30" r="10" stroke="currentColor" strokeWidth="1.2" fill="none" opacity={0.55 * o} />
      <circle cx="22" cy="26" r="10" stroke="currentColor" strokeWidth="1.2" fill="none" opacity={0.4 * o} />
      <circle cx="38" cy="26" r="10" stroke="currentColor" strokeWidth="1.2" fill="none" opacity={0.4 * o} />
      <circle cx="22" cy="34" r="10" stroke="currentColor" strokeWidth="1.2" fill="none" opacity={0.4 * o} />
      <circle cx="38" cy="34" r="10" stroke="currentColor" strokeWidth="1.2" fill="none" opacity={0.4 * o} />
    </svg>
  );
}

// ─── Sketch underline ──────────────────────────────────────────────────────

export function SketchUnderline({ decorOpacity = 1, ...rest }: DecorProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 12"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden={rest['aria-hidden'] ?? true}
      {...rest}
    >
      <path
        d="M3 6 C 24 2, 56 10, 88 5 S 142 9, 178 5 196 7, 198 6"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"
        opacity={decorOpacity}
      />
    </svg>
  );
}
