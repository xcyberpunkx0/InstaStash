'use client';

import React from 'react';

export type StatusPillVariant = 'downloading' | 'queued' | 'complete' | 'error';

export interface StatusPillProps {
  variant: StatusPillVariant;
  children: React.ReactNode;
}

/**
 * Small status indicator pill with colored dot.
 * Follows InstaStash design: grotesk font, rounded-pill, colored backgrounds.
 */
export function StatusPill({ variant, children }: StatusPillProps) {
  const styles: Record<StatusPillVariant, { pill: string; dot: string }> = {
    downloading: {
      pill: 'bg-terra-200 text-terra-600',
      dot: 'bg-terra-500',
    },
    queued: {
      pill: 'bg-(--color-paper-300) text-(--color-ink-500)',
      dot: 'bg-(--color-ink-400)',
    },
    complete: {
      pill: 'bg-sage-200 text-sage-600',
      dot: 'bg-sage-500',
    },
    error: {
      pill: 'bg-[#F2D5D2] text-rouge-500',
      dot: 'bg-rouge-500',
    },
  };

  const { pill, dot } = styles[variant];

  return (
    <span
      className={`inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-pill font-grotesk font-semibold text-[10px] tracking-[0.06em] ${pill}`}
    >
      <span className={`w-[5px] h-[5px] rounded-full ${dot}`} aria-hidden="true" />
      {children}
    </span>
  );
}
