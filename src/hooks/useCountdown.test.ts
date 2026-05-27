import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with remaining = 0 and isActive = false', () => {
    const { result } = renderHook(() => useCountdown());
    expect(result.current.remaining).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('starts a countdown and decrements each second', () => {
    const { result } = renderHook(() => useCountdown());

    act(() => {
      result.current.start(5);
    });

    expect(result.current.remaining).toBe(5);
    expect(result.current.isActive).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remaining).toBe(4);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remaining).toBe(3);
  });

  it('reaches 0 and calls onComplete', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(onComplete));

    act(() => {
      result.current.start(3);
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.remaining).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reset cancels the countdown', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(onComplete));

    act(() => {
      result.current.start(10);
    });

    expect(result.current.remaining).toBe(10);

    act(() => {
      result.current.reset();
    });

    expect(result.current.remaining).toBe(0);
    expect(result.current.isActive).toBe(false);

    // Advancing time should not trigger onComplete
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does nothing when start is called with 0 or negative', () => {
    const { result } = renderHook(() => useCountdown());

    act(() => {
      result.current.start(0);
    });
    expect(result.current.remaining).toBe(0);
    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.start(-5);
    });
    expect(result.current.remaining).toBe(0);
    expect(result.current.isActive).toBe(false);
  });
});
