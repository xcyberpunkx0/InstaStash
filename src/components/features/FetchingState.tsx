'use client';

import React from 'react';

/**
 * "Looking for the file..." state shown while detecting/fetching metadata.
 * Matches the design system: handwritten Caveat text on the left, dashes on the right,
 * dashed divider line, then a circular progress with "Almost there" copy.
 */
export function FetchingState({ message = 'looking for the file...' }: { message?: string }) {
  return (
    <div className="w-full max-w-[680px] space-y-4">
      <div className="flex justify-between items-baseline">
        <span
          style={{ fontFamily: 'var(--font-hand)', fontWeight: 500 }}
          className="text-[24px] text-(--color-ink-700)"
        >
          {message}
        </span>
        <span
          style={{ fontFamily: 'var(--font-hand)', fontWeight: 500 }}
          className="text-[20px] text-(--color-ink-300)"
        >
          — —
        </span>
      </div>

      {/* Dashed divider line */}
      <div
        className="h-px w-full"
        style={{
          backgroundImage: 'linear-gradient(to right, var(--color-line-medium) 50%, transparent 50%)',
          backgroundSize: '12px 1px',
          backgroundRepeat: 'repeat-x',
        }}
      />

      <div className="flex items-center gap-3">
        {/* Circular spinner */}
        <div className="relative w-10 h-10 shrink-0">
          <svg className="w-10 h-10 animate-spin" viewBox="0 0 36 36" style={{ animationDuration: '1.4s' }}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-paper-300)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke="var(--color-terra-500)" strokeWidth="3"
              strokeDasharray="20 94"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <div
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
            className="text-h3 leading-tight text-(--color-ink-900)"
          >
            One moment
          </div>
          <div className="font-sans text-[13px] text-(--color-ink-400)">
            fetching the video info...
          </div>
        </div>
      </div>
    </div>
  );
}
