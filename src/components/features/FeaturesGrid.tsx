'use client';

import React from 'react';

const features = [
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
    title: 'Seventy+ platforms',
    description: 'YouTube, Instagram, TikTok, Twitter, Vimeo, Bandcamp, SoundCloud — drop a link, we\'ll figure it out.',
    note: '★ favorite',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 6 4-6 4Z"/></svg>,
    title: 'Honest HD',
    description: 'Up to 4K, with subtitles and thumbnails baked in. No tricks, no transcoding tax.',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    title: 'Audio, extracted',
    description: 'One click for the rain-loop, lecture, or interview — straight to MP3, FLAC, or WAV.',
    note: 'try this',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>,
    title: 'No ads, ever',
    description: 'No banners, no tracking pixels, no "upgrade to pro" modal. It loads, it works, it goes away.',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/></svg>,
    title: 'Open source',
    description: 'MIT-licensed. Read the code, file an issue, send a PR — or just keep using it forever.',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v1.5"/><path d="M13.9 17.45c-1.2-1.2-1.14-2.8-.2-3.73a2.43 2.43 0 0 1 3.44 0l.36.34.34-.34a2.43 2.43 0 0 1 3.45-.01v0c.95.95 1 2.53-.2 3.74L17.5 21Z"/></svg>,
    title: 'A library, not a downloads folder',
    description: 'Tags, collections, hand-written notes. The way you\'d actually organize things if you had the time.',
    note: 'draft v2',
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="max-w-[1280px] mx-auto px-6 md:px-12 py-[72px]">
      <div className="max-w-[760px] mb-14">
        <span className="font-[family-name:var(--font-hand)] text-[24px] text-[var(--color-terra-600)] inline-block mb-1.5" style={{ transform: 'rotate(-1.5deg)' }}>
          small tools, made carefully —
        </span>
        <h2 className="font-[family-name:var(--font-display)] font-medium italic text-[clamp(36px,5vw,56px)] leading-[1.04] tracking-[-0.015em] text-[var(--color-ink-900)] m-0 mb-4 text-balance">
          Six quiet features<br />doing one loud thing.
        </h2>
        <p className="text-[18px] leading-[1.6] text-[var(--color-ink-500)] max-w-[56ch]">
          No bloat. No upsell. Just the bits a creative person actually needs to save what they find online.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[22px]">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="
              relative p-7 pb-8
              bg-[var(--color-bg-surface)]
              bg-blend-multiply
              rounded-[18px]
              border border-[var(--color-line-soft)]
              shadow-[var(--shadow-card)]
              overflow-hidden
              transition-[transform,box-shadow] duration-[240ms] ease-[var(--ease-paper)]
              hover:translate-y-[-3px] hover:shadow-[var(--shadow-lift)]
            "
          >
            {feature.note && (
              <span className="absolute right-3.5 top-3 font-[family-name:var(--font-hand)] text-[18px] text-[var(--color-terra-600)]" style={{ transform: 'rotate(-3deg)' }}>
                {feature.note}
              </span>
            )}
            <div className="w-11 h-11 rounded-[12px] bg-[var(--color-paper-200)] inline-flex items-center justify-center text-[var(--color-ink-900)] mb-[18px]">
              <span className="w-[22px] h-[22px]">{feature.icon}</span>
            </div>
            <h3 className="font-[family-name:var(--font-display)] font-medium text-[26px] leading-[1.1] text-[var(--color-ink-900)] m-0 mb-2">
              {feature.title}
            </h3>
            <p className="text-[var(--color-ink-500)] text-[15px] leading-[1.55] m-0">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
