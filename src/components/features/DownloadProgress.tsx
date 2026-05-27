'use client';

import React from 'react';

export interface DownloadProgressProps {
  percentage: number;
  totalSize?: number; // bytes
}

/**
 * Download progress matching the design system:
 * - "downloading..." in Caveat handwritten font (left)
 * - "42% · 18.3 / 43.2 MB" in JetBrains Mono (right)
 * - Thick terra→terra-600 progress bar
 * - When > 50%, show "Almost there" with circular ring and est. time
 */
export function DownloadProgressView({ percentage, totalSize }: DownloadProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  const totalMB = totalSize ? (totalSize / (1024 * 1024)).toFixed(1) : null;
  const downloadedMB = totalSize ? ((totalSize * clamped / 100) / (1024 * 1024)).toFixed(1) : null;

  return (
    <div className="w-full max-w-[680px] space-y-3">
      {/* Header row */}
      <div className="flex justify-between items-baseline">
        <span
          style={{ fontFamily: 'var(--font-hand)', fontWeight: 500 }}
          className="text-[24px] text-ink-700"
        >
          downloading...
        </span>
        <span className="font-mono text-small text-ink-700">
          {clamped}%{downloadedMB && totalMB && ` · ${downloadedMB} / ${totalMB} MB`}
        </span>
      </div>

      {/* Progress bar — thick, terra fill on paper-300 track */}
      <div
        className="relative h-3 w-full bg-paper-300 rounded-pill overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Download progress: ${clamped}%`}
      >
        <div
          className="absolute left-0 top-0 bottom-0 rounded-pill bg-linear-to-r from-terra-500 to-(--color-terra-600) shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-[width] duration-[240ms] ease-[var(--ease-paper)]"
          style={{ width: `${clamped}%` }}
        />
      </div>

      {/* Sub-status for second half */}
      {clamped > 50 && (
        <div className="flex items-center gap-3 pt-2">
          {/* Circular progress indicator */}
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-paper-300)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="var(--color-terra-500)" strokeWidth="3"
                strokeDasharray={`${clamped * 0.94} 94`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-(--color-ink-500)">
              {clamped}%
            </span>
          </div>
          <div>
            <div
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
              className="text-h3 leading-tight text-(--color-ink-900)"
            >
              Almost there
            </div>
            <div className="font-sans text-[13px] text-ink-400">
              est. {Math.max(1, Math.round((100 - clamped) * 0.3))}s remaining
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
