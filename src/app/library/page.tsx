'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Sidebar, type LibraryFilter } from '@/components/layout/Sidebar';
import { GlassPanel } from '@/components/ui';
import { useLibrary, useCollections } from '@/hooks/useLibrary';
import {
  libraryStore,
  collectionsStore,
  thumbnailFor,
  formatDuration,
  formatFileSize,
  formatRelativeTime,
  isAudioItem,
  type LibraryItem,
  type Collection,
} from '@/lib/library-store';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const items = useLibrary();
  const collections = useCollections();

  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>({ kind: 'everything' });
  const [toast, setToast] = useState<string | null>(null);

  // ─── Defer locale-formatted date to client to avoid hydration mismatch ───
  const [dateLabel, setDateLabel] = useState<string>('');
  useEffect(() => {
    const today = new Date();
    const weekday = today.toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
    const dateStr = today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }).toLowerCase();
    setDateLabel(`${weekday}, ${dateStr}`);
  }, []);

  // ─── Filter + search pipeline ────────────────────────────────────────────
  const filtered = useMemo(() => {
    const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;
    const now = Date.now();
    return items.filter((it) => {
      switch (filter.kind) {
        case 'everything': return true;
        case 'recent': return now - it.savedAt < SEVEN_DAYS;
        case 'video': return !isAudioItem(it);
        case 'audio': return isAudioItem(it);
        case 'collection': return it.collections?.includes(filter.id) ?? false;
      }
    });
  }, [items, filter]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        String(it.platform).toLowerCase().includes(q) ||
        it.url.toLowerCase().includes(q),
    );
  }, [filtered, search]);

  const openItem = useMemo(
    () => (openId ? items.find((it) => it.id === openId) : undefined),
    [items, openId],
  );

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSubmitUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    window.location.href = `/?url=${encodeURIComponent(url)}`;
  }, [urlInput]);

  const handlePaste = useCallback(async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) setUrlInput(text);
      }
    } catch { /* clipboard permission denied */ }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const handleCopyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard?.writeText(url);
      showToast('link copied ✦');
    } catch {
      showToast('couldn\u2019t copy — your browser blocked it');
    }
  }, [showToast]);

  const handleDownloadAgain = useCallback((url: string) => {
    window.location.href = `/?url=${encodeURIComponent(url)}`;
  }, []);

  // ─── Section title derived from filter ──────────────────────────────────
  const sectionTitle = useMemo(() => {
    if (search) return 'Matches';
    switch (filter.kind) {
      case 'everything': return 'Lately saved';
      case 'recent': return 'This week';
      case 'video': return 'Videos';
      case 'audio': return 'Audio';
      case 'collection': {
        const c = collections.find((x) => x.id === filter.id);
        return c?.name ?? 'Collection';
      }
    }
  }, [filter, search, collections]);

  const totalCount = items.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] h-screen max-w-[1440px] mx-auto">
      <Sidebar filter={filter} onFilterChange={setFilter} />

      <main className="overflow-y-auto p-7 md:px-9 md:py-7 pb-16 relative">
        {/* Decorative spiral doodle */}
        <img
          src="/assets/doodle-spiral.svg"
          alt=""
          aria-hidden="true"
          className="absolute top-[30px] right-[110px] w-[70px] opacity-70 pointer-events-none hidden md:block"
        />

        {/* ─── TOPBAR ──────────────────────────────────────────────────── */}
        <header className="flex items-center gap-3.5 pb-6">
          <div>
            <h1
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
              className="text-[36px] leading-[1.05] text-[var(--color-ink-900)] m-0"
            >
              Your library
            </h1>
            <span
              style={{ fontFamily: 'var(--font-hand)', transform: 'rotate(-1deg)' }}
              className="text-[20px] text-[var(--color-ink-500)] inline-block"
              suppressHydrationWarning
            >
              {dateLabel ? `${dateLabel} · ` : ''}{totalCount} {totalCount === 1 ? 'thing' : 'things'} saved
            </span>
          </div>
        </header>

        {/* ─── URL BAR ────────────────────────────────────────────────── */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmitUrl(); }}
          className="flex items-center gap-2 py-2 pl-5 pr-2 bg-[var(--color-bg-surface)] rounded-[var(--radius-pill)] border border-[var(--color-line-medium)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_14px_36px_-18px_rgba(31,27,22,0.22)] mb-8"
        >
          <svg className="w-[18px] h-[18px] text-[var(--color-ink-300)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>
          </svg>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="paste a link to start..."
            style={{ fontFamily: 'var(--font-mono)' }}
            className="flex-1 border-0 outline-none bg-transparent text-[14px] text-[var(--color-ink-900)] py-2.5 placeholder:text-[var(--color-ink-300)] placeholder:italic placeholder:font-[family-name:var(--font-display)] placeholder:text-[16px]"
          />
          <button
            type="button"
            onClick={handlePaste}
            style={{ fontFamily: 'var(--font-grotesk)' }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-pill)] bg-transparent border border-[var(--color-line-medium)] text-[var(--color-ink-700)] font-medium text-[12px] cursor-pointer hover:bg-[var(--color-paper-200)] transition-colors duration-[160ms]"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
            paste
          </button>
          <button
            type="submit"
            style={{ fontFamily: 'var(--font-grotesk)' }}
            className="inline-flex items-center gap-2 px-[18px] py-2.5 rounded-[var(--radius-pill)] bg-[var(--color-ink-900)] text-[var(--color-paper-50)] font-semibold text-[13px] cursor-pointer border-0 hover:translate-y-[-1px] transition-transform duration-[160ms]"
          >
            Download
            <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
          </button>
        </form>

        {/* ─── SECTION HEADER ───────────────────────── */}
        {totalCount > 0 && (
          <div className="flex items-baseline gap-3 mt-2 mb-3.5">
            <h2
              style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
              className="text-[22px] leading-[1.1] text-[var(--color-ink-900)] m-0"
            >
              {sectionTitle}
            </h2>
            <span
              style={{ fontFamily: 'var(--font-mono)' }}
              className="text-[12px] text-[var(--color-ink-400)]"
            >
              {visible.length === filtered.length ? `${visible.length} total` : `${visible.length} of ${filtered.length}`}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-ink-300)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="search..."
                  aria-label="Search library"
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="pl-9 pr-3.5 py-2 rounded-[var(--radius-pill)] bg-transparent border border-[var(--color-line-medium)] text-[var(--color-ink-700)] text-[13px] outline-none focus:border-[var(--color-terra-500)] transition-colors duration-[160ms] w-[200px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── EMPTY / GRID ───────────────────────────────────────── */}
        {totalCount === 0 ? (
          <EmptyLibrary />
        ) : visible.length === 0 ? (
          <FilterEmpty filter={filter} search={search} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[18px]">
            {visible.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                collections={collections}
                onClick={() => setOpenId(item.id)}
              />
            ))}
          </div>
        )}

        {/* ─── DETAIL PANEL ────────────────────────────────────────────── */}
        {openItem && (
          <DetailPanel
            item={openItem}
            collections={collections}
            onClose={() => setOpenId(null)}
            onDelete={(id) => {
              libraryStore.remove(id);
              setOpenId(null);
            }}
            onCopyLink={handleCopyLink}
            onDownloadAgain={handleDownloadAgain}
          />
        )}

        {/* ─── TOAST ────────────────────────────────────────────────── */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            style={{ fontFamily: 'var(--font-hand)' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-[var(--radius-pill)] bg-[var(--color-ink-900)] text-[var(--color-paper-50)] text-[18px] shadow-[0_14px_36px_-12px_rgba(31,27,22,0.45)]"
          >
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 max-w-[480px] mx-auto">
      <img
        src="/assets/doodle-circles.svg"
        alt=""
        aria-hidden="true"
        className="h-[60px] opacity-50 mb-6"
      />
      <h2
        style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
        className="text-[36px] leading-[1.1] text-[var(--color-ink-900)] m-0 text-balance"
      >
        Nothing tucked away yet.
      </h2>
      <p
        style={{ fontFamily: 'var(--font-hand)' }}
        className="text-[24px] text-[var(--color-terra-600)] mt-2"
      >
        save your first video — it&rsquo;ll land here ✦
      </p>
      <p className="text-[var(--color-ink-500)] text-[15px] leading-[1.6] mt-4 max-w-[40ch]">
        Drop a YouTube, Instagram, or TikTok link on the home page. Anything you save shows up
        here, quiet and searchable.
      </p>
      <a
        href="/"
        style={{ fontFamily: 'var(--font-grotesk)' }}
        className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-[var(--radius-pill)] bg-[var(--color-ink-900)] text-[var(--color-paper-50)] font-semibold text-[13px] no-underline shadow-[0_8px_20px_-10px_rgba(31,27,22,0.45)] hover:translate-y-[-1px] hover:shadow-[0_14px_26px_-10px_rgba(31,27,22,0.5)] transition-[transform,box-shadow] duration-[160ms]"
      >
        Save a video
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </a>
    </div>
  );
}

function FilterEmpty({ filter, search }: { filter: LibraryFilter; search: string }) {
  const message = search
    ? `nothing matches "${search}"`
    : filter.kind === 'collection'
      ? 'nothing in this collection yet'
      : filter.kind === 'recent'
        ? 'nothing saved this week'
        : `no ${filter.kind} yet`;
  return (
    <div className="text-center py-16">
      <p style={{ fontFamily: 'var(--font-hand)' }} className="text-[28px] text-[var(--color-ink-400)]">
        {message}
      </p>
    </div>
  );
}

function LibraryCard({
  item,
  collections,
  onClick,
}: {
  item: LibraryItem;
  collections: Collection[];
  onClick: () => void;
}) {
  const thumb = thumbnailFor(item);
  const platformLabel = String(item.platform).toLowerCase();
  const fileLabel = item.resolution || item.format || 'video';
  const itemCollections = (item.collections ?? [])
    .map((cid) => collections.find((c) => c.id === cid))
    .filter((c): c is Collection => Boolean(c));

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      tabIndex={0}
      role="button"
      aria-label={`Open details for ${item.title}`}
      className="
        relative bg-[var(--color-bg-surface)] bg-blend-multiply
        rounded-[16px] border border-[var(--color-line-soft)]
        shadow-[var(--shadow-card)] overflow-hidden cursor-pointer
        transition-[transform,box-shadow] duration-[240ms] ease-[var(--ease-paper)]
        hover:translate-y-[-3px] hover:shadow-[var(--shadow-lift)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-terra-500)]
      "
    >
      <div
        className="aspect-[16/10] relative overflow-hidden border-b border-[rgba(31,27,22,0.1)]"
        style={{ background: thumb }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[rgba(247,243,238,0.92)] backdrop-blur-[8px] flex items-center justify-center shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] z-[2]">
          <svg width="12" height="14" viewBox="0 0 12 14"><path d="M1 1 L 1 13 L 11 7 Z" fill="#1F1B16"/></svg>
        </div>
        {item.duration && (
          <div
            style={{ fontFamily: 'var(--font-mono)' }}
            className="absolute right-2 bottom-2 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[rgba(31,27,22,0.65)] backdrop-blur-[6px] text-[var(--color-paper-50)] text-[10px] z-[2]"
          >
            {formatDuration(item.duration)}
          </div>
        )}
      </div>

      <div className="p-3.5 pb-4">
        <div
          style={{ fontFamily: 'var(--font-grotesk)' }}
          className="font-semibold text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-400)]"
        >
          {platformLabel}
        </div>
        <div
          style={{ fontFamily: 'var(--font-display)' }}
          className="font-medium text-[17px] leading-[1.15] text-[var(--color-ink-900)] mt-1 mb-1.5 line-clamp-2"
        >
          {item.title}
        </div>
        <div
          style={{ fontFamily: 'var(--font-mono)' }}
          className="flex gap-1.5 items-center flex-wrap text-[11px] text-[var(--color-ink-400)]"
        >
          <span
            style={{ fontFamily: 'var(--font-sans)' }}
            className="px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-paper-200)] text-[var(--color-ink-700)] text-[11px]"
          >
            {fileLabel}
          </span>
          <span>·</span>
          <span>{formatFileSize(item.fileSize)}</span>
          <span>·</span>
          <span>{formatRelativeTime(item.savedAt)}</span>
        </div>

        {/* Collection chips */}
        {itemCollections.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {itemCollections.map((c) => (
              <span
                key={c.id}
                style={{ fontFamily: 'var(--font-sans)' }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-paper-200)] text-[var(--color-ink-700)] text-[11px]"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                {c.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Detail panel — compact, with icon actions and collection picker ─────

function DetailPanel({
  item,
  collections,
  onClose,
  onDelete,
  onCopyLink,
  onDownloadAgain,
}: {
  item: LibraryItem;
  collections: Collection[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onCopyLink: (url: string) => void;
  onDownloadAgain: (url: string) => void;
}) {
  const thumb = thumbnailFor(item);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [newCollection, setNewCollection] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const sourceShort = (() => {
    try {
      const u = new URL(item.url);
      return `${u.host.replace(/^www\./, '')}${u.pathname.length > 1 ? u.pathname.slice(0, 12) + '…' : ''}`;
    } catch {
      return item.url.slice(0, 22) + '…';
    }
  })();

  const itemCollections = (item.collections ?? [])
    .map((cid) => collections.find((c) => c.id === cid))
    .filter((c): c is Collection => Boolean(c));

  const handleToggleCollection = (collectionId: string) => {
    libraryStore.toggleCollection(item.id, collectionId);
  };

  const handleCreateCollection = () => {
    const c = collectionsStore.create(newCollection);
    setNewCollection('');
    if (c) libraryStore.toggleCollection(item.id, c.id);
  };

  return (
    <>
      {/* Click-out overlay */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-20 bg-[rgba(31,27,22,0.35)] backdrop-blur-[3px]"
      />

      {/* Centered modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
      >
        <GlassPanel className="relative w-full max-w-[420px] max-h-[calc(100vh-3rem)] p-[22px] overflow-y-auto flex flex-col gap-3.5 pointer-events-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close detail panel"
            className="absolute right-3.5 top-3.5 w-[30px] h-[30px] rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-line-medium)] cursor-pointer inline-flex items-center justify-center text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)] transition-colors duration-[160ms] z-[5]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

        {/* Thumbnail */}
        <div
          className="aspect-[16/10] rounded-[14px] overflow-hidden border border-[rgba(31,27,22,0.15)] relative"
          style={{ background: thumb }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[rgba(247,243,238,0.92)] backdrop-blur-[8px] flex items-center justify-center shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)]">
            <svg width="14" height="16" viewBox="0 0 12 14"><path d="M1 1 L 1 13 L 11 7 Z" fill="#1F1B16"/></svg>
          </div>
          {item.duration && (
            <div
              style={{ fontFamily: 'var(--font-mono)' }}
              className="absolute right-2 bottom-2 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[rgba(31,27,22,0.65)] backdrop-blur-[6px] text-[var(--color-paper-50)] text-[10px]"
            >
              {formatDuration(item.duration)}
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div>
          <div
            style={{ fontFamily: 'var(--font-grotesk)' }}
            className="font-semibold text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-400)]"
          >
            {String(item.platform).toLowerCase()}
          </div>
          <h3
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
            className="text-[24px] leading-[1.12] text-[var(--color-ink-900)] mt-1 mb-1"
          >
            {item.title}
          </h3>
          <div
            style={{ fontFamily: 'var(--font-mono)' }}
            className="text-[11px] text-[var(--color-ink-500)] truncate"
            title={item.filename}
          >
            {item.filename}
          </div>
        </div>

        {/* Compact icon action bar */}
        <div className="flex items-center gap-1.5">
          <IconAction
            label="Download again"
            primary
            onClick={() => onDownloadAgain(item.url)}
            icon={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>}
          />
          <IconAction
            label="Copy link"
            onClick={() => onCopyLink(item.url)}
            icon={<><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>}
          />
          <IconAction
            label="Open original"
            href={item.url}
            icon={<><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>}
          />
          <div className="flex-1" />
          <IconAction
            label="Remove from library"
            danger
            onClick={() => {
              if (confirm(`Remove "${item.title}" from your library?`)) onDelete(item.id);
            }}
            icon={<><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>}
          />
        </div>

        {/* Collections picker */}
        <div>
          <button
            type="button"
            onClick={() => setCollectionsOpen((v) => !v)}
            aria-expanded={collectionsOpen}
            style={{ fontFamily: 'var(--font-grotesk)' }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] bg-transparent border border-[var(--color-line-medium)] text-[var(--color-ink-700)] font-medium text-[12px] hover:bg-[var(--color-paper-200)] transition-colors duration-[160ms]"
          >
            <span className="inline-flex items-center gap-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
              Collections
              {itemCollections.length > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)' }} className="text-[var(--color-ink-400)] text-[11px]">
                  · {itemCollections.length}
                </span>
              )}
            </span>
            <svg className={`w-3 h-3 transition-transform duration-[160ms] ${collectionsOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {/* Inline tag chips when collapsed */}
          {!collectionsOpen && itemCollections.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {itemCollections.map((c) => (
                <span
                  key={c.id}
                  style={{ fontFamily: 'var(--font-sans)' }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-paper-200)] text-[var(--color-ink-700)] text-[11px]"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                  {c.name}
                </span>
              ))}
            </div>
          )}

          {collectionsOpen && (
            <div className="mt-2 p-2 rounded-[12px] bg-[var(--color-bg-recessed)] border border-[var(--color-line-soft)]">
              {collections.length === 0 && (
                <p className="px-2 py-1 text-[12px] text-[var(--color-ink-500)] leading-[1.5]">
                  No collections yet. Make one below.
                </p>
              )}
              {collections.map((c) => {
                const isAssigned = item.collections?.includes(c.id) ?? false;
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] cursor-pointer hover:bg-[var(--color-paper-200)] transition-colors duration-[120ms]"
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => handleToggleCollection(c.id)}
                      className="sr-only peer"
                    />
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-[5px] border peer-checked:bg-[var(--color-ink-900)] peer-checked:border-[var(--color-ink-900)] transition-colors"
                      style={{ borderColor: isAssigned ? 'var(--color-ink-900)' : 'var(--color-line-medium)', background: isAssigned ? 'var(--color-ink-900)' : 'transparent' }}
                      aria-hidden="true"
                    >
                      {isAssigned && (
                        <svg className="w-2.5 h-2.5 text-[var(--color-paper-50)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} aria-hidden="true" />
                    <span className="text-[13px] text-[var(--color-ink-900)]">{c.name}</span>
                  </label>
                );
              })}

              {/* Inline create */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleCreateCollection(); }}
                className="flex items-center gap-1.5 mt-1.5 px-2"
              >
                <input
                  type="text"
                  value={newCollection}
                  onChange={(e) => setNewCollection(e.target.value)}
                  placeholder="+ new collection..."
                  aria-label="New collection name"
                  className="flex-1 px-2 py-1.5 rounded-[8px] bg-transparent border border-[var(--color-line-medium)] text-[12px] text-[var(--color-ink-900)] outline-none focus:border-[var(--color-terra-500)] transition-colors duration-[160ms]"
                />
                <button
                  type="submit"
                  disabled={!newCollection.trim()}
                  aria-label="Create collection"
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-ink-900)] text-[var(--color-paper-50)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-opacity duration-[160ms]"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Meta rows */}
        <div className="text-[12px]">
          {[
            ['Format', `${item.format ?? '—'}${item.resolution ? ` · ${item.resolution}` : ''}`],
            ['Size', formatFileSize(item.fileSize)],
            ['Saved', formatRelativeTime(item.savedAt)],
            ['Source', sourceShort],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center text-[var(--color-ink-700)] py-1.5 border-b border-dashed border-[var(--color-line-medium)] gap-3 last:border-b-0">
              <span
                style={{ fontFamily: 'var(--font-grotesk)' }}
                className="text-[var(--color-ink-400)] text-[10px] uppercase tracking-[0.12em] font-semibold shrink-0"
              >
                {label}
              </span>
              <span
                style={label === 'Source' ? { fontFamily: 'var(--font-mono)', fontSize: '11px' } : undefined}
                className="text-right truncate"
                title={typeof value === 'string' ? value : undefined}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        </GlassPanel>
      </div>
    </>
  );
}

function IconAction({
  label,
  icon,
  onClick,
  href,
  primary,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  danger?: boolean;
}) {
  const styles = primary
    ? 'bg-[var(--color-ink-900)] text-[var(--color-paper-50)] hover:bg-[var(--color-ink-700)]'
    : danger
      ? 'bg-transparent text-[var(--color-rouge-500)] border border-[var(--color-line-medium)] hover:bg-[var(--color-paper-200)]'
      : 'bg-transparent text-[var(--color-ink-700)] border border-[var(--color-line-medium)] hover:bg-[var(--color-paper-200)]';

  const className = `inline-flex items-center justify-center w-9 h-9 rounded-full cursor-pointer transition-colors duration-[160ms] ${styles}`;
  const inner = (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icon}
    </svg>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className={`${className} no-underline`}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      {inner}
    </button>
  );
}
