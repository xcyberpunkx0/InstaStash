'use client';

import React from 'react';

export interface ProgressBarProps {
  /** Progress percentage from 0 to 100 */
  value: number;
  /** Visual variant */
  variant?: 'terra' | 'sage';
  /** Accessible label */
  label?: string;
}

/**
 * Rounded progress bar with terra/sage gradient fill.
 * Follows AuraVault design: paper-300 track, terra gradient fill, pill shape.
 */
export function ProgressBar({ value, variant = 'terra', label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  const fillGradient = variant === 'terra'
    ? 'bg-gradient-to-r from-[var(--color-terra-500)] to-[var(--color-terra-600)]'
    : 'bg-[var(--color-sage-500)]';

  return (
    <div
      className="relative h-[6px] w-full bg-paper-300 rounded-pill overflow-hidden"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Progress: ${clamped}%`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 rounded-pill shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-[width] duration-240 ease-paper ${fillGradient}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
