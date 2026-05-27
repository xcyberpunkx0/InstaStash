'use client';

import React from 'react';
import type { VideoQuality } from '@/types';

export interface QualitySelectorProps {
  options: VideoQuality[];
  onSelect: (formatId: string) => void;
  selectedId?: string;
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `~${mb.toFixed(1)}MB`;
  return `~${Math.round(mb)}MB`;
}

function parseResolution(resolution: string): number {
  const match = resolution.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function sortByResolutionDesc(options: VideoQuality[]): VideoQuality[] {
  return [...options].sort(
    (a, b) => parseResolution(b.resolution) - parseResolution(a.resolution)
  );
}

/**
 * Quality selection component following AuraVault design system.
 * Pill-shaped radio buttons sorted from highest to lowest resolution.
 */
export function QualitySelector({ options, onSelect, selectedId }: QualitySelectorProps) {
  if (options.length <= 1) return null;

  const sortedOptions = sortByResolutionDesc(options);
  const activeId = selectedId ?? sortedOptions[0]?.formatId;

  return (
    <div className="w-full">
      <fieldset>
        <legend className="font-[family-name:var(--font-display)] font-medium italic text-[22px] text-[var(--color-ink-900)] mb-3">
          Choose Quality
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Video quality options">
          {sortedOptions.map((option) => {
            const isSelected = option.formatId === activeId;

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
                    : 'bg-[var(--color-bg-surface)] text-[var(--color-ink-700)] border-[var(--color-line-medium)] hover:bg-[var(--color-paper-200)]'
                  }
                `}
              >
                <input
                  type="radio"
                  name="quality-selector"
                  value={option.formatId}
                  checked={isSelected}
                  onChange={() => onSelect(option.formatId)}
                  className="sr-only"
                />
                <span className="font-semibold">{option.resolution}</span>
                <span className={`text-[11px] font-[family-name:var(--font-mono)] ${isSelected ? 'text-[var(--color-paper-300)]' : 'text-[var(--color-ink-400)]'}`}>
                  {formatFileSize(option.fileSize)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
