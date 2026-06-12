"use client";

import React from "react";

const platforms = [
  { name: "Reels", icon: "⚡" },
  { name: "Photos & Videos", icon: "◎" },
  { name: "Carousel Posts", icon: "⧉" },
  { name: "IGTV & Long Videos", icon: "📺" },
];

/**
 * Displays supported platforms as small pills.
 * Decorative section showing breadth of platform support.
 */
export function SupportedPlatforms() {
  return (
    <div className="flex flex-wrap items-center gap-2 justify-center">
      {platforms.map((p) => (
        <span
          key={p.name}
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5
            rounded-pill
            bg-(--color-bg-surface)
            border border-line-soft
            font-sans text-[13px] text-(--color-ink-500)
          "
        >
          <span className="text-ink-400" aria-hidden="true">
            {p.icon}
          </span>
          {p.name}
        </span>
      ))}
    </div>
  );
}
