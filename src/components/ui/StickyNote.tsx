'use client';

import React, { type ReactNode } from 'react';

export interface StickyNoteProps {
  children: ReactNode;
  color?: 'yellow' | 'sage' | 'terra';
  rotate?: number;
  className?: string;
}

/**
 * Decorative sticky note with Caveat handwritten font.
 * Irregular border-radius, soft shadow, slight rotation.
 */
export function StickyNote({ children, color = 'yellow', rotate = -3, className = '' }: StickyNoteProps) {
  const colors = {
    yellow: 'bg-[#F5E6BD]',
    sage: 'bg-[var(--color-sage-200)]',
    terra: 'bg-[var(--color-terra-200)]',
  };

  return (
    <div
      style={{
        transform: `rotate(${rotate}deg)`,
        fontFamily: 'var(--font-hand)',
        fontWeight: 500,
      }}
      className={`
        px-4 py-3.5
        text-[20px] leading-[1.15]
        text-[var(--color-ink-700)]
        rounded-[4px_14px_6px_12px]
        shadow-[0_14px_30px_-14px_rgba(31,27,22,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]
        ${colors[color]}
        ${className}
      `}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
