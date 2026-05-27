'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_THEME_ID,
  applyTheme,
  readStoredTheme,
  writeStoredTheme,
} from '@/lib/themes';

/**
 * Reactive theme state. Renders DEFAULT_THEME_ID on the server (and the
 * very first client render) to avoid hydration mismatches, then promotes
 * to the persisted value once mounted.
 */
export function useTheme(): [string, (id: string) => void] {
  const [theme, setTheme] = useState<string>(DEFAULT_THEME_ID);

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const update = useCallback((id: string) => {
    setTheme(id);
    writeStoredTheme(id);
    applyTheme(id);
  }, []);

  return [theme, update];
}
