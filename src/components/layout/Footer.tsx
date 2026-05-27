'use client';

import React from 'react';

const footerLinks = {
  App: ['macOS', 'Windows', 'Linux', 'CLI'],
  Project: ['GitHub', 'Changelog', 'Roadmap', 'Contribute'],
  Read: ['Journal', 'FAQ', 'Privacy', 'License'],
};

export function Footer() {
  return (
    <footer
      className="max-w-[1280px] mx-auto px-6 md:px-12 pt-[60px] pb-[50px] bg-no-repeat bg-position-[top_center] bg-size-[100%_8px]"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 8' preserveAspectRatio='none'><path d='M2 4 C 120 1.5, 240 6.5, 360 4 S 720 1.5, 840 4 1080 6.5, 1198 4' fill='none' stroke='%231F1B16' stroke-opacity='0.35' stroke-width='1.2' stroke-linecap='round'/></svg>")`,
      }}
    >
      <div className="flex justify-between items-start gap-10 flex-wrap">
        {/* Brand */}
        <div className="flex-1 min-w-[240px]">
          <img src="/assets/logo.svg" alt="AuraVault" className="h-8" />
          <p className="text-(--color-ink-500) text-small max-w-[38ch] mt-3">
            A quieter way to keep the internet. Made with care in a small studio, somewhere with good coffee.
          </p>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h5 className="font-grotesk font-semibold text-[11px] uppercase tracking-[0.18em] text-ink-400 m-0 mb-3">
              {title}
            </h5>
            {links.map((link) => (
              <a
                key={link}
                href="#"
                className="block text-ink-700 no-underline text-small mb-1.5 hover:text-(--color-terra-600) transition-colors duration-160"
              >
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-10 pt-[18px] flex justify-between items-center font-hand text-ink-400 text-[18px]">
        <span>© 2026 · made by Aditya</span>
        <span>★ MIT licensed · v2.4</span>
      </div>
    </footer>
  );
}
