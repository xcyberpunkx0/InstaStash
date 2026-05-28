'use client';

import React from 'react';

export interface DownloadCompleteProps {
  filename?: string;
  onDownloadAnother?: () => void;
  onSaveAgain?: () => void;
}

/**
 * Success state shown after download completes.
 * Sage-colored checkmark with handwritten celebration text and "download another" CTA.
 */
export function DownloadComplete({ filename, onDownloadAnother, onSaveAgain }: DownloadCompleteProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-6" role="status" aria-live="polite">
      {/* Checkmark icon */}
      <div className="w-16 h-16 rounded-full bg-sage-200 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-sage-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <div className="text-center">
        <p
          style={{ fontFamily: 'var(--font-hand)', fontWeight: 500 }}
          className="text-[28px] text-sage-600 leading-none"
        >
          tucked away safely ✦
        </p>
        {filename && (
          <p className="mt-2 font-mono text-micro text-ink-400">
            {filename}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-2">
        {onSaveAgain && (
          <button
            type="button"
            onClick={onSaveAgain}
            className="
              inline-flex items-center gap-2
              px-5 py-2.5 rounded-pill
              bg-transparent border border-line-medium
              text-[var(--color-ink-700)]
              font-[family-name:var(--font-grotesk)] font-semibold text-[13px]
              cursor-pointer
              hover:bg-[var(--color-paper-200)] hover:translate-y-[-1px]
              active:translate-y-0
              transition-[transform,background-color] duration-[160ms] ease-[var(--ease-paper)]
            "
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
            </svg>
            Save again
          </button>
        )}
        {onDownloadAnother && (
          <button
            type="button"
            onClick={onDownloadAnother}
            className="
              inline-flex items-center gap-2
              px-5 py-2.5 rounded-[var(--radius-pill)]
              bg-[var(--color-ink-900)] text-[var(--color-paper-50)]
              font-[family-name:var(--font-grotesk)] font-semibold text-[13px]
              cursor-pointer border-0
              shadow-[0_8px_20px_-10px_rgba(31,27,22,0.45)]
              hover:translate-y-[-1px] hover:shadow-[0_14px_26px_-10px_rgba(31,27,22,0.5)]
              active:translate-y-0
              transition-[transform,box-shadow] duration-[160ms] ease-[var(--ease-paper)]
            "
          >
            Download another
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
