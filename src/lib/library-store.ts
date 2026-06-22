// ─── Library Store ─────────────────────────────────────────────────────────
//
// localStorage-backed persistence for downloaded videos. Synchronous reads &
// writes are fine for the volumes we care about (a few hundred entries at most),
// and keep the UI logic dead simple. A change subscription lets multiple tabs
// (and useSyncExternalStore consumers) stay in sync.
//
// All methods are SSR-safe — they short-circuit on the server.

import type { Platform } from '@/types';

const STORAGE_KEY = 'instastash.library.v1';
const COLLECTIONS_KEY = 'instastash.collections.v1';
const STORAGE_EVENT = 'instastash:library-changed';

export interface LibraryItem {
  id: string;
  url: string;
  title: string;
  platform: Platform | string;
  thumbnail?: string;
  duration?: number; // seconds
  fileSize?: number; // bytes
  resolution?: string;
  format?: string;
  filename: string;
  savedAt: number; // epoch ms
  note?: string;
  collections?: string[];
}

// Audio formats — used by sidebar/library to bucket items into video vs audio
export const AUDIO_EXTS = new Set(['mp3', 'm4a', 'flac', 'wav', 'opus', 'ogg', 'aac']);

export function isAudioItem(item: Pick<LibraryItem, 'format'>): boolean {
  return AUDIO_EXTS.has((item.format ?? '').toLowerCase());
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readAll(): LibraryItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LibraryItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: LibraryItem[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  } catch {
    // quota / privacy mode — silently ignore
  }
}

function generateId(): string {
  if (isBrowser() && 'crypto' in window && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `lib_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Public API ────────────────────────────────────────────────────────────

export const libraryStore = {
  list(): LibraryItem[] {
    return readAll().sort((a, b) => b.savedAt - a.savedAt);
  },

  get(id: string): LibraryItem | undefined {
    return readAll().find((it) => it.id === id);
  },

  add(item: Omit<LibraryItem, 'id' | 'savedAt'>): LibraryItem {
    const newItem: LibraryItem = {
      ...item,
      id: generateId(),
      savedAt: Date.now(),
      collections: item.collections ?? [],
    };
    writeAll([newItem, ...readAll()]);
    return newItem;
  },

  remove(id: string): void {
    writeAll(readAll().filter((it) => it.id !== id));
  },

  update(id: string, patch: Partial<Omit<LibraryItem, 'id'>>): void {
    writeAll(readAll().map((it) => (it.id === id ? { ...it, ...patch } : it)));
  },

  clear(): void {
    writeAll([]);
  },

  /** Toggle membership of an item in a collection. */
  toggleCollection(itemId: string, collectionId: string): void {
    const items = readAll();
    const updated = items.map((it) => {
      if (it.id !== itemId) return it;
      const current = new Set(it.collections ?? []);
      if (current.has(collectionId)) current.delete(collectionId);
      else current.add(collectionId);
      return { ...it, collections: Array.from(current) };
    });
    writeAll(updated);
  },

  /** Subscribe to library changes (returns an unsubscribe fn). */
  subscribe(listener: () => void): () => void {
    if (!isBrowser()) return () => {};
    const handler = () => listener();
    window.addEventListener(STORAGE_EVENT, handler);
    window.addEventListener('storage', handler); // cross-tab sync
    return () => {
      window.removeEventListener(STORAGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  },
};

// ─── Collections store ─────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  color: string; // hex
  createdAt: number;
}

const DEFAULT_COLORS = ['#C97B4E', '#7A8A6F', '#6B5544', '#B0673E', '#62725A', '#B25548'];

function readCollections(): Collection[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Collection[]) : [];
  } catch {
    return [];
  }
}

function writeCollections(items: Collection[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  } catch {
    /* ignore */
  }
}

export const collectionsStore = {
  list(): Collection[] {
    return readCollections().sort((a, b) => a.createdAt - b.createdAt);
  },

  create(name: string): Collection | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = readCollections();
    // Avoid dupes — case-insensitive name match
    const match = existing.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (match) return match;
    const next: Collection = {
      id: generateId(),
      name: trimmed,
      color: DEFAULT_COLORS[existing.length % DEFAULT_COLORS.length],
      createdAt: Date.now(),
    };
    writeCollections([...existing, next]);
    return next;
  },

  remove(id: string): void {
    writeCollections(readCollections().filter((c) => c.id !== id));
    // Also strip from every item that references it
    const items = readAll();
    const updated = items.map((it) =>
      it.collections?.includes(id)
        ? { ...it, collections: it.collections.filter((c) => c !== id) }
        : it,
    );
    writeAll(updated);
  },

  rename(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    writeCollections(readCollections().map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
  },

  /** Same subscribe stream as the library — both fire `STORAGE_EVENT`. */
  subscribe(listener: () => void): () => void {
    return libraryStore.subscribe(listener);
  },
};

// ─── Display helpers ───────────────────────────────────────────────────────

export function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '—';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatRelativeTime(epoch: number): string {
  const diff = Date.now() - epoch;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(epoch).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Generate a deterministic CSS gradient thumbnail based on the item id/title.
 * Cycles through the 8 evocative scenes from the design system.
 */
const SCENE_GRADIENTS: string[] = [
  // window: golden hour interior
  `radial-gradient(38% 60% at 72% 38%, #FFE0B0 0%, #F0B879 35%, transparent 70%), radial-gradient(60% 70% at 25% 75%, #4A2E20 0%, transparent 65%), linear-gradient(140deg, #3A2618 0%, #1B0F08 100%)`,
  // bowl: warm clay
  `radial-gradient(70% 55% at 50% 28%, #F4D2A6 0%, #C9A47A 45%, transparent 75%), linear-gradient(180deg, #B98B5F 0%, #6B4530 100%)`,
  // chalk
  `radial-gradient(70% 60% at 30% 40%, #475A50 0%, transparent 65%), linear-gradient(180deg, #2A3A33 0%, #16201C 100%)`,
  // rain
  `radial-gradient(40% 30% at 70% 30%, rgba(241, 220, 188, 0.55) 0%, transparent 65%), linear-gradient(180deg, #3F4F4D 0%, #1F2A29 100%)`,
  // vinyl
  `radial-gradient(60% 60% at 50% 50%, #6B5544 0%, transparent 60%), linear-gradient(135deg, #C97B4E 0%, #6B4530 100%)`,
  // page
  `linear-gradient(90deg, #F7F3EE 0%, #EFE7DA 48%, #D9CFB8 50%, #EFE7DA 52%, #F7F3EE 100%)`,
  // dusk
  `linear-gradient(180deg, #F2C09A 0%, #D88C5C 40%, #6B3F2A 100%)`,
  // lamp
  `radial-gradient(45% 55% at 22% 35%, #F2D9A6 0%, #C97B4E 25%, transparent 60%), linear-gradient(140deg, #2A1F18 0%, #1B130E 100%)`,
];

export function thumbnailFor(item: Pick<LibraryItem, 'id' | 'title' | 'thumbnail'>): string {
  if (item.thumbnail) return `url("${item.thumbnail}")`;
  // simple stable hash
  const seed = item.id || item.title || '';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return SCENE_GRADIENTS[hash % SCENE_GRADIENTS.length];
}
