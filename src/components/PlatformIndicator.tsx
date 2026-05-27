'use client';

import React from 'react';

export interface PlatformIndicatorProps {
  platform: 'instagram' | 'youtube';
  contentType: 'post' | 'reel' | 'video' | 'short';
}

function getContentLabel(contentType: PlatformIndicatorProps['contentType']): string {
  switch (contentType) {
    case 'post': return 'Post';
    case 'reel': return 'Reel';
    case 'video': return 'Video';
    case 'short': return 'Short';
  }
}

function getPlatformName(platform: PlatformIndicatorProps['platform']): string {
  return platform === 'instagram' ? 'Instagram' : 'YouTube';
}

/**
 * Platform badge indicator following AuraVault design system.
 * Clean pill-shaped badge with platform icon and label.
 */
export function PlatformIndicator({ platform, contentType }: PlatformIndicatorProps) {
  const label = `${getPlatformName(platform)} ${getContentLabel(contentType)}`;
  const isInstagram = platform === 'instagram';

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5
        rounded-[var(--radius-pill)]
        font-[family-name:var(--font-grotesk)] font-semibold text-[11px] uppercase tracking-[0.06em]
        ${isInstagram
          ? 'bg-[var(--color-sage-200)] text-[var(--color-sage-600)]'
          : 'bg-[var(--color-terra-200)] text-[var(--color-terra-600)]'
        }
      `}
      role="status"
      aria-label={`Detected platform: ${label}`}
    >
      {isInstagram ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="5" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="4" ry="4" />
          <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
        </svg>
      )}
      {label}
    </div>
  );
}
