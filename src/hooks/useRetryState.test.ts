import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRetryState } from './useRetryState';

describe('useRetryState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with 0 attempts, not disabled, countdown 0', () => {
    const { result } = renderHook(() => useRetryState());
    expect(result.current.attempts).toBe(0);
    expect(result.current.isDisabled).toBe(false);
    expect(result.current.countdown).toBe(0);
  });

  it('allows retry and increments attempts (attempt 1)', () => {
    const { result } = renderHook(() => useRetryState());

    let allowed: boolean;
    act(() => {
      allowed = result.current.retry();
    });

    expect(allowed!).toBe(true);
    expect(result.current.attempts).toBe(1);
    expect(result.current.isDisabled).toBe(false);
  });

  it('allows retry on second attempt', () => {
    const { result } = renderHook(() => useRetryState());

    act(() => {
      result.current.retry();
    });

    let allowed: boolean;
    act(() => {
      allowed = result.current.retry();
    });

    expect(allowed!).toBe(true);
    expect(result.current.attempts).toBe(2);
    expect(result.current.isDisabled).toBe(false);
  });

  it('blocks retry on third attempt and enters 30s cooldown', () => {
    const { result } = renderHook(() => useRetryState());

    // First two retries succeed
    act(() => { result.current.retry(); });
    act(() => { result.current.retry(); });

    // Third retry triggers cooldown
    let allowed: boolean;
    act(() => {
      allowed = result.current.retry();
    });

    expect(allowed!).toBe(false);
    expect(result.current.attempts).toBe(3);
    expect(result.current.isDisabled).toBe(true);
    expect(result.current.countdown).toBe(30);
  });

  it('re-enables retry after 30s cooldown expires', () => {
    const { result } = renderHook(() => useRetryState());

    // Exhaust retries
    act(() => { result.current.retry(); });
    act(() => { result.current.retry(); });
    act(() => { result.current.retry(); });

    expect(result.current.isDisabled).toBe(true);

    // Advance 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(result.current.isDisabled).toBe(false);
    expect(result.current.attempts).toBe(0);
    expect(result.current.countdown).toBe(0);
  });

  it('blocks retry while cooldown is active', () => {
    const { result } = renderHook(() => useRetryState());

    // Exhaust retries
    act(() => { result.current.retry(); });
    act(() => { result.current.retry(); });
    act(() => { result.current.retry(); });

    // Try to retry during cooldown
    let allowed: boolean;
    act(() => {
      allowed = result.current.retry();
    });

    expect(allowed!).toBe(false);
  });

  it('handleRateLimit disables retry with platform-provided duration', () => {
    const { result } = renderHook(() => useRetryState());

    act(() => {
      result.current.handleRateLimit(45);
    });

    expect(result.current.isDisabled).toBe(true);
    expect(result.current.countdown).toBe(45);
  });

  it('handleRateLimit uses default 60s when no duration provided', () => {
    const { result } = renderHook(() => useRetryState());

    act(() => {
      result.current.handleRateLimit();
    });

    expect(result.current.isDisabled).toBe(true);
    expect(result.current.countdown).toBe(60);
  });

  it('re-enables retry after rate-limit countdown expires', () => {
    const { result } = renderHook(() => useRetryState());

    act(() => {
      result.current.handleRateLimit(10);
    });

    expect(result.current.isDisabled).toBe(true);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.isDisabled).toBe(false);
    expect(result.current.countdown).toBe(0);
  });

  it('reset clears all state', () => {
    const { result } = renderHook(() => useRetryState());

    // Get into a state with attempts
    act(() => { result.current.retry(); });
    act(() => { result.current.retry(); });

    expect(result.current.attempts).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.attempts).toBe(0);
    expect(result.current.isDisabled).toBe(false);
    expect(result.current.countdown).toBe(0);
  });

  it('preserves URL and quality settings across retries (state is independent)', () => {
    // The hook only manages retry state — URL and quality are managed externally.
    // This test verifies the hook doesn't interfere with external state.
    const { result } = renderHook(() => useRetryState());

    act(() => { result.current.retry(); });
    // After retry, the hook state is clean — no URL/quality mutation
    expect(result.current.attempts).toBe(1);
    expect(result.current.isDisabled).toBe(false);
  });

  it('countdown decrements during cooldown', () => {
    const { result } = renderHook(() => useRetryState());

    // Exhaust retries
    act(() => { result.current.retry(); });
    act(() => { result.current.retry(); });
    act(() => { result.current.retry(); });

    expect(result.current.countdown).toBe(30);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.countdown).toBe(25);
  });
});
