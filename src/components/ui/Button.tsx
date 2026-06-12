'use client';

import React, { type ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Pill-shaped button following AuraVault design system.
 * Primary: ink-900 bg, paper-50 text
 * Secondary: transparent bg, ink border
 * Ghost: transparent, terra text
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base = `
    inline-flex items-center justify-center gap-2
    rounded-pill cursor-pointer
    font-grotesk font-semibold
    transition-transform duration-[160ms] ease-(--ease-paper)
    focus-visible:outline-2 focus-visible:outline-terra-500 focus-visible:outline-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  `;

  const variants = {
    primary: `
      bg-(--color-ink-900) text-(--color-paper-50)
      shadow-[0_8px_20px_-10px_rgba(31,27,22,0.45)]
      hover:translate-y-[-1px] hover:shadow-[0_14px_26px_-10px_rgba(31,27,22,0.5)]
      active:translate-y-0 active:shadow-[0_4px_10px_-6px_rgba(31,27,22,0.3)]
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
      active:bg-(--color-paper-300)
    `,
  };

  const sizes = {
    sm: 'px-4 py-2 text-micro',
    md: 'px-5 py-[10px] text-[13px]',
    lg: 'px-6 py-[14px] text-[15px]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
