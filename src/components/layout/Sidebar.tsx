'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLibrary, useCollections } from '@/hooks/useLibrary';
import { collectionsStore, isAudioItem } from '@/lib/library-store';
import { Logo } from '@/components/ui/Logo';
import { ThemePicker } from '@/components/ThemeSwitcher';

// ─── Filter type — drives both sidebar selection and library grid ────────

export type LibraryFilter =
  | { kind: 'everything' }
  | { kind: 'recent' }
  | { kind: 'video' }
  | { kind: 'audio' }
  | { kind: 'collection'; id: string };

export function filterEquals(a: LibraryFilter, b: LibraryFilter): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'collection' && b.kind === 'collection') return a.id === b.id;
  return true;
}

// ─── Internals ────────────────────────────────────────────────────────────

interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  dot?: string;
  onClick?: () => void;
  onDelete?: () => void;
}

function NavItem({ icon, label, count, active, dot, onClick, onDelete }: NavItemProps) {
  return (
    <div
      className={`group relative flex items-center gap-3 px-3 py-[9px] rounded-[12px]
        text-[14px] font-[family-name:var(--font-sans)] cursor-pointer select-none
        transition-[background,color] duration-[160ms]
        ${active
          ? 'bg-[var(--color-ink-900)] text-[var(--color-paper-50)] shadow-[0_4px_10px_-4px_rgba(31,27,22,0.35)]'
          : 'text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)]'
        }
      `}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      tabIndex={0}
      role="button"
    >
      {dot ? (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} aria-hidden="true" />
      ) : (
        <span className="w-[17px] h-[17px] shrink-0">{icon}</span>
      )}
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span
          className={`ml-auto font-[family-name:var(--font-mono)] text-[11px] ${
            active ? 'text-[var(--color-paper-300)]' : 'text-[var(--color-ink-400)]'
          } ${onDelete ? 'group-hover:hidden' : ''}`}
        >
          {count}
        </span>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label={`Delete collection "${label}"`}
          className={`ml-auto hidden group-hover:inline-flex w-5 h-5 items-center justify-center rounded-full ${
            active ? 'text-[var(--color-paper-300)] hover:text-[var(--color-paper-50)]' : 'text-[var(--color-ink-400)] hover:text-[var(--color-rouge-500)]'
          } transition-colors duration-[120ms]`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}
    </div>
  );
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between font-[family-name:var(--font-grotesk)] font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-400)] px-3 pt-4 pb-2">
      <span>{children}</span>
      {action}
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    'folder-heart': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v1.5"/><path d="M13.9 17.45c-1.2-1.2-1.14-2.8-.2-3.73a2.43 2.43 0 0 1 3.44 0l.36.34.34-.34a2.43 2.43 0 0 1 3.45-.01v0c.95.95 1 2.53-.2 3.74L17.5 21Z"/></svg>,
    'clock': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    'music': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    'film': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>,
    'plus': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>,
  };
  return <>{icons[name] ?? null}</>;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

export interface SidebarProps {
  filter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  /** Mobile drawer open state */
  mobileOpen?: boolean;
  /** Called when the user dismisses the mobile drawer */
  onMobileClose?: () => void;
}

export function Sidebar({ filter, onFilterChange, mobileOpen = false, onMobileClose }: SidebarProps) {
  const items = useLibrary();
  const collections = useCollections();
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');

  const drawerRef = useRef<HTMLElement | null>(null);

  // ─── Mobile drawer UX plumbing ──────────────────────────────────────────
  // 1) Body scroll lock so the page behind doesn't scroll under the sheet.
  // 2) ESC dismisses the drawer.
  // 3) Focus is moved into the drawer when it opens, restored to the
  //    previously-focused element on close (typical sheet pattern).
  useEffect(() => {
    if (!mobileOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Lock scroll
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Send focus into the drawer on open, after the slide animation begins
    const t = window.setTimeout(() => {
      drawerRef.current?.focus();
    }, 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = original;
      previouslyFocused?.focus?.();
    };
  }, [mobileOpen, onMobileClose]);

  // Real counts
  const counts = useMemo(() => {
    const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;
    const now = Date.now();
    let everything = 0;
    let recent = 0;
    let video = 0;
    let audio = 0;
    const perCollection = new Map<string, number>();

    for (const it of items) {
      everything += 1;
      if (now - it.savedAt < SEVEN_DAYS) recent += 1;
      if (isAudioItem(it)) audio += 1;
      else video += 1;
      for (const cid of it.collections ?? []) {
        perCollection.set(cid, (perCollection.get(cid) ?? 0) + 1);
      }
    }

    return { everything, recent, video, audio, perCollection };
  }, [items]);

  // Auto-close the mobile drawer when the filter changes (after a tap on a nav item).
  const handleFilterChange = (next: LibraryFilter) => {
    onFilterChange(next);
    if (mobileOpen) onMobileClose?.();
  };

  const handleCreate = () => {
    const c = collectionsStore.create(newName);
    setNewName('');
    setCreatingNew(false);
    if (c) handleFilterChange({ kind: 'collection', id: c.id });
  };

  const handleDeleteCollection = (id: string) => {
    if (!confirm('Delete this collection? Videos in it will stay in your library.')) return;
    collectionsStore.remove(id);
    if (filter.kind === 'collection' && filter.id === id) {
      handleFilterChange({ kind: 'everything' });
    }
  };

  const isActive = (target: LibraryFilter) => filterEquals(filter, target);

  // ─── Inner content shared between desktop sidebar and mobile drawer ─────
  const inner = (
    <>
      {/* Wavy hand-drawn border on right edge — desktop only */}
      <div
        className="absolute right-0 top-0 bottom-0 w-px hidden lg:block"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1000' preserveAspectRatio='none'><path d='M0.5 0 C 0.2 100, 0.8 200, 0.5 300 S 0.2 500, 0.5 600 0.8 800, 0.5 1000' stroke='%231F1B16' stroke-opacity='0.18' fill='none' stroke-width='1' stroke-linecap='round'/></svg>")`,
          backgroundSize: '100% 100%',
        }}
      />

      {/* Brand + theme picker + close (mobile only) */}
      <div className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-[18px]">
        <a href="/" className="flex items-center gap-2.5 text-[var(--color-ink-900)]" aria-label="AuraVault home">
          <Logo className="h-[30px]" />
        </a>
        <div className="flex items-center gap-1">
          <ThemePicker align="top-left" />
          {/* Mobile-only close button */}
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close menu"
            className="lg:hidden inline-flex w-9 h-9 items-center justify-center rounded-full text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)] transition-colors duration-[160ms]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Library section */}
      <SectionLabel>Library</SectionLabel>
      <NavItem
        icon={<Icon name="folder-heart" />}
        label="Everything"
        count={counts.everything}
        active={isActive({ kind: 'everything' })}
        onClick={() => handleFilterChange({ kind: 'everything' })}
      />
      <NavItem
        icon={<Icon name="clock" />}
        label="Recent"
        count={counts.recent}
        active={isActive({ kind: 'recent' })}
        onClick={() => handleFilterChange({ kind: 'recent' })}
      />
      <NavItem
        icon={<Icon name="film" />}
        label="Video"
        count={counts.video}
        active={isActive({ kind: 'video' })}
        onClick={() => handleFilterChange({ kind: 'video' })}
      />
      <NavItem
        icon={<Icon name="music" />}
        label="Audio"
        count={counts.audio}
        active={isActive({ kind: 'audio' })}
        onClick={() => handleFilterChange({ kind: 'audio' })}
      />

      {/* Collections */}
      <SectionLabel
        action={
          <button
            type="button"
            onClick={() => setCreatingNew(true)}
            aria-label="New collection"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[var(--color-ink-400)] hover:text-[var(--color-ink-900)] hover:bg-[var(--color-paper-200)] transition-colors duration-[120ms]"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </button>
        }
      >
        Collections
      </SectionLabel>

      {collections.length === 0 && !creatingNew && (
        <p className="px-3 pb-1 text-[12px] text-[var(--color-ink-400)] leading-[1.45]">
          No collections yet. Tap <span className="inline-block align-middle"><svg className="inline w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></span> to make one.
        </p>
      )}

      {collections.map((c) => (
        <NavItem
          key={c.id}
          dot={c.color}
          label={c.name}
          count={counts.perCollection.get(c.id) ?? 0}
          active={isActive({ kind: 'collection', id: c.id })}
          onClick={() => handleFilterChange({ kind: 'collection', id: c.id })}
          onDelete={() => handleDeleteCollection(c.id)}
        />
      ))}

      {creatingNew && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          className="px-3 py-2"
        >
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => { if (!newName.trim()) setCreatingNew(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setNewName(''); setCreatingNew(false); } }}
            placeholder="collection name..."
            aria-label="New collection name"
            className="w-full px-2 py-1.5 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-line-medium)] text-[13px] text-[var(--color-ink-900)] outline-none focus:border-[var(--color-terra-500)] transition-colors duration-[160ms]"
          />
        </form>
      )}

      {/* Pinned tip */}
      <div className="mt-auto p-3.5 bg-[var(--color-paper-200)] rounded-[14px] relative">
        <div
          className="absolute -top-2.5 left-[18px] w-[60px] h-[18px] bg-[rgba(201,184,158,0.55)] border border-[rgba(31,27,22,0.08)] shadow-[0_4px_8px_-4px_rgba(31,27,22,0.3)]"
          style={{ transform: 'rotate(-5deg)' }}
        />
        <div className="font-[family-name:var(--font-hand)] text-[20px] text-[var(--color-ink-700)] leading-tight mb-1">
          saved here, just here —
        </div>
        <div className="text-[var(--color-ink-500)] text-[12px] leading-[1.45]">
          your library lives in this browser. clear site data and it&rsquo;s gone. the videos themselves stay in your downloads folder.
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible from lg up */}
      <aside className="
        hidden lg:flex
        bg-[var(--color-bg-glass)] backdrop-blur-[14px] backdrop-saturate-[1.04]
        border-r border-[var(--color-line-soft)]
        p-[22px_18px] flex-col gap-2
        relative
        overflow-y-auto
      ">
        {inner}
      </aside>

      {/* Mobile drawer — animated overlay + slide-in panel */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden">
            {/* Backdrop — fades, click-out dismisses */}
            <motion.div
              key="backdrop"
              onClick={onMobileClose}
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-[rgba(31,27,22,0.45)]"
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(3px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            />

            {/* Drawer — slides in from the left */}
            <motion.aside
              key="drawer"
              ref={drawerRef as React.RefObject<HTMLElement>}
              role="dialog"
              aria-modal="true"
              aria-label="Library navigation"
              tabIndex={-1}
              className="
                fixed left-0 top-0 bottom-0 z-50
                w-[300px] max-w-[88vw]
                bg-[var(--color-bg-canvas)]
                border-r border-[var(--color-line-soft)]
                shadow-[0_28px_80px_-24px_rgba(31,27,22,0.55)]
                p-[18px_14px] flex flex-col gap-2
                overflow-y-auto outline-none
              "
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {inner}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
