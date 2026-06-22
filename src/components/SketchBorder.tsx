'use client';

import React, { type ReactNode } from 'react';

export interface SketchBorderProps {
  children: ReactNode;
  className?: string;
  roughOptions?: unknown;
}

/**
 * Simple card wrapper following InstaStash design system.
 * Replaces the old Rough.js-based border with clean CSS.
 */
export function SketchBorder({ children, className = '' }: SketchBorderProps) {
  return (
    <div className={`relative bg-(--color-bg-surface) rounded-lg border border-line-soft shadow-(--shadow-card) ${className}`}>
      {children}
    </div>
  );
}
