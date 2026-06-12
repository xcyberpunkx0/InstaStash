"use client";

import React, {
  useRef,
  useCallback,
  type ClipboardEvent,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

export interface URLInputFieldProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error?: string;
  detectedPlatform?: {
    platform: "instagram";
    contentType: "post" | "reel";
  };
}

const platformLabels: Record<string, string> = {
  "instagram-post": "Instagram Post",
  "instagram-reel": "Instagram Reel",
};

/**
 * URL input field following AuraVault design system.
 * Pill-shaped input with paste handling, loading state, and platform badge.
 */
export function URLInputField({
  onSubmit,
  isLoading,
  error,
  detectedPlatform,
}: URLInputFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed) onSubmit(trimmed);
    },
    [onSubmit],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const trimmed = pastedText.trim();
      if (inputRef.current) inputRef.current.value = trimmed;
      if (trimmed) handleSubmit(trimmed);
    },
    [handleSubmit],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (value) handleSubmit(value);
    },
    [handleSubmit],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit(inputRef.current?.value ?? "");
      }
    },
    [handleSubmit],
  );

  const platformKey = detectedPlatform
    ? `${detectedPlatform.platform}-${detectedPlatform.contentType}`
    : null;
  const platformLabel = platformKey ? platformLabels[platformKey] : null;

  return (
    <div className="w-full max-w-[720px] mx-auto">
      <label
        htmlFor="url-input"
        className="block text-(--color-ink-500) mb-2 text-small font-sans"
      >
        Paste a video URL
      </label>

      <div className="flex items-center gap-2 px-5 py-3 bg-(--color-bg-surface) rounded-pill border border-line-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_14px_36px_-18px_rgba(31,27,22,0.22)]">
        <input
          ref={inputRef}
          id="url-input"
          type="url"
          maxLength={2048}
          placeholder="https://www.instagram.com/reel/... or /p/..."
          className="flex-1 bg-transparent font-mono text-small text-(--color-ink-900) placeholder:text-(--color-ink-300) placeholder:italic placeholder:font-display outline-none min-w-0 py-1"
          onPaste={handlePaste}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          aria-describedby={error ? "url-input-error" : undefined}
          aria-invalid={!!error}
          aria-busy={isLoading}
        />

        {isLoading && (
          <div
            className="w-5 h-5 border-2 border-terra-500 border-t-transparent rounded-full animate-spin shrink-0"
            role="status"
            aria-label="Detecting platform"
          >
            <span className="sr-only">Detecting platform...</span>
          </div>
        )}

        {!isLoading && detectedPlatform && platformLabel && (
          <span
            className="inline-flex items-center px-3 py-1 rounded-pill text-[11px] font-grotesk font-semibold shrink-0 bg-sage-200 text-sage-600"
            aria-label={`Detected: ${platformLabel}`}
          >
            📷 {platformLabel}
          </span>
        )}
      </div>

      {error && (
        <p
          id="url-input-error"
          className="mt-2 text-small font-sans text-rouge-500"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
