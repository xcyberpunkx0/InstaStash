'use client';

import React from 'react';
import { ProgressBar } from '@/components/ui';
import { Button } from '@/components/ui';

export interface DownloadProgressProps {
  percentage: number;
  status: 'downloading' | 'complete' | 'error';
  onRetry?: () => void;
}

/**
 * Download progress display following AuraVault design system.
 * Shows progress bar, completion state, or error state.
 */
export function DownloadProgress({ percentage, status, onRetry }: DownloadProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));

  if (status === 'complete') {
    return (
      <div className="flex flex-col items-center gap-3 py-6" data-testid="download-progress-complete">
        <div className="w-16 h-16 rounded-full bg-[var(--color-sage-200)] flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--color-sage-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="font-[family-name:var(--font-hand)] text-[26px] text-[var(--color-sage-600)]">
          Download complete ✦
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-6" data-testid="download-progress-error">
        <div className="w-12 h-12 rounded-full bg-[#F2D5D2] flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--color-rouge-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-[15px] text-[var(--color-rouge-500)]">Something went wrong during download.</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2" data-testid="download-progress-downloading" role="region" aria-label="Download progress">
      <div className="flex justify-between items-center">
        <span className="text-[14px] text-[var(--color-ink-500)]">Downloading...</span>
        <span className="font-[family-name:var(--font-mono)] text-[14px] text-[var(--color-ink-900)]">
          {clamped}%
        </span>
      </div>
      <ProgressBar value={clamped} label={`Download progress: ${clamped}%`} />
    </div>
  );
}
