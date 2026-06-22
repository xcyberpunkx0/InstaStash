'use client';

import React, { type ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * Paper-textured card with soft shadow and optional hover lift.
 * Follows InstaStash design: paper-50 bg, grain texture, rounded-lg, warm shadow.
 */
export function Card({ children, className = '', hover = false }: CardProps) {
  const base = `
    bg-(--color-bg-surface)
    bg-blend-multiply
    rounded-lg
    border border-line-soft
    shadow-(--shadow-card)
  `;

  const hoverStyles = hover
    ? 'transition-[transform,box-shadow] duration-[240ms] ease-(--ease-paper) hover:translate-y-[-3px] hover:shadow-(--shadow-lift)'
    : '';

  return (
    <div className={`${base} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}
