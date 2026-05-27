'use client';

import React from 'react';

interface LibraryItem {
  platform: string;
  title: string;
  duration: string;
  tag: string;
  size: string;
  note?: string;
  gradient: string;
}

const libraryItems: LibraryItem[] = [
  { platform: 'youtube', title: 'On craft, slowness, and the joy of forgotten tools', duration: '22:14', tag: '1080p', size: '132 MB', note: '★', gradient: 'linear-gradient(135deg, #3A2618, #C97B4E)' },
  { platform: 'instagram · @noted.studio', title: 'A page from a sketchbook, in slow zoom', duration: '3:02', tag: 'reel', size: '11 MB', gradient: 'linear-gradient(135deg, #7A8A6F, #D8DECF)' },
  { platform: 'youtube · MIT OCW', title: 'Linear algebra · the geometry of vectors', duration: '1:04:22', tag: 'audio', size: '72 MB', note: 'lecture', gradient: 'linear-gradient(135deg, #2A3A33, #475A50)' },
  { platform: 'vimeo · field studies', title: 'Rain on a tin roof, recorded one tuesday', duration: '8:45', tag: 'mp3', size: '9 MB', gradient: 'linear-gradient(135deg, #3F4F4D, #1F2A29)' },
  { platform: 'tiktok · @analogkid', title: 'Why the rolodex is making a comeback (a thesis in 14 parts)', duration: '14:30', tag: '1080p', size: '48 MB', gradient: 'linear-gradient(135deg, #6B5544, #C97B4E)' },
  { platform: 'youtube · in conversation', title: 'An afternoon with a typographer who only uses pencil', duration: '42:11', tag: 'subtitled', size: '198 MB', note: 'draft v2', gradient: 'linear-gradient(135deg, #F2C09A, #6B3F2A)' },
  { platform: 'soundcloud', title: 'A demo from a tape someone left in a thrift shop', duration: '6:18', tag: 'flac', size: '38 MB', gradient: 'linear-gradient(135deg, #E7C297, #B07F58)' },
  { platform: 'instagram · @booksonbenches', title: 'Reading lists, by a stranger on a bench', duration: '2:56', tag: 'reel', size: '14 MB', gradient: 'linear-gradient(180deg, #F7F3EE, #EFE7DA)' },
];

export function LibraryGrid({ onItemClick }: { onItemClick?: () => void } = {}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[18px]">
      {libraryItems.map((item, i) => (
        <article
          key={i}
          onClick={onItemClick}
          className="
            relative bg-[var(--color-bg-surface)] bg-blend-multiply
            rounded-[16px] border border-[var(--color-line-soft)]
            shadow-[var(--shadow-card)] overflow-hidden cursor-pointer
            transition-[transform,box-shadow] duration-[240ms] ease-[var(--ease-paper)]
            hover:translate-y-[-3px] hover:shadow-[var(--shadow-lift)]
          "
        >
          {/* Thumbnail */}
          <div className="aspect-[16/10] relative overflow-hidden border-b border-[rgba(31,27,22,0.1)]" style={{ background: item.gradient }}>
            {/* Play button */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[rgba(247,243,238,0.92)] backdrop-blur-[8px] flex items-center justify-center shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] z-[2]">
              <svg width="12" height="14" viewBox="0 0 12 14"><path d="M1 1 L 1 13 L 11 7 Z" fill="#1F1B16"/></svg>
            </div>
            {/* Duration badge */}
            <div className="absolute right-2 bottom-2 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[rgba(31,27,22,0.65)] backdrop-blur-[6px] text-[var(--color-paper-50)] font-[family-name:var(--font-mono)] text-[10px] z-[2]">
              {item.duration}
            </div>
            {/* Note */}
            {item.note && (
              <span className="absolute top-2.5 right-2.5 font-[family-name:var(--font-hand)] text-[18px] text-[var(--color-paper-50)] z-[2] drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]" style={{ transform: 'rotate(-3deg)' }}>
                {item.note}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="p-3.5 pb-4">
            <div className="font-[family-name:var(--font-grotesk)] font-semibold text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
              {item.platform}
            </div>
            <div className="font-[family-name:var(--font-display)] font-medium text-[17px] leading-[1.15] text-[var(--color-ink-900)] mt-1 mb-1.5 line-clamp-2">
              {item.title}
            </div>
            <div className="flex gap-1.5 items-center flex-wrap font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-400)]">
              <span className="px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-paper-200)] text-[var(--color-ink-700)] font-[family-name:var(--font-sans)] text-[11px]">
                {item.tag}
              </span>
              <span>·</span>
              <span>{item.size}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
