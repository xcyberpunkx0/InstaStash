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
        bg-(--color-bg-glass)
        backdrop-blur-[18px] backdrop-saturate-[1.05]
        border border-line-soft
        shadow-(--shadow-glass)
        rounded-xl
        ${className}
      `}
    >
      {children}
    </div>
  );
}
