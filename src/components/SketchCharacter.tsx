'use client';

import React from 'react';

export interface SketchCharacterProps {
  mood: 'idle' | 'thinking' | 'happy' | 'sad' | 'error';
}

const moodLabels: Record<SketchCharacterProps['mood'], string> = {
  idle: 'Character with a neutral expression',
  thinking: 'Character thinking',
  happy: 'Character smiling',
  sad: 'Character looking sad',
  error: 'Character showing an error',
};

/**
 * Simple SVG character that changes expression based on mood.
 * Redesigned to use clean SVG without Rough.js dependency.
 */
export function SketchCharacter({ mood }: SketchCharacterProps) {
  const colors = {
    face: 'var(--color-paper-200)',
    stroke: 'var(--color-ink-700)',
    accent: 'var(--color-terra-500)',
    error: 'var(--color-rouge-500)',
    success: 'var(--color-sage-500)',
  };

  return (
    <svg
      width={64}
      height={64}
      viewBox="0 0 64 64"
      aria-label={moodLabels[mood]}
      role="img"
      className="shrink-0"
    >
      {/* Face */}
      <circle cx="32" cy="32" r="24" fill={colors.face} stroke={colors.stroke} strokeWidth="2" strokeDasharray="3 1.5" />

      {mood === 'idle' && (
        <>
          <circle cx="24" cy="28" r="3" fill={colors.stroke} />
          <circle cx="40" cy="28" r="3" fill={colors.stroke} />
          <path d="M24 38 h16" stroke={colors.stroke} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )}

      {mood === 'thinking' && (
        <>
          <circle cx="24" cy="28" r="3" fill={colors.stroke} />
          <circle cx="40" cy="26" r="3" fill={colors.stroke} />
          <path d="M40 20 a6 3 0 0 1 0 -4" stroke={colors.stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M26 38 q6 4 12 0" stroke={colors.stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="46" cy="12" r="2" fill={colors.accent} />
          <circle cx="50" cy="8" r="1.5" fill={colors.accent} />
        </>
      )}

      {mood === 'happy' && (
        <>
          <path d="M20 27 a5 3 0 0 0 8 0" stroke={colors.stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M36 27 a5 3 0 0 0 8 0" stroke={colors.stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M22 36 q10 10 20 0" stroke={colors.stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M10 16 l0 -4 m-2 2 l4 0" stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M52 14 l0 -4 m-2 2 l4 0" stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}

      {mood === 'sad' && (
        <>
          <circle cx="24" cy="28" r="3" fill={colors.stroke} />
          <circle cx="40" cy="28" r="3" fill={colors.stroke} />
          <path d="M24 40 q8 -6 16 0" stroke={colors.stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="20" cy="34" rx="2" ry="3" fill={colors.accent} opacity="0.6" />
        </>
      )}

      {mood === 'error' && (
        <>
          <path d="M20 24 l8 8 m0 -8 l-8 8" stroke={colors.error} strokeWidth="2" strokeLinecap="round" />
          <path d="M36 24 l8 8 m0 -8 l-8 8" stroke={colors.error} strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="32" cy="42" rx="5" ry="4" stroke={colors.error} strokeWidth="1.5" fill="none" />
          <path d="M32 8 v-4" stroke={colors.error} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="11" r="1.5" fill={colors.error} />
        </>
      )}
    </svg>
  );
}
