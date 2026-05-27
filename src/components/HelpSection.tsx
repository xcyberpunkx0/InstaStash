'use client';

import React from 'react';
import { SketchBorder } from './SketchBorder';

export interface PlatformExample {
  name: string;
  icon: React.ReactNode;
  exampleUrls: string[];
  steps: string[];
}

export interface HelpSectionProps {
  platforms: PlatformExample[];
}

/** Hand-drawn Instagram icon */
function InstagramIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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

/** Hand-drawn YouTube icon */
function YouTubeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
      'Open Instagram and find the video or Reel you want to save',
      'Tap the share button and copy the link',
      'Paste the link in the input field above',
      'Click download and wait for your video',
    ],
  },
  {
    name: 'YouTube',
    icon: <YouTubeIcon />,
    exampleUrls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    steps: [
      'Open YouTube and find the video or Short you want to save',
      'Copy the URL from the address bar or share menu',
      'Paste the link in the input field above',
      'Choose your preferred quality (if available)',
      'Click download and wait for your video',
    ],
  },
];

/**
 * HelpSection displays step-by-step instructions and example URLs
 * for each supported platform, styled with the sketchbook aesthetic.
 *
 * Validates: Requirements 7.5
 */
export function HelpSection({ platforms = defaultPlatforms }: HelpSectionProps) {
  return (
    <SketchBorder className="p-4 sm:p-6 md:p-8 bg-surface rounded-sketch">
      <section aria-labelledby="help-section-title">
        <h2
          id="help-section-title"
          className="font-heading text-3xl md:text-4xl text-primary mb-6 text-center"
        >
          How to Download Videos
        </h2>

        <div className="space-y-8">
          {platforms.map((platform) => (
            <div key={platform.name} className="space-y-3">
              {/* Platform heading with icon */}
              <h3 className="font-heading text-2xl text-text flex items-center gap-2">
                <span className="text-primary">{platform.icon}</span>
                {platform.name}
              </h3>

              {/* Step-by-step instructions */}
              <ol
                className="list-none space-y-2 pl-2"
                aria-label={`Steps to download from ${platform.name}`}
              >
                {platform.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    {/* Hand-drawn numbered circle */}
                    <span
                      className="shrink-0 w-7 h-7 rounded-full border-2 border-primary
                        flex items-center justify-center font-heading text-sm text-primary
                        bg-background"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <span className="font-body text-text pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>

              {/* Example URLs */}
              <div className="mt-3 pl-2">
                <p className="font-body text-sm text-text-muted mb-1">
                  Example {platform.exampleUrls.length > 1 ? 'URLs' : 'URL'}:
                </p>
                <ul className="list-none space-y-1" aria-label={`Example ${platform.name} URLs`}>
                  {platform.exampleUrls.map((url) => (
                    <li key={url}>
                      <code className="font-body text-sm bg-background text-text-muted px-2 py-1 rounded-sketch border border-border inline-block break-all">
                        {url}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Summary steps */}
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-heading text-xl text-text-muted text-center mb-4">
            Quick Steps
          </h3>
          <ol
            className="list-none flex flex-wrap justify-center gap-4 md:gap-6"
            aria-label="Quick summary steps"
          >
            {[
              { num: 1, text: 'Copy a video URL' },
              { num: 2, text: 'Paste it above' },
              { num: 3, text: 'Choose quality' },
              { num: 4, text: 'Download!' },
            ].map((item) => (
              <li
                key={item.num}
                className="flex flex-col items-center text-center w-20 md:w-24"
              >
                <span
                  className="w-10 h-10 rounded-full border-2 border-accent bg-background
                    flex items-center justify-center font-heading text-lg text-accent mb-1"
                  aria-hidden="true"
                >
                  {item.num}
                </span>
                <span className="font-body text-xs text-text-muted">{item.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </SketchBorder>
  );
}
