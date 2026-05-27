'use client';

import React, { useRef, useEffect } from 'react';
import { createRoughSvg, sketchColors } from '@/lib/rough-utils';

export interface PlatformIndicatorProps {
  platform: 'instagram' | 'youtube';
  contentType: 'post' | 'reel' | 'video' | 'short';
}

/** Maps content type to a user-friendly label */
function getContentLabel(contentType: PlatformIndicatorProps['contentType']): string {
  switch (contentType) {
    case 'post':
      return 'Post';
    case 'reel':
      return 'Reel';
    case 'video':
      return 'Video';
    case 'short':
      return 'Short';
  }
}

/** Returns the display name for a platform */
function getPlatformName(platform: PlatformIndicatorProps['platform']): string {
  return platform === 'instagram' ? 'Instagram' : 'YouTube';
}

/** Returns the theme color for a platform */
function getPlatformColor(platform: PlatformIndicatorProps['platform']): string {
  return platform === 'instagram' ? sketchColors.secondary : sketchColors.primary;
}

/**
 * Draws a hand-drawn Instagram camera icon using Rough.js.
 * Renders a rounded rectangle body with a circle lens.
 */
function drawInstagramIcon(svg: SVGSVGElement): void {
  const rc = createRoughSvg(svg);
  const color = sketchColors.secondary;

  // Camera body (rounded rectangle approximation)
  const body = rc.rectangle(4, 6, 16, 14, {
    roughness: 1.2,
    bowing: 0.8,
    stroke: color,
    strokeWidth: 1.5,
    fill: 'none',
  });
  svg.appendChild(body);

  // Lens circle
  const lens = rc.circle(12, 13, 8, {
    roughness: 1.0,
    bowing: 0.6,
    stroke: color,
    strokeWidth: 1.5,
    fill: 'none',
  });
  svg.appendChild(lens);

  // Small flash/dot in top-right corner
  const flash = rc.circle(17, 8, 2, {
    roughness: 0.8,
    stroke: color,
    strokeWidth: 1,
    fill: color,
    fillStyle: 'solid',
  });
  svg.appendChild(flash);
}

/**
 * Draws a hand-drawn YouTube play button icon using Rough.js.
 * Renders a rounded rectangle with a triangle play symbol.
 */
function drawYouTubeIcon(svg: SVGSVGElement): void {
  const rc = createRoughSvg(svg);
  const color = sketchColors.primary;

  // Rounded rectangle background
  const bg = rc.rectangle(3, 5, 18, 14, {
    roughness: 1.2,
    bowing: 0.8,
    stroke: color,
    strokeWidth: 1.5,
    fill: 'none',
  });
  svg.appendChild(bg);

  // Play triangle
  const triangle = rc.polygon(
    [
      [9, 8],
      [9, 16],
      [17, 12],
    ],
    {
      roughness: 0.8,
      bowing: 0.5,
      stroke: color,
      strokeWidth: 1.5,
      fill: color,
      fillStyle: 'solid',
    }
  );
  svg.appendChild(triangle);
}

/**
 * Displays a compact badge indicating the detected platform and content type.
 * Uses Rough.js to render hand-drawn platform icons for the sketchbook aesthetic.
 */
export function PlatformIndicator({ platform, contentType }: PlatformIndicatorProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    if (platform === 'instagram') {
      drawInstagramIcon(svg);
    } else {
      drawYouTubeIcon(svg);
    }
  }, [platform]);

  const color = getPlatformColor(platform);
  const label = `${getPlatformName(platform)} ${getContentLabel(contentType)}`;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded"
      style={{ backgroundColor: `${color}15`, border: `1.5px solid ${color}40` }}
      role="status"
      aria-label={`Detected platform: ${label}`}
    >
      <svg
        ref={svgRef}
        width={24}
        height={24}
        className="shrink-0"
        aria-hidden="true"
      />
      <span
        className="text-sm font-medium"
        style={{ color, fontFamily: "'Nunito', sans-serif" }}
      >
        {label}
      </span>
    </div>
  );
}
