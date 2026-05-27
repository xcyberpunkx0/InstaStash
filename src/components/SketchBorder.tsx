'use client';

import React, { type ReactNode } from 'react';

export interface SketchBorderProps {
  children: ReactNode;
  className?: string;
  roughOptions?: unknown;
}

/**
 * Simple card wrapper following AuraVault design system.
 * Replaces the old Rough.js-based border with clean CSS.
 */
export function SketchBorder({ children, className = '' }: SketchBorderProps) {
  return (
    <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] border border-[var(--color-line-soft)] shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </div>
  );
}
