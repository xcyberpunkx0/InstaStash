'use client';

import React from 'react';
import { Button } from '@/components/ui';

export interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  countdown?: number;
}

/**
 * Friendly error display with optional retry.
 * Uses rouge color for the message, with a handwritten aside for countdown.
 */
export function ErrorDisplay({ message, onRetry, retryDisabled, countdown }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-5 text-center" role="alert">
      {/* Error icon */}
      <div className="w-12 h-12 rounded-full bg-[#F2D5D2] flex items-center justify-center">
        <svg
          className="w-5 h-5 text-rouge-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>

      <p className="font-sans text-[15px] text-rouge-500 max-w-[400px]">
        {message}
      </p>

      {countdown !== undefined && countdown > 0 && (
        <p className="font-hand text-[20px] text-(--color-ink-400)" aria-live="polite">
          retry in {countdown}s...
        </p>
      )}

      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} disabled={retryDisabled}>
          Try again
        </Button>
      )}
    </div>
  );
}
