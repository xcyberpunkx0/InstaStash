"use client";

import React from "react";

export interface PlatformIndicatorProps {
  platform: "instagram";
  contentType: "post" | "reel";
}

function getContentLabel(
  contentType: PlatformIndicatorProps["contentType"],
): string {
  switch (contentType) {
    case "post":
      return "Post";
    case "reel":
      return "Reel";
  }
}

function getPlatformName(platform: PlatformIndicatorProps["platform"]): string {
  return "Instagram";
}

/**
 * Platform badge indicator following AuraVault design system.
 * Clean pill-shaped badge with platform icon and label.
 */
export function PlatformIndicator({
  platform,
  contentType,
}: PlatformIndicatorProps) {
  const label = `${getPlatformName(platform)} ${getContentLabel(contentType)}`;

  return (
    <div
      className="
        inline-flex items-center gap-2 px-3 py-1.5
        rounded-pill
        font-grotesk font-semibold text-[11px] uppercase tracking-[0.06em]
        bg-sage-200 text-sage-600
      "
      role="status"
      aria-label={`Detected platform: ${label}`}
    >
      <svg
        className="w-3.5 h-3.5"
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
      </svg>
      {label}
    </div>
  );
}
