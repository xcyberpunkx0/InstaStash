'use client';

import React from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  dot?: string;
}

function NavItem({ icon, label, count, active, dot }: NavItemProps) {
  return (
    <a
      className={`
        flex items-center gap-3 px-3 py-[9px] rounded-[12px]
        text-[14px] font-[family-name:var(--font-sans)] cursor-pointer select-none no-underline
        transition-[background,color] duration-[160ms]
        ${active
          ? 'bg-[var(--color-ink-900)] text-[var(--color-paper-50)] shadow-[0_4px_10px_-4px_rgba(31,27,22,0.35)]'
          : 'text-[var(--color-ink-700)] hover:bg-[var(--color-paper-200)]'
        }
      `}
    >
      {dot ? (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
      ) : (
        <span className="w-[17px] h-[17px] shrink-0">{icon}</span>
      )}
      {label}
      {count !== undefined && (
        <span className={`ml-auto font-[family-name:var(--font-mono)] text-[11px] ${active ? 'text-[var(--color-paper-300)]' : 'text-[var(--color-ink-400)]'}`}>
          {count}
        </span>
      )}
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-[family-name:var(--font-grotesk)] font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-400)] px-3 pt-4 pb-2">
      {children}
    </div>
  );
}

function Icon({ name }: { name: string }) {
  // Simple SVG icons matching Lucide style
  const icons: Record<string, React.ReactNode> = {
    'folder-heart': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v1.5"/><path d="M13.9 17.45c-1.2-1.2-1.14-2.8-.2-3.73a2.43 2.43 0 0 1 3.44 0l.36.34.34-.34a2.43 2.43 0 0 1 3.45-.01v0c.95.95 1 2.53-.2 3.74L17.5 21Z"/></svg>,
    'clock': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    'bookmark': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>,
    'music': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    'download': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    'inbox': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
    'archive': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>,
  };
  return <>{icons[name] ?? null}</>;
}

export function Sidebar() {
  return (
    <aside className="
      bg-[rgba(247,243,238,0.7)] backdrop-blur-[14px] backdrop-saturate-[1.04]
      border-r border-[var(--color-line-soft)]
      p-[22px_18px] flex flex-col gap-2
      relative
      hidden lg:flex
    ">
      {/* Wavy hand-drawn border on right edge */}
      <div
        className="absolute right-0 top-0 bottom-0 w-px"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1000' preserveAspectRatio='none'><path d='M0.5 0 C 0.2 100, 0.8 200, 0.5 300 S 0.2 500, 0.5 600 0.8 800, 0.5 1000' stroke='%231F1B16' stroke-opacity='0.18' fill='none' stroke-width='1' stroke-linecap='round'/></svg>")`,
          backgroundSize: '100% 100%',
        }}
      />

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-[18px]">
        <img src="/assets/logo.svg" alt="AuraVault" className="h-[30px]" />
      </div>

      {/* Library section */}
      <SectionLabel>Library</SectionLabel>
      <NavItem icon={<Icon name="folder-heart" />} label="Everything" count={128} active />
      <NavItem icon={<Icon name="clock" />} label="Recent" count={12} />
      <NavItem icon={<Icon name="bookmark" />} label="Saved" count={34} />
      <NavItem icon={<Icon name="music" />} label="Audio" count={22} />

      {/* Activity section */}
      <SectionLabel>Activity</SectionLabel>
      <NavItem icon={<Icon name="download" />} label="Downloads" count={3} />
      <NavItem icon={<Icon name="inbox" />} label="Inbox" count={7} />
      <NavItem icon={<Icon name="archive" />} label="Archive" />

      {/* Collections */}
      <SectionLabel>Collections</SectionLabel>
      <NavItem dot="#C97B4E" icon={null} label="Lecture clips" />
      <NavItem dot="#7A8A6F" icon={null} label="Rain & lo-fi" />
      <NavItem dot="#6B5544" icon={null} label="Reference reels" />

      {/* Pinned note */}
      <div className="mt-auto p-3.5 bg-[var(--color-paper-200)] rounded-[14px] relative">
        {/* Tape decoration */}
        <div className="absolute -top-2.5 left-[18px] w-[60px] h-[18px] bg-[rgba(201,184,158,0.55)] border border-[rgba(31,27,22,0.08)] shadow-[0_4px_8px_-4px_rgba(31,27,22,0.3)]" style={{ transform: 'rotate(-5deg)' }} />
        <div className="font-[family-name:var(--font-hand)] text-[22px] text-[var(--color-ink-700)] leading-none mb-1">
          v2.4 is out —
        </div>
        <div className="text-[var(--color-ink-500)] text-[12px] leading-[1.4]">
          subtitles, batch downloads, and a brand-new dark mode. read the notes.
        </div>
      </div>
    </aside>
  );
}
