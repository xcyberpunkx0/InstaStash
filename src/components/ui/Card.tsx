'use client';

import React, { type ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * Paper-textured card with soft shadow and optional hover lift.
 * Follows AuraVault design: paper-50 bg, grain texture, rounded-lg, warm shadow.
 */
export function Card({ children, className = '', hover = false }: CardProps) {
  const base = `
    bg-[var(--color-bg-surface)]
    bg-blend-multiply
    rounded-[var(--radius-lg)]
    border border-[var(--color-line-soft)]
    shadow-[var(--shadow-card)]
  `;

  const hoverStyles = hover
    ? 'transition-[transform,box-shadow] duration-[240ms] ease-[var(--ease-paper)] hover:translate-y-[-3px] hover:shadow-[var(--shadow-lift)]'
    : '';

  return (
    <div className={`${base} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}
