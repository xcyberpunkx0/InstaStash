'use client';

import React from 'react';

export interface DownloadProgressProps {
  percentage: number;
  totalSize?: number; // bytes
  /** Real time-remaining from yt-dlp, e.g. "00:42". Absent when unknown. */
  eta?: string;
}

/** Turn a yt-dlp "mm:ss" / "hh:mm:ss" ETA into a friendly "1m 5s" string. */
function humanizeEta(eta?: string): string | null {
  if (!eta) return null;
  const parts = eta.split(':').map((p) => Number(p));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n))) return null;
  const secs = parts.reduce((acc, p) => acc * 60 + p, 0);
  if (secs <= 0) return null;
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * Download progress matching the design system:
 * - "downloading..." in Caveat handwritten font (left)
 * - "42% · 18.3 / 43.2 MB" in JetBrains Mono (right)
 * - Thick terra→terra-600 progress bar
 * - When > 50%, show "Almost there" with circular ring and est. time
 */
export function DownloadProgressView({ percentage, totalSize, eta }: DownloadProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  const totalMB = totalSize ? (totalSize / (1024 * 1024)).toFixed(1) : null;
  const downloadedMB = totalSize ? ((totalSize * clamped / 100) / (1024 * 1024)).toFixed(1) : null;
  const realEta = humanizeEta(eta);
  // 99%+ means the streams are downloaded and ffmpeg is muxing audio + video.
  const isMerging = clamped >= 99;
  const subStatus = isMerging
    ? 'merging audio + video…'
    : realEta
      ? `${realEta} remaining`
      : `est. ${Math.max(1, Math.round((100 - clamped) * 0.3))}s remaining`;

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
          {!isMerging && realEta && ` · ${realEta} left`}
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
          className="absolute left-0 top-0 bottom-0 rounded-pill bg-linear-to-r from-terra-500 to-(--color-terra-600) shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-[width] duration-[240ms] ease-(--ease-paper)"
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
              {isMerging ? 'Almost done' : 'Almost there'}
            </div>
            <div className="font-sans text-[13px] text-ink-400">
              {subStatus}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
