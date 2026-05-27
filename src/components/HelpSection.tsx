'use client';

import React from 'react';

export interface PlatformExample {
  name: string;
  icon: React.ReactNode;
  exampleUrls: string[];
  steps: string[];
}

export interface HelpSectionProps {
  platforms: PlatformExample[];
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="4" ry="4" />
      <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
    </svg>
  );
}

const defaultPlatforms: PlatformExample[] = [
  {
    name: 'Instagram',
    icon: <InstagramIcon />,
    exampleUrls: ['https://www.instagram.com/p/ABC123/'],
    steps: [
      'Open Instagram and find the video or Reel',
      'Tap share and copy the link',
      'Paste the link above',
      'Download',
    ],
  },
  {
    name: 'YouTube',
    icon: <YouTubeIcon />,
    exampleUrls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    steps: [
      'Open YouTube and find the video',
      'Copy the URL from the address bar',
      'Paste the link above',
      'Choose quality and download',
    ],
  },
];

/**
 * Help section with platform instructions following AuraVault design system.
 */
export function HelpSection({ platforms = defaultPlatforms }: HelpSectionProps) {
  return (
    <section aria-labelledby="help-section-title" className="w-full">
      <h2
        id="help-section-title"
        className="font-[family-name:var(--font-display)] font-medium italic text-[var(--text-h2)] text-[var(--color-ink-900)] mb-8"
      >
        How to download
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className="p-6 bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] border border-[var(--color-line-soft)] shadow-[var(--shadow-card)]"
          >
            <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] font-medium text-[22px] text-[var(--color-ink-900)] mb-4">
              <span className="text-[var(--color-terra-500)]">{platform.icon}</span>
              {platform.name}
            </h3>

            <ol className="list-none space-y-2" aria-label={`Steps for ${platform.name}`}>
              {platform.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-paper-200)] flex items-center justify-center font-[family-name:var(--font-display)] italic text-[14px] text-[var(--color-terra-500)]" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="text-[14px] text-[var(--color-ink-500)] pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-4">
              {platform.exampleUrls.map((url) => (
                <code key={url} className="block text-[12px] font-[family-name:var(--font-mono)] text-[var(--color-ink-400)] bg-[var(--color-bg-recessed)] px-3 py-1.5 rounded-[var(--radius-sm)] break-all">
                  {url}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
