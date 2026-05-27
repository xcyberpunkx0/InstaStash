'use client';

import React, { useState } from 'react';
import type { VideoQuality } from '@/types';

export interface VideoDetailsProps {
  title: string;
  formats: VideoQuality[];
  onDownload: (formatId: string) => void;
  url: string;
}

/**
 * After URL detection: shows the URL in mono, file name field, and quality dropdown.
 * Matches the design system screenshot: recessed paper fields, grotesk labels.
 */
export function VideoDetails({ title, formats, onDownload, url }: VideoDetailsProps) {
  const [selectedFormat, setSelectedFormat] = useState(formats[0]?.formatId ?? 'best');

  const selectedOption = formats.find(f => f.formatId === selectedFormat) ?? formats[0];
  const resolution = selectedOption?.resolution ?? '1080p';
  const sizeMB = selectedOption ? Math.round(selectedOption.fileSize / (1024 * 1024)) : 0;

  return (
    <div className="w-full max-w-[680px] space-y-4">
      {/* URL display in the pill bar */}
      <div className="flex items-center gap-2 py-2 pl-6 pr-2 bg-[var(--color-bg-surface)] rounded-[var(--radius-pill)] border border-[var(--color-line-medium)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_22px_50px_-22px_rgba(31,27,22,0.30)]">
        {/* Link icon */}
        <svg className="w-[18px] h-[18px] text-[var(--color-ink-300)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" x2="16" y1="12" y2="12" />
        </svg>
        {/* URL in mono — https:// lighter */}
        <div className="flex-1 py-[14px] font-[family-name:var(--font-mono)] text-[16px] truncate">
          <span className="text-[var(--color-ink-300)]">https://</span>
          <span className="text-[var(--color-ink-900)]">{url.replace(/^https?:\/\//, '')}</span>
        </div>
        {/* Download button */}
        <button
          type="button"
          onClick={() => onDownload(selectedFormat)}
          className="inline-flex items-center gap-2 px-6 py-[14px] rounded-[var(--radius-pill)] bg-[var(--color-ink-900)] text-[var(--color-paper-50)] font-[family-name:var(--font-grotesk)] font-semibold text-[15px] cursor-pointer border-0 shadow-[0_8px_20px_-10px_rgba(31,27,22,0.45)] hover:translate-y-[-1px] hover:shadow-[0_14px_26px_-10px_rgba(31,27,22,0.5)] active:translate-y-0 transition-[transform,box-shadow] duration-[160ms] ease-[var(--ease-paper)] shrink-0"
        >
          Download
          <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        </button>
      </div>

      {/* File name + Quality row */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
        {/* File name field */}
        <div>
          <label className="block font-[family-name:var(--font-grotesk)] font-semibold text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-400)] mb-2">
            File name
          </label>
          <div className="px-4 py-3 bg-[var(--color-bg-recessed)] rounded-[var(--radius-md)] font-[family-name:var(--font-mono)] text-[15px] text-[var(--color-ink-900)] truncate">
            {title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
          </div>
        </div>

        {/* Quality dropdown */}
        <div className="relative">
          <label className="block font-[family-name:var(--font-grotesk)] font-semibold text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-400)] mb-2">
            Quality
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            aria-label="Choose video quality"
            className="
              px-4 py-3 pr-10
              bg-[var(--color-bg-recessed)] rounded-[var(--radius-md)]
              font-[family-name:var(--font-mono)] text-[15px] text-[var(--color-ink-900)]
              border border-[var(--color-line-medium)] outline-none cursor-pointer
              hover:border-[var(--color-terra-500)] hover:bg-[var(--color-paper-200)]
              focus:border-[var(--color-terra-500)]
              transition-colors duration-[160ms]
              appearance-none
              bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23C97B4E%22 stroke-width=%222.25%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')]
              bg-no-repeat bg-[position:right_12px_center]
            "
          >
            {formats.map((f) => (
              <option key={f.formatId} value={f.formatId}>
                {f.resolution} · mp4
              </option>
            ))}
          </select>
          {/* Hand-drawn hint — clarifies that this is a dropdown */}
          <span
            aria-hidden="true"
            style={{ fontFamily: 'var(--font-hand)', transform: 'rotate(-3deg)' }}
            className="absolute -top-1 -right-2 sm:right-auto sm:-left-[120px] sm:top-9 inline-flex items-center gap-1 text-[18px] text-[var(--color-terra-600)] whitespace-nowrap pointer-events-none select-none"
          >
            <svg className="hidden sm:block w-7 h-5 -rotate-12" viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12 C 14 4, 30 20, 56 12" />
              <path d="m50 6 6 6-6 6" />
            </svg>
            tap to change ✦
          </span>
        </div>
      </div>

      {/* Format chips */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-paper-200)] border border-[var(--color-line-soft)] font-[family-name:var(--font-sans)] text-[12px] text-[var(--color-ink-700)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-400)]" />
          {resolution}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-paper-200)] border border-[var(--color-line-soft)] font-[family-name:var(--font-sans)] text-[12px] text-[var(--color-ink-700)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-400)]" />
          mp4
        </span>
        {sizeMB > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-paper-200)] border border-[var(--color-line-soft)] font-[family-name:var(--font-sans)] text-[12px] text-[var(--color-ink-700)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-400)]" />
            {sizeMB} MB
          </span>
        )}
      </div>
    </div>
  );
}
