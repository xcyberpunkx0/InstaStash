'use client';

import React from 'react';

const platforms = [
  { name: 'YouTube', icon: '▶' },
  { name: 'Instagram', icon: '◎' },
  { name: 'TikTok', icon: '♪' },
  { name: 'Vimeo', icon: '▷' },
  { name: 'Twitter/X', icon: '✕' },
  { name: '70+ more', icon: '…' },
];

/**
 * Displays supported platforms as small pills.
 * Decorative section showing breadth of platform support.
 */
export function SupportedPlatforms() {
  return (
    <div className="flex flex-wrap items-center gap-2 justify-center">
      {platforms.map((p) => (
        <span
          key={p.name}
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5
            rounded-[var(--radius-pill)]
            bg-[var(--color-bg-surface)]
            border border-[var(--color-line-soft)]
            font-[family-name:var(--font-sans)] text-[13px] text-[var(--color-ink-500)]
          "
        >
          <span className="text-[var(--color-ink-400)]" aria-hidden="true">{p.icon}</span>
          {p.name}
        </span>
      ))}
    </div>
  );
}
