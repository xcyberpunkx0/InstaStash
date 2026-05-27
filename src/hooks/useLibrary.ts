'use client';

import { useSyncExternalStore } from 'react';
import { libraryStore, collectionsStore, type LibraryItem, type Collection } from '@/lib/library-store';

const EMPTY_ITEMS: LibraryItem[] = [];
const EMPTY_COLLECTIONS: Collection[] = [];

// ─── Library ───────────────────────────────────────────────────────────────
//
// useSyncExternalStore demands a STABLE snapshot reference between renders
// unless the underlying store changed — calling `.list()` directly returns
// a fresh sorted array every time and triggers an infinite loop. We cache
// the snapshot and invalidate it only when the store dispatches a change.

let cachedItems: LibraryItem[] = EMPTY_ITEMS;
let itemsDirty = true;

function getItems(): LibraryItem[] {
  if (itemsDirty) {
    cachedItems = libraryStore.list();
    itemsDirty = false;
  }
  return cachedItems;
}

function subscribeItems(onChange: () => void): () => void {
  return libraryStore.subscribe(() => {
    itemsDirty = true;
    onChange();
  });
}

function getServerItems(): LibraryItem[] {
  return EMPTY_ITEMS;
}

export function useLibrary(): LibraryItem[] {
  return useSyncExternalStore(subscribeItems, getItems, getServerItems);
}

// ─── Collections ──────────────────────────────────────────────────────────

let cachedCollections: Collection[] = EMPTY_COLLECTIONS;
let collectionsDirty = true;

function getCollections(): Collection[] {
  if (collectionsDirty) {
    cachedCollections = collectionsStore.list();
    collectionsDirty = false;
  }
  return cachedCollections;
}

function subscribeCollections(onChange: () => void): () => void {
  return collectionsStore.subscribe(() => {
    collectionsDirty = true;
    onChange();
  });
}

function getServerCollections(): Collection[] {
  return EMPTY_COLLECTIONS;
}

export function useCollections(): Collection[] {
  return useSyncExternalStore(subscribeCollections, getCollections, getServerCollections);
}
