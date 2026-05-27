'use client';

import React, { useRef, useEffect } from 'react';
import { SketchBorder } from './SketchBorder';
import { SketchButton } from './SketchButton';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createRoughSvg, sketchColors, animationDurations } from '@/lib/rough-utils';

export interface DownloadProgressProps {
  /** Progress percentage from 0 to 100 */
  percentage: number;
  /** Current download status */
  status: 'downloading' | 'complete' | 'error';
  /** Callback when user clicks retry in error state */
  onRetry?: () => void;
}

/**
 * Sketchbook-style animated progress bar component.
 * Shows download progress with hand-drawn styling, a celebratory
 * completion state, and an error state with retry button.
 * Respects `prefers-reduced-motion` for animations.
 */
export function DownloadProgress({ percentage, status, onRetry }: DownloadProgressProps) {
  const prefersReducedMotion = useReducedMotion();
  const fillSvgRef = useRef<SVGSVGElement>(null);
  const fillContainerRef = useRef<HTMLDivElement>(null);

  // Clamp percentage to valid range
  const clampedPercentage = Math.min(100, Math.max(0, Math.round(percentage)));

  // Draw rough border on the progress fill
  useEffect(() => {
    const svg = fillSvgRef.current;
    const container = fillContainerRef.current;
    if (!svg || !container || status !== 'downloading') return;

    const draw = () => {
      const { width, height } = container.getBoundingClientRect();

      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }

      if (width < 4 || height < 4) return;

      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));

      const rc = createRoughSvg(svg);
      const node = rc.rectangle(1, 1, width - 2, height - 2, {
        roughness: 1.2,
        bowing: 0.8,
        stroke: sketchColors.primary,
        strokeWidth: 1.5,
        fill: sketchColors.primary,
        fillStyle: 'solid',
        fillWeight: 1,
      });
      svg.appendChild(node);
    };

    draw();

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [clampedPercentage, status]);

  const transitionDuration = prefersReducedMotion ? '0ms' : `${animationDurations.standard}ms`;

  if (status === 'complete') {
    return (
      <div className="flex flex-col items-center gap-3 p-6" data-testid="download-progress-complete">
        {/* Celebratory doodle */}
        <div className="text-4xl" aria-hidden="true">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Checkmark circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke={sketchColors.success}
              strokeWidth="3"
              strokeDasharray="4 2"
              fill="none"
            />
            {/* Checkmark */}
            <path
              d="M20 32 L28 40 L44 24"
              stroke={sketchColors.success}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Sparkles */}
            <path d="M50 12 L52 8 L54 12 L58 14 L54 16 L52 20 L50 16 L46 14 Z" fill={sketchColors.accent} />
            <path d="M8 10 L9.5 7 L11 10 L14 11.5 L11 13 L9.5 16 L8 13 L5 11.5 Z" fill={sketchColors.accent} />
            <path d="M52 46 L53.5 43 L55 46 L58 47.5 L55 49 L53.5 52 L52 49 L49 47.5 Z" fill={sketchColors.accent} />
          </svg>
        </div>
        <p className="font-heading text-2xl text-success">Download complete!</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 p-6" data-testid="download-progress-error">
        {/* Error doodle */}
        <div aria-hidden="true">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Sad face circle */}
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke={sketchColors.error}
              strokeWidth="2.5"
              strokeDasharray="3 2"
              fill="none"
            />
            {/* X mark */}
            <path
              d="M17 17 L31 31 M31 17 L17 31"
              stroke={sketchColors.error}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
        <p className="font-body text-base text-error">Something went wrong during download.</p>
        {onRetry && (
          <SketchButton variant="primary" onClick={onRetry} aria-label="Retry download">
            Try Again
          </SketchButton>
        )}
      </div>
    );
  }

  // Downloading state
  return (
    <div className="w-full flex flex-col gap-2" data-testid="download-progress-downloading" role="region" aria-label="Download progress">
      <div className="flex justify-between items-center">
        <span className="font-body text-sm text-text-muted">Downloading...</span>
        <span className="font-heading text-lg text-text" aria-hidden="true">
          {clampedPercentage}%
        </span>
      </div>
      <SketchBorder className="w-full h-8 overflow-hidden bg-surface">
        <div
          role="progressbar"
          aria-valuenow={clampedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Download progress: ${clampedPercentage}%`}
          className="h-full relative"
        >
          <div
            ref={fillContainerRef}
            className="h-full relative"
            style={{
              width: `${clampedPercentage}%`,
              transitionProperty: 'width',
              transitionDuration,
              transitionTimingFunction: 'ease-in-out',
            }}
          >
            <svg
              ref={fillSvgRef}
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>
      </SketchBorder>
    </div>
  );
}
