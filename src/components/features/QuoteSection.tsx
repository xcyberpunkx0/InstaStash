'use client';

import React from 'react';

export function QuoteSection() {
  return (
    <section className="max-w-[1280px] mx-auto px-6 md:px-12 py-[60px] md:py-[100px] text-center">
      <div className="max-w-[760px] mx-auto">
        <img src="/assets/doodle-circles.svg" alt="" aria-hidden="true" className="h-[50px] opacity-50 mb-[18px] mx-auto" />
        <blockquote className="font-[family-name:var(--font-display)] font-medium italic text-[clamp(28px,4vw,42px)] leading-[1.18] text-[var(--color-ink-900)] m-0 text-balance">
          &ldquo;It feels like writing in a Moleskine. I didn&rsquo;t know a download manager could feel{' '}
          <span className="bg-[linear-gradient(transparent_70%,var(--color-terra-200)_70%)]">like this.</span>&rdquo;
        </blockquote>
        <div className="mt-[22px] font-[family-name:var(--font-hand)] text-[22px] text-[var(--color-ink-500)]">
          — maya k., illustrator
        </div>
      </div>
    </section>
  );
}
