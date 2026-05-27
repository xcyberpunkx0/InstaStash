'use client';

import { useSyncExternalStore } from 'react';
import { libraryStore, type LibraryItem } from '@/lib/library-store';

const EMPTY: LibraryItem[] = [];

/**
 * Reactive subscription to the library store. Re-renders the consuming
 * component whenever an item is added, removed, updated, or storage changes
 * in another tab. SSR-safe (returns [] on the server).
 *
 * NOTE: useSyncExternalStore demands a STABLE snapshot reference between
 * renders unless the store actually changed — calling `libraryStore.list()`
 * would return a fresh sorted array every time and cause an infinite loop.
 * We cache the last list and only re-compute it after a real change.
 */
let cachedSnapshot: LibraryItem[] = EMPTY;
let needsRefresh = true;

function getSnapshot(): LibraryItem[] {
  if (needsRefresh) {
    cachedSnapshot = libraryStore.list();
    needsRefresh = false;
  }
  return cachedSnapshot;
}

function subscribe(onChange: () => void): () => void {
  return libraryStore.subscribe(() => {
    needsRefresh = true;
    onChange();
  });
}

function getServerSnapshot(): LibraryItem[] {
  return EMPTY;
}

export function useLibrary(): LibraryItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
