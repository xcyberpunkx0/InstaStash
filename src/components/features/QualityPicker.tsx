'use client';

import React from 'react';
import type { VideoQuality } from '@/types';

export interface QualityPickerProps {
  options: VideoQuality[];
  onSelect: (formatId: string) => void;
  selectedId?: string;
}

/**
 * Quality selection for YouTube videos.
 * Displays options as pill-shaped radio buttons sorted by resolution.
 * Skips rendering when only one option is available.
 */
export function QualityPicker({ options, onSelect, selectedId }: QualityPickerProps) {
  if (options.length <= 1) return null;

  const sorted = [...options].sort((a, b) => {
    const aRes = parseInt(a.resolution) || 0;
    const bRes = parseInt(b.resolution) || 0;
    return bRes - aRes;
  });

  const activeId = selectedId ?? sorted[0]?.formatId;

  return (
    <div className="w-full">
      <h3 className="font-[family-name:var(--font-display)] font-medium italic text-[22px] text-[var(--color-ink-900)] mb-3">
        Choose quality
      </h3>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Video quality options">
        {sorted.map((option) => {
          const isSelected = option.formatId === activeId;
          const sizeMB = Math.round(option.fileSize / (1024 * 1024));

          return (
            <label
              key={option.formatId}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5
                rounded-[var(--radius-pill)] cursor-pointer
                font-[family-name:var(--font-grotesk)] font-medium text-[13px]
                border transition-all duration-[160ms] ease-[var(--ease-paper)]
                ${isSelected
                  ? 'bg-[var(--color-ink-900)] text-[var(--color-paper-50)] border-[var(--color-ink-900)] shadow-[0_4px_10px_-4px_rgba(31,27,22,0.35)]'
                  : 'bg-[var(--color-bg-surface)] text-[var(--color-ink-700)] border-[var(--color-line-medium)] hover:bg-[var(--color-paper-200)] hover:border-[var(--color-ink-300)]'
                }
              `}
            >
              <input
                type="radio"
                name="quality"
                value={option.formatId}
                checked={isSelected}
                onChange={() => onSelect(option.formatId)}
                className="sr-only"
              />
              <span className="font-semibold">{option.resolution}</span>
              {sizeMB > 0 && (
                <span className={`text-[11px] font-[family-name:var(--font-mono)] ${isSelected ? 'text-[var(--color-paper-300)]' : 'text-[var(--color-ink-400)]'}`}>
                  ~{sizeMB}MB
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
