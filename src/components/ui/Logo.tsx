'use client';

import React from 'react';

/**
 * AuraVault wordmark + mark, theme-aware.
 *
 * The notebook glyph paints with `currentColor` (ink) and the script "A"
 * arc paints with the theme accent token. Use the parent's text color to
 * change ink (`text-[var(--color-ink-900)]` etc.).
 *
 *   <Logo />            → full lockup (mark + wordmark)
 *   <Logo wordmark={false} /> → just the journal mark
 */

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  /** Show the "AuraVault" wordmark beside the journal mark. Default true. */
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
        {/* "A" inked on the left page */}
        <path
          d="M11 30 L 16 14 L 21 30 M 12.5 24 L 19.5 24"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Aura arc + dot — theme accent */}
        <path
          d="M28 30 C 28 22, 32 18, 36 18 C 39.5 18, 38 28, 32 30 C 28 31, 27 26, 30 24"
          stroke="var(--color-terra-500)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="36" cy="18" r="1.6" fill="var(--color-terra-500)" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 64"
      fill="none"
      className={className}
      aria-label="AuraVault"
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
          d="M11 30 L 16 14 L 21 30 M 12.5 24 L 19.5 24"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M28 30 C 28 22, 32 18, 36 18 C 39.5 18, 38 28, 32 30 C 28 31, 27 26, 30 24"
          stroke="var(--color-terra-500)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="36" cy="18" r="1.4" fill="var(--color-terra-500)" />
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
          AuraVault
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
