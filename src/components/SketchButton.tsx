'use client';

import React, { type ButtonHTMLAttributes } from 'react';

export interface SketchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

/**
 * Button component following InstaStash design system.
 * Pill-shaped with warm shadows and subtle hover lift.
 * Replaces the old Rough.js-based button.
 */
export function SketchButton({
  children,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: SketchButtonProps) {
  const base = `
    inline-flex items-center justify-center gap-2
    px-5 py-2.5 rounded-pill
    font-grotesk font-semibold text-[13px]
    cursor-pointer border-0
    transition-[transform,box-shadow] duration-[160ms] ease-(--ease-paper)
    focus-visible:outline-2 focus-visible:outline-terra-500 focus-visible:outline-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  `;

  const variants = {
    primary: `
      bg-(--color-ink-900) text-(--color-paper-50)
      shadow-[0_8px_20px_-10px_rgba(31,27,22,0.45)]
      hover:translate-y-[-1px] hover:shadow-[0_14px_26px_-10px_rgba(31,27,22,0.5)]
      active:translate-y-0
    `,
    secondary: `
      bg-transparent text-(--color-ink-700)
      border border-line-medium
      hover:bg-(--color-paper-200) hover:translate-y-[-1px]
      active:translate-y-0
    `,
    ghost: `
      bg-transparent text-terra-600
      hover:bg-(--color-paper-200)
    `,
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
