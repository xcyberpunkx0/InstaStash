'use client';

import React from 'react';

/**
 * InstaStash wordmark + mark, theme-aware.
 *
 * The notebook glyph paints with `currentColor` (ink) and the script "A"
 * arc paints with the theme accent token. Use the parent's text color to
 * change ink (`text-(--color-ink-900)` etc.).
 *
 *   <Logo />            → full lockup (mark + wordmark)
 *   <Logo wordmark={false} /> → just the journal mark
 */

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  /** Show the "InstaStash" wordmark beside the journal mark. Default true. */
  wordmark?: boolean;
}

export function Logo({ wordmark = true, className, ...rest }: LogoProps) {
  if (!wordmark) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        aria-hidden={rest['aria-hidden'] ?? true}
        {...rest}
      >
        {/* Notebook outline — paper fill, ink stroke */}
        <path
          d="M6 6 C 6 4, 8 2, 10 2 L 38 2 C 40 2, 42 4, 42 6 L 42 44 C 42 46, 40 48, 38 48 L 10 48 C 8 48, 6 46, 6 44 Z"
          fill="var(--color-bg-surface)"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        {/* Spine seam */}
        <line x1="24" y1="2" x2="24" y2="48" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        {/* "I" inked on the left page */}
        <path
          d="M16 14 L 16 30 M 12.5 14 L 19.5 14 M 12.5 30 L 19.5 30"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Letter "S" — theme accent */}
        <path
          d="M36 17 C 35 15, 33 14, 31.5 14 C 29 14, 28 15.5, 28 17.5 C 28 20, 30.5 21, 32 22 C 33.5 23, 36 24, 36 26.5 C 36 28.5, 34.5 30, 32 30 C 30 30, 28.5 29, 28 27"
          stroke="var(--color-terra-500)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 64"
      fill="none"
      className={className}
      aria-label="InstaStash"
      role="img"
      {...rest}
    >
      <g transform="translate(4 8)">
        {/* Soft drop shadow under the notebook */}
        <ellipse cx="24" cy="46" rx="22" ry="2.5" fill="currentColor" fillOpacity="0.10" />
        {/* Notebook */}
        <path
          d="M6 6 C 6 4, 8 2, 10 2 L 38 2 C 40 2, 42 4, 42 6 L 42 44 C 42 46, 40 48, 38 48 L 10 48 C 8 48, 6 46, 6 44 Z"
          fill="var(--color-bg-surface)"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <line x1="24" y1="2" x2="24" y2="48" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        <path
          d="M16 14 L 16 30 M 12.5 14 L 19.5 14 M 12.5 30 L 19.5 30"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M36 17 C 35 15, 33 14, 31.5 14 C 29 14, 28 15.5, 28 17.5 C 28 20, 30.5 21, 32 22 C 33.5 23, 36 24, 36 26.5 C 36 28.5, 34.5 30, 32 30 C 30 30, 28.5 29, 28 27"
          stroke="var(--color-terra-500)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        
      </g>

      <g transform="translate(60 0)">
        <text
          x="0"
          y="40"
          fontFamily="var(--font-display), 'Cormorant Garamond', 'EB Garamond', Georgia, serif"
          fontSize="34"
          fontWeight="500"
          fontStyle="italic"
          fill="currentColor"
          letterSpacing="-0.5"
        >
          InstaStash
        </text>
        {/* Sketch underline — theme accent */}
        <path
          d="M2 49 C 30 46, 80 50, 140 47"
          stroke="var(--color-terra-500)"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
      </g>
    </svg>
  );
}
