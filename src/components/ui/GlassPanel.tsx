'use client';

import React, { type ReactNode } from 'react';

export interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * Frosted glass panel for floating overlays.
 * Uses --color-bg-glass + --shadow-glass design tokens.
 */
export function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return (
    <div
      className={`
        bg-[var(--color-bg-glass)]
        backdrop-blur-[18px] backdrop-saturate-[1.05]
        border border-[var(--color-line-soft)]
        shadow-[var(--shadow-glass)]
        rounded-[var(--radius-xl)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
