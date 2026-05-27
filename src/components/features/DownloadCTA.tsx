'use client';

import React from 'react';

export function DownloadCTA() {
  return (
    <section id="download" className="max-w-[1280px] mx-auto px-6 md:px-12 pb-20">
      <div className="relative overflow-hidden px-8 md:px-12 py-14 bg-[var(--color-ink-900)] text-[var(--color-paper-50)] rounded-[32px]">
        {/* Terra glow */}
        <div className="absolute -top-10 -right-10 w-[200px] h-[200px] bg-[radial-gradient(circle,#C97B4E_0%,transparent_60%)] opacity-60 blur-[20px]" aria-hidden="true" />

        <div className="relative flex justify-between items-center gap-10 flex-wrap">
          <div>
            <span className="font-[family-name:var(--font-hand)] text-[24px] text-[#D7906A]">
              it&rsquo;s free, by the way —
            </span>
            <h2 className="font-[family-name:var(--font-display)] font-medium italic text-[clamp(36px,5vw,48px)] leading-[1.05] text-[var(--color-paper-50)] max-w-[12ch] mt-1 m-0">
              Take it for a walk.
            </h2>
          </div>

          <div className="flex gap-3 flex-wrap">
            <a href="#" className="inline-flex items-center gap-2.5 px-[22px] py-3.5 bg-[var(--color-paper-50)] text-[var(--color-ink-900)] rounded-[var(--radius-pill)] no-underline font-[family-name:var(--font-grotesk)] font-semibold text-[15px] hover:translate-y-[-1px] transition-transform duration-[160ms]">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 4-3 4-6s-2-4-4-4c-1.5 0-2.5 1-4 1s-2.5-1-4-1c-2 0-4 2-4 4s1 6 4 6c1.25 0 2.5-1.06 4-1.06Z"/><path d="M12 10c1-2 3-3 5-3"/></svg>
              macOS
            </a>
            <a href="#" className="inline-flex items-center gap-2.5 px-[22px] py-3.5 bg-[var(--color-paper-50)] text-[var(--color-ink-900)] rounded-[var(--radius-pill)] no-underline font-[family-name:var(--font-grotesk)] font-semibold text-[15px] hover:translate-y-[-1px] transition-transform duration-[160ms]">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
              Windows
            </a>
            <a href="#" className="inline-flex items-center gap-2.5 px-[22px] py-3.5 bg-transparent text-[var(--color-paper-50)] border-[1.5px] border-[rgba(247,243,238,0.4)] rounded-[var(--radius-pill)] no-underline font-[family-name:var(--font-grotesk)] font-semibold text-[15px] hover:translate-y-[-1px] transition-transform duration-[160ms]">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              Linux · brew · CLI
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
