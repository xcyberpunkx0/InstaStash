'use client';

import React from 'react';

export function Navbar() {
  return (
    <header className="max-w-[1280px] mx-auto px-6 md:px-12">
      <nav className="flex items-center justify-between py-[22px]">
        <a href="/" className="block">
          <img src="/assets/logo.svg" alt="InstaStash" className="h-9" />
        </a>

        <div className="hidden md:flex items-center gap-7">
          {['features', 'how it works', 'open source'].map((link) => (
            <a
              key={link}
              href={`#${link.replace(/\s/g, '-')}`}
              className="
                text-(--color-ink-700) no-underline text-[15px]
                font-sans
                bg-[linear-gradient(transparent_calc(100%-2px),var(--color-terra-500)_0)]
                bg-no-repeat bg-[length:0%_100%]
                transition-[background-size] duration-[320ms] ease-(--ease-paper)
                hover:bg-[length:100%_100%]
                pb-0.5
              "
            >
              {link}
            </a>
          ))}
        </div>

        <a
          href="#download"
          className="
            inline-flex items-center gap-2
            bg-(--color-ink-900) text-(--color-paper-50)
            px-5 py-[11px] rounded-pill
            font-grotesk font-semibold text-small
            no-underline border-0 cursor-pointer
            shadow-[0_8px_20px_-10px_rgba(31,27,22,0.45)]
            transition-transform duration-[160ms] ease-(--ease-paper)
            hover:translate-y-[-1px]
          "
        >
          Get the app
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
        </a>
      </nav>
    </header>
  );
}
