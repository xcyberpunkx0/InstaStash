import { useState, useCallback } from 'react';
import { useCountdown } from './useCountdown';

const MAX_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 30;
const RATE_LIMIT_DEFAULT_SECONDS = 60;

export interface RetryStateHook {
  /** Current number of consecutive failed attempts (0 to maxAttempts) */
  attempts: number;
  /** Whether the retry button should be disabled */
  isDisabled: boolean;
  /** Active countdown seconds (cooldown or rate-limit) */
  countdown: number;
  /** Attempt a retry. Returns true if the retry is allowed, false if blocked. */
  retry: () => boolean;
  /** Handle a rate-limit response. Uses platform-provided retryAfter or default 60s. */
  handleRateLimit: (retryAfter?: number) => void;
  /** Reset retry state (e.g., on successful operation) */
  reset: () => void;
}

/**
 * Custom hook implementing the retry state machine:
 * - Tracks attempts (0 to 3)
 * - After 3 failed attempts: enters 30-second cooldown, disables retry
 * - After cooldown expires: resets attempts to 0, re-enables retry
 * - For rate-limit errors: uses platform-provided retryAfter or default 60s
 */
export function useRetryState(): RetryStateHook {
  const [attempts, setAttempts] = useState(0);
  const [isDisabled, setIsDisabled] = useState(false);

  // Cooldown countdown (after 3 failed attempts)
  const cooldown = useCountdown(
    useCallback(() => {
      // Cooldown expired — reset state
      setAttempts(0);
      setIsDisabled(false);
    }, [])
  );

  // Rate-limit countdown
  const rateLimit = useCountdown(
    useCallback(() => {
      // Rate-limit expired — re-enable retry
      setIsDisabled(false);
    }, [])
  );

  /**
   * Attempt a retry. Returns true if allowed, false if blocked.
   * Increments the attempt counter. If max attempts reached, enters cooldown.
   */
  const retry = useCallback((): boolean => {
    if (isDisabled) return false;
    if (cooldown.isActive || rateLimit.isActive) return false;

    const newAttempts = attempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      // Exhausted retries — enter cooldown
      setAttempts(newAttempts);
      setIsDisabled(true);
      cooldown.start(COOLDOWN_SECONDS);
      return false;
    }

    setAttempts(newAttempts);
    return true;
  }, [isDisabled, attempts, cooldown, rateLimit]);

  /**
   * Handle a rate-limit response from the platform.
   * Disables retry and starts a countdown using the provided or default duration.
   */
  const handleRateLimit = useCallback((retryAfter?: number) => {
    const seconds = retryAfter ?? RATE_LIMIT_DEFAULT_SECONDS;
    setIsDisabled(true);
    rateLimit.start(seconds);
  }, [rateLimit]);

  /**
   * Reset retry state completely (e.g., after a successful operation).
   */
  const reset = useCallback(() => {
    setAttempts(0);
    setIsDisabled(false);
    cooldown.reset();
    rateLimit.reset();
  }, [cooldown, rateLimit]);

  // The active countdown is whichever is currently ticking
  const activeCountdown = rateLimit.isActive
    ? rateLimit.remaining
    : cooldown.remaining;

  return {
    attempts,
    isDisabled,
    countdown: activeCountdown,
    retry,
    handleRateLimit,
    reset,
  };
}
