'use client';

import React, { useRef, useCallback, type ClipboardEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import { SketchBorder } from './SketchBorder';

export interface URLInputFieldProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error?: string;
  detectedPlatform?: {
    platform: 'instagram' | 'youtube';
    contentType: 'post' | 'reel' | 'video' | 'short';
  };
}

const platformLabels: Record<string, string> = {
  'instagram-post': 'Instagram Post',
  'instagram-reel': 'Instagram Reel',
  'youtube-video': 'YouTube Video',
  'youtube-short': 'YouTube Short',
};

/**
 * Sketchbook-styled URL input field with paste handling, loading state,
 * inline error messages, and platform badge display.
 */
export function URLInputField({ onSubmit, isLoading, error, detectedPlatform }: URLInputFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit(trimmed);
      }
    },
    [onSubmit]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const trimmed = pastedText.trim();

      if (inputRef.current) {
        inputRef.current.value = trimmed;
      }

      if (trimmed) {
        handleSubmit(trimmed);
      }
    },
    [handleSubmit]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (value) {
        handleSubmit(value);
      }
    },
    [handleSubmit]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = inputRef.current?.value ?? '';
        handleSubmit(value);
      }
    },
    [handleSubmit]
  );

  const platformKey = detectedPlatform
    ? `${detectedPlatform.platform}-${detectedPlatform.contentType}`
    : null;
  const platformLabel = platformKey ? platformLabels[platformKey] : null;

  return (
    <div className="w-full max-w-xl mx-auto">
      <label htmlFor="url-input" className="block font-body text-text mb-2 text-sm">
        Paste a video URL
      </label>

      <SketchBorder className="w-full">
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            ref={inputRef}
            id="url-input"
            type="url"
            maxLength={2048}
            placeholder="https://www.instagram.com/reel/... or youtube.com/watch?v=..."
            className="flex-1 bg-transparent font-body text-text placeholder:text-text-muted outline-none text-base min-w-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            onPaste={handlePaste}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-describedby={error ? 'url-input-error' : undefined}
            aria-invalid={!!error}
            aria-busy={isLoading}
          />

          {isLoading && (
            <div
              className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"
              role="status"
              aria-label="Detecting platform"
            >
              <span className="sr-only">Detecting platform...</span>
            </div>
          )}

          {!isLoading && detectedPlatform && platformLabel && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-sketch text-xs font-body font-semibold shrink-0 border border-border text-text-muted bg-surface"
              aria-label={`Detected: ${platformLabel}`}
            >
              {detectedPlatform.platform === 'instagram' ? '📷' : '▶️'}{' '}
              {platformLabel}
            </span>
          )}
        </div>
      </SketchBorder>

      {error && (
        <p
          id="url-input-error"
          className="mt-2 text-sm font-body text-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
