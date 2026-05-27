'use client';

import React from 'react';
import { SketchCharacter } from './SketchCharacter';
import { SketchButton } from './SketchButton';
import type { SketchCharacterProps } from './SketchCharacter';

export interface ErrorMessageProps {
  type: 'network' | 'private' | 'unavailable' | 'unsupported' | 'timeout' | 'rate-limit' | 'duration' | 'format';
  message: string;
  retryAction?: () => void;
  retryDisabled?: boolean;
  countdown?: number;
}

const errorMessages: Record<ErrorMessageProps['type'], string> = {
  network: "Couldn't connect — check your internet and try again!",
  private: 'This content is private — we can only download public videos.',
  unavailable: 'This content is no longer available on the platform.',
  unsupported: "We don't recognize this URL. We support Instagram and YouTube!",
  timeout: 'That took too long! Try pasting the URL again.',
  'rate-limit': 'Too many requests! Please wait {countdown}...',
  duration: 'This video is too long! We support videos up to 60 minutes.',
  format: "This doesn't look like a video link. Check the URL?",
};

export const moodMap: Record<ErrorMessageProps['type'], SketchCharacterProps['mood']> = {
  network: 'sad',
  private: 'sad',
  unavailable: 'sad',
  unsupported: 'error',
  timeout: 'thinking',
  'rate-limit': 'thinking',
  duration: 'error',
  format: 'error',
};

export function getErrorMessage(type: ErrorMessageProps['type'], countdown?: number): string {
  const template = errorMessages[type];
  if (type === 'rate-limit' && countdown !== undefined && countdown > 0) {
    return template.replace('{countdown}', `${countdown}s`);
  }
  if (type === 'rate-limit') {
    return template.replace('{countdown}', '...');
  }
  return template;
}

/**
 * Error display component following AuraVault design system.
 */
export function ErrorMessage({
  type,
  message,
  retryAction,
  retryDisabled,
  countdown,
}: ErrorMessageProps) {
  const mood = moodMap[type];
  const displayMessage = getErrorMessage(type, countdown);

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <SketchCharacter mood={mood} />

      <p role="alert" className="text-[15px] text-[var(--color-rouge-500)] max-w-[400px]">
        {displayMessage}
      </p>

      {countdown !== undefined && countdown > 0 && type === 'rate-limit' && (
        <p className="font-[family-name:var(--font-hand)] text-[20px] text-[var(--color-ink-400)]" aria-live="polite">
          retry in {countdown}s...
        </p>
      )}

      {retryAction && (
        <SketchButton variant="secondary" onClick={retryAction} disabled={retryDisabled} aria-label="Retry">
          Try Again
        </SketchButton>
      )}
    </div>
  );
}
