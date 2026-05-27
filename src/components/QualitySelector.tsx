'use client';

import React from 'react';
import { SketchBorder } from '@/components/SketchBorder';
import type { VideoQuality } from '@/types';

export interface QualitySelectorProps {
  options: VideoQuality[];
  onSelect: (formatId: string) => void;
  selectedId?: string;
}

/**
 * Formats bytes into a human-readable MB string.
 */
function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    return `~${mb.toFixed(1)}MB`;
  }
  return `~${Math.round(mb)}MB`;
}

/**
 * Parses the numeric resolution value from a resolution string like "1080p".
 */
function parseResolution(resolution: string): number {
  const match = resolution.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Sorts quality options from highest to lowest resolution.
 */
function sortByResolutionDesc(options: VideoQuality[]): VideoQuality[] {
  return [...options].sort(
    (a, b) => parseResolution(b.resolution) - parseResolution(a.resolution)
  );
}

/**
 * Quality selection component for YouTube videos with sketchbook-styled radio buttons.
 * Displays quality options sorted from highest to lowest resolution.
 * Skips rendering when only one quality option is available (Req 3.4).
 */
export function QualitySelector({ options, onSelect, selectedId }: QualitySelectorProps) {
  // Skip rendering when only one quality option is available (Req 3.4)
  if (options.length <= 1) {
    return null;
  }

  const sortedOptions = sortByResolutionDesc(options);

  // Pre-select the first (highest quality) option if no selectedId provided
  const activeId = selectedId ?? sortedOptions[0]?.formatId;

  return (
    <SketchBorder className="p-4 w-full">
      <fieldset>
        <legend className="font-heading text-2xl text-text mb-3">
          Choose Quality
        </legend>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Video quality options">
          {sortedOptions.map((option) => {
            const isSelected = option.formatId === activeId;

            return (
              <label
                key={option.formatId}
                className={`
                  flex items-center gap-3 p-3 rounded-sm cursor-pointer
                  transition-colors duration-200 ease-in-out
                  border-2 border-dashed
                  ${isSelected
                    ? 'border-primary bg-surface'
                    : 'border-border bg-background hover:border-secondary hover:bg-surface'
                  }
                `}
              >
                <input
                  type="radio"
                  name="quality-selector"
                  value={option.formatId}
                  checked={isSelected}
                  onChange={() => onSelect(option.formatId)}
                  className="
                    w-5 h-5 accent-primary cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                  "
                />
                <span className="flex flex-col font-body">
                  <span className="text-text font-semibold text-base">
                    {option.resolution}
                  </span>
                  <span className="text-text-muted text-sm">
                    {formatFileSize(option.fileSize)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </SketchBorder>
  );
}
