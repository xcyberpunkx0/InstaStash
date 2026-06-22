"use client";

import React from "react";

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
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" />
    </svg>
  );
}

const defaultPlatforms: PlatformExample[] = [
  {
    name: "Instagram",
    icon: <InstagramIcon />,
    exampleUrls: [
      "https://www.instagram.com/p/ABC123/",
      "https://www.instagram.com/reel/ABC123/",
    ],
    steps: [
      "Open Instagram and find the video or Reel",
      "Tap share and copy the link (or copy address from browser)",
      "Paste the link into the input field above",
      "Click Download and save the video directly to your device",
    ],
  },
];

/**
 * Help section with platform instructions following InstaStash design system.
 */
export function HelpSection({
  platforms = defaultPlatforms,
}: HelpSectionProps) {
  return (
    <section aria-labelledby="help-section-title" className="w-full">
      <h2
        id="help-section-title"
        className="font-display font-medium italic text-(--color-ink-900) mb-8 text-center"
      >
        How to download
      </h2>

      <div className="grid grid-cols-1 gap-6 max-w-[600px] mx-auto">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className="p-6 bg-(--color-bg-surface) rounded-lg border border-line-soft shadow-(--shadow-card)"
          >
            <h3 className="flex items-center gap-2 font-display font-medium text-h3 text-(--color-ink-900) mb-4">
              <span className="text-terra-500">{platform.icon}</span>
              {platform.name}
            </h3>

            <ol
              className="list-none space-y-2"
              aria-label={`Steps for ${platform.name}`}
            >
              {platform.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-6 h-6 rounded-full bg-(--color-paper-200) flex items-center justify-center font-display italic text-small text-terra-500"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="text-small text-(--color-ink-500) pt-0.5">
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-4">
              {platform.exampleUrls.map((url) => (
                <code
                  key={url}
                  className="block text-micro font-mono text-ink-400 bg-(--color-bg-recessed) px-3 py-1.5 rounded-sm break-all"
                >
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
