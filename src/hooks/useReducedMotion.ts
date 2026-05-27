'use client';

import { useState, useEffect } from 'react';

/**
 * Hook that detects the user's `prefers-reduced-motion` media query preference.
 * Returns `true` when the user prefers reduced motion, `false` otherwise.
 *
 * Use this hook to conditionally disable non-essential animations
 * while preserving essential status-communicating animations (e.g., loading indicators).
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}
