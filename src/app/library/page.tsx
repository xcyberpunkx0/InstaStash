'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { GlassPanel } from '@/components/ui';
import { useLibrary } from '@/hooks/useLibrary';
import {
  libraryStore,
  thumbnailFor,
  formatDuration,
  formatFileSize,
  formatRelativeTime,
  type LibraryItem,
} from '@/lib/library-store';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const items = useLibrary();
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [urlInput, setUrlInput] = useState('');

  // ─── Defer locale-formatted date to client to avoid hydration mismatch ───
  const [dateLabel, setDateLabel] = useState<string>('');
  useEffect(() => {
    const today = new Date();
    const weekday = today.toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
    const dateStr = today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }).toLowerCase();
    setDateLabel(`${weekday}, ${dateStr}`);
  }, []);

  // Filter by search
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        String(it.platform).toLowerCase().includes(q) ||
        it.url.toLowerCase().includes(q),
    );
  }, [items, search]);

  const openItem = useMemo(
    () => (openId ? items.find((it) => it.id === openId) : undefined),
    [items, openId],
  );

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

  const totalCount = items.length;
  const recentCount = items.filter((it) => Date.now() - it.savedAt < 1000 * 60 * 60 * 24 * 7).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] h-screen max-w-[1440px] mx-auto">
      <Sidebar />

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

        {/* ─── SECTION HEADER: "Lately saved" ───────────────────────── */}
        {totalCount > 0 && (
          <div className="flex items-baseline gap-3 mt-2 mb-3.5">
            <h2
              style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
              className="text-[22px] leading-[1.1] text-[var(--color-ink-900)] m-0"
            >
              {search ? 'Matches' : 'Lately saved'}
            </h2>
            <span
              style={{ fontFamily: 'var(--font-mono)' }}
              className="text-[12px] text-[var(--color-ink-400)]"
            >
              {visible.length === totalCount ? `${totalCount} total` : `${visible.length} of ${totalCount}`}
              {recentCount > 0 && !search && ` · ${recentCount} this week`}
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

        {/* ─── EMPTY STATE / GRID ───────────────────────────────────── */}
        {totalCount === 0 ? (
          <EmptyLibrary />
        ) : visible.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ fontFamily: 'var(--font-hand)' }} className="text-[28px] text-[var(--color-ink-400)]">
              nothing matches &ldquo;{search}&rdquo;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[18px]">
            {visible.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                onClick={() => setOpenId(item.id)}
              />
            ))}
          </div>
        )}

        {/* ─── DETAIL PANEL ────────────────────────────────────────────── */}
        {openItem && (
          <DetailPanel
            item={openItem}
            onClose={() => setOpenId(null)}
            onDelete={(id) => {
              libraryStore.remove(id);
              setOpenId(null);
            }}
          />
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

function LibraryCard({ item, onClick }: { item: LibraryItem; onClick: () => void }) {
  const thumb = thumbnailFor(item);
  const platformLabel = String(item.platform).toLowerCase();
  const fileLabel = item.resolution || item.format || 'video';

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
      </div>
    </article>
  );
}

function DetailPanel({
  item,
  onClose,
  onDelete,
}: {
  item: LibraryItem;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const thumb = thumbnailFor(item);
  const savedDate = new Date(item.savedAt).toLocaleString(undefined, {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).toLowerCase();

  const sourceShort = (() => {
    try {
      const u = new URL(item.url);
      return `${u.host.replace(/^www\./, '')}${u.pathname.length > 1 ? u.pathname.slice(0, 12) + '…' : ''}`;
    } catch {
      return item.url.slice(0, 22) + '…';
    }
  })();

  const rows: [string, string | React.ReactNode][] = [
    ['Format', `${item.format ?? '—'}${item.resolution ? ` · ${item.resolution}` : ''}`],
    ['Size', formatFileSize(item.fileSize)],
    ['Duration', formatDuration(item.duration)],
    ['Saved', formatRelativeTime(item.savedAt)],
    ['Source', <span key="src" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{sourceShort}</span>],
  ];

  return (
    <GlassPanel className="fixed right-6 top-6 bottom-6 w-[360px] p-[22px] overflow-y-auto z-30 flex flex-col gap-3.5">
      <button
        onClick={onClose}
        aria-label="Close detail panel"
        className="absolute right-3.5 top-3.5 w-[30px] h-[30px] rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-line-medium)] cursor-pointer inline-flex items-center justify-center text-[var(--color-ink-700)] z-[5]"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>

      <div
        className="aspect-[16/10] rounded-[14px] overflow-hidden border border-[rgba(31,27,22,0.15)] relative"
        style={{ background: thumb }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[rgba(247,243,238,0.92)] backdrop-blur-[8px] flex items-center justify-center shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)]">
          <svg width="12" height="14" viewBox="0 0 12 14"><path d="M1 1 L 1 13 L 11 7 Z" fill="#1F1B16"/></svg>
        </div>
      </div>

      <div>
        <div
          style={{ fontFamily: 'var(--font-grotesk)' }}
          className="font-semibold text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-400)]"
        >
          {String(item.platform).toLowerCase()}
        </div>
        <h3
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
          className="text-[24px] leading-[1.12] text-[var(--color-ink-900)] mt-1 mb-0.5"
        >
          {item.title}
        </h3>
        <div
          style={{ fontFamily: 'var(--font-mono)' }}
          className="text-[12px] text-[var(--color-ink-500)]"
        >
          saved {savedDate} · {item.filename}
        </div>
      </div>

      <div>
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between items-center text-[13px] text-[var(--color-ink-700)] py-1.5 border-b border-dashed border-[var(--color-line-medium)] gap-3">
            <span
              style={{ fontFamily: 'var(--font-grotesk)' }}
              className="text-[var(--color-ink-400)] text-[11px] uppercase tracking-[0.12em] font-semibold shrink-0"
            >
              {label}
            </span>
            <span className="text-right truncate">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-1">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: 'var(--font-grotesk)' }}
          className="flex-1 py-[11px] px-3.5 rounded-[12px] bg-[var(--color-ink-900)] text-[var(--color-paper-50)] cursor-pointer font-semibold text-[13px] inline-flex items-center justify-center gap-2 no-underline"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          Open original
        </a>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Remove "${item.title}" from your library?`)) onDelete(item.id);
          }}
          aria-label="Delete from library"
          style={{ fontFamily: 'var(--font-grotesk)' }}
          className="py-[11px] px-3.5 rounded-[12px] bg-transparent text-[var(--color-rouge-500)] border border-[var(--color-line-medium)] cursor-pointer font-semibold text-[13px] inline-flex items-center justify-center gap-2 hover:bg-[var(--color-paper-200)] transition-colors duration-[160ms]"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Remove
        </button>
      </div>
    </GlassPanel>
  );
}
