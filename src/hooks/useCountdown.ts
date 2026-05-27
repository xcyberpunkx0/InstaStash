import { useState, useEffect, useCallback } from 'react';

/**
 * Hook that manages a countdown timer.
 * Returns the remaining seconds and a function to start a new countdown.
 *
 * @param onComplete - Optional callback invoked when the countdown reaches 0
 */
export function useCountdown(onComplete?: () => void) {
  const [endTime, setEndTime] = useState<number | undefined>(undefined);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (endTime === undefined) {
      setRemaining(0);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.ceil((endTime - now) / 1000));
      setRemaining(secondsLeft);

      if (secondsLeft <= 0) {
        setEndTime(undefined);
        onComplete?.();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime, onComplete]);

  /**
   * Start a countdown for the given number of seconds.
   */
  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setEndTime(Date.now() + seconds * 1000);
  }, []);

  /**
   * Cancel the active countdown and reset to 0.
   */
  const reset = useCallback(() => {
    setEndTime(undefined);
    setRemaining(0);
  }, []);

  return { remaining, start, reset, isActive: remaining > 0 };
}
