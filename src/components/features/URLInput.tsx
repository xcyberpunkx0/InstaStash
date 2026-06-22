'use client';

import React, { useRef, useCallback, type ClipboardEvent, type KeyboardEvent } from 'react';

export interface URLInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error?: string;
  detectedPlatform?: {
    platform: string;
    contentType: string;
  };
}

/**
 * InstaStash URL input — pill-shaped with JetBrains Mono text.
 * Matches the design system: link icon, mono URL text, paste + Download buttons.
 * Placeholder: "paste a link, any link..."
 */
export function URLInput({ onSubmit, isLoading, error, detectedPlatform }: URLInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed) onSubmit(trimmed);
    },
    [onSubmit]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text').trim();
      if (inputRef.current) inputRef.current.value = pastedText;
      if (pastedText) handleSubmit(pastedText);
    },
    [handleSubmit]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(inputRef.current?.value ?? '');
      }
    },
    [handleSubmit]
  );

  const handlePasteClick = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (inputRef.current) inputRef.current.value = text.trim();
      if (text.trim()) handleSubmit(text.trim());
    } catch {
      // fallback — user can paste manually
    }
  }, [handleSubmit]);

  return (
    <div className="w-full max-w-[680px]">
      <div
        className="
          flex items-center gap-2
          py-2 pl-6 pr-2
          bg-(--color-bg-surface)
          rounded-pill
          border border-line-medium
          shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_22px_50px_-22px_rgba(31,27,22,0.30)]
          transition-shadow duration-[240ms]
          focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_30px_60px_-22px_rgba(31,27,22,0.36)]
        "
      >
        {/* Link icon — Lucide link-2, stroke 1.75 */}
        <svg
          className="w-[18px] h-[18px] text-(--color-ink-300) shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 17H7A5 5 0 0 1 7 7h2" />
          <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
          <line x1="8" x2="16" y1="12" y2="12" />
        </svg>

        {/* URL input — JetBrains Mono, placeholder in italic display */}
        <input
          ref={inputRef}
          id="url-input"
          type="url"
          maxLength={2048}
          placeholder="paste a link, any link..."
          className="
            flex-1 border-0 outline-none bg-transparent min-w-0
            font-mono text-[16px]
            text-(--color-ink-900) py-[14px]
            placeholder:text-(--color-ink-300)
            placeholder:italic
            placeholder:font-display
            placeholder:text-[18px]
          "
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          aria-describedby={error ? 'url-input-error' : undefined}
          aria-invalid={!!error}
          aria-busy={isLoading}
          aria-label="Video URL"
        />

        {/* Loading spinner */}
        {isLoading && (
          <div
            className="w-5 h-5 border-2 border-terra-500 border-t-transparent rounded-full animate-spin shrink-0 mr-2"
            role="status"
            aria-label="Detecting platform"
          />
        )}

        {/* Download button — charcoal pill, grotesk 600 */}
        <button
          type="button"
          onClick={() => handleSubmit(inputRef.current?.value ?? '')}
          disabled={isLoading}
          className="
            inline-flex items-center gap-2
            px-6 py-[14px] rounded-pill
            bg-(--color-ink-900) text-(--color-paper-50)
            font-grotesk font-semibold text-[15px]
            cursor-pointer border-0
            shadow-[0_8px_20px_-10px_rgba(31,27,22,0.45)]
            hover:translate-y-[-1px] hover:shadow-[0_14px_26px_-10px_rgba(31,27,22,0.5)]
            active:translate-y-0
            transition-[transform,box-shadow] duration-[160ms] ease-(--ease-paper)
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            shrink-0
          "
          aria-label="Download video"
        >
          Download
          {/* Lucide arrow-down, stroke 1.75 */}
          <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p
          id="url-input-error"
          className="mt-3 text-small font-sans text-rouge-500 pl-6"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
