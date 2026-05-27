'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { THEMES } from '@/lib/themes';
import { useTheme } from '@/hooks/useTheme';

/**
 * ThemePicker — an inline palette button that opens a small popover.
 *
 * UX choices (deliberately not a floating FAB):
 *  - Lives inline in real toolbars (header, sidebar) so users find it where
 *    they expect controls, not as a hovering cousin of a chat tool.
 *  - The trigger is a circular button styled like the rest of the app's
 *    icon buttons — paper border, terra accent dot in the corner.
 *  - The popover is anchored to the trigger and opens above-or-below
 *    depending on `align`, so it adapts to where you put the button.
 *  - A pencil-mark on the trigger reveals which accent the active theme
 *    uses, giving an at-a-glance preview without opening the popover.
 *
 * Usage:
 *   <ThemePicker />                          // anchor bottom-right by default
 *   <ThemePicker align="bottom-left" />      // for left-side toolbars
 *   <ThemePicker label="Theme" showLabel />  // labeled pill instead of icon
 */

export interface ThemePickerProps {
  /** Where the popover opens, relative to the trigger. */
  align?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Render a labeled pill instead of an icon-only round button. */
  showLabel?: boolean;
  /** Override the visible label when `showLabel` is on. */
  label?: string;
  /** Tailwind classes appended to the trigger. */
  className?: string;
}

const POSITION: Record<NonNullable<ThemePickerProps['align']>, string> = {
  'top-right':    'left-0 top-full mt-2',
  'top-left':     'right-0 top-full mt-2',
  'bottom-right': 'left-0 bottom-full mb-2',
  'bottom-left':  'right-0 bottom-full mb-2',
};

export function ThemePicker({
  align = 'top-right',
  showLabel = false,
  label = 'Theme',
  className = '',
}: ThemePickerProps) {
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click-outside + Escape close
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  // Three on-theme swatches sampled live from the current theme tokens.
  // The trigger renders them as a tiny stacked-disc palette mark.
  const swatches = useMemo(
    () => [current.swatch.accent, current.swatch.ink, current.swatch.paper],
    [current],
  );

  return (
    <div ref={wrapRef} className={`relative inline-block ${className}`}>
      {/* Trigger — three overlapping ink-drops in the active theme's colors. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Theme: ${current.name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Theme · ${current.name}`}
        style={showLabel ? { fontFamily: 'var(--font-grotesk)' } : undefined}
        className={`
          group relative inline-flex items-center justify-center
          ${showLabel
            ? 'gap-2 px-3 py-2 rounded-[var(--radius-pill)] text-[12px] font-medium hover:bg-[var(--color-paper-200)]'
            : 'w-9 h-9 rounded-full hover:bg-[var(--color-paper-200)]'
          }
          bg-transparent border-0 text-[var(--color-ink-700)] cursor-pointer
          transition-colors duration-[160ms]
        `}
      >
        <InkDrops swatches={swatches} className="w-[22px] h-[22px] transition-transform duration-[200ms] ease-[var(--ease-spring)] group-hover:rotate-[-8deg]" />
        {showLabel && <span>{label}</span>}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="theme-popover"
            role="dialog"
            aria-label="Choose a theme"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
            className={`
              absolute z-50 ${POSITION[align]}
              w-[260px] p-2.5 rounded-[16px]
              bg-[var(--color-bg-surface)]
              border border-[var(--color-line-medium)]
              shadow-[0_24px_48px_-20px_rgba(15,17,23,0.35),0_0_0_1px_rgba(255,255,255,0.4)_inset]
            `}
          >
            <div
              style={{ fontFamily: 'var(--font-grotesk)' }}
              className="px-2.5 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-400)]"
            >
              Theme
            </div>

            <div className="flex flex-col gap-0.5">
              {THEMES.map((t) => {
                const isActive = t.id === theme;
                return (
                  <button
                    key={t.id || 'default'}
                    type="button"
                    onClick={() => { setTheme(t.id); setOpen(false); }}
                    aria-pressed={isActive}
                    aria-label={`${t.name} theme`}
                    title={t.description}
                    className={`
                      relative flex items-center gap-3 px-2.5 py-2 rounded-[10px] cursor-pointer text-left
                      transition-[background-color] duration-[120ms]
                      ${isActive ? 'bg-[var(--color-paper-200)]' : 'bg-transparent hover:bg-[var(--color-paper-200)]'}
                    `}
                  >
                    {/* Swatch tile — paper / ink / accent */}
                    <span
                      aria-hidden="true"
                      className="relative w-7 h-7 rounded-[8px] overflow-hidden border border-[var(--color-line-soft)] shrink-0"
                      style={{ background: t.swatch.paper }}
                    >
                      <span className="absolute left-0 right-0 bottom-0 h-1/2" style={{ background: t.swatch.ink }} />
                      <span
                        className="absolute right-0.5 bottom-0.5 w-2 h-2 rounded-full border border-[rgba(255,255,255,0.4)]"
                        style={{ background: t.swatch.accent }}
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        style={{ fontFamily: 'var(--font-grotesk)' }}
                        className="block text-[12px] font-semibold text-[var(--color-ink-900)] truncate"
                      >
                        {t.name}
                      </span>
                      <span className="block text-[10px] text-[var(--color-ink-500)] truncate">
                        {t.description}
                      </span>
                    </span>

                    {isActive && (
                      <svg className="w-3.5 h-3.5 text-[var(--color-terra-600)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Backward-compat alias so any old imports of <ThemeSwitcher/> keep working.
export const ThemeSwitcher = ThemePicker;

/**
 * InkDrops — three overlapping ink-droplet shapes in the active theme's
 * colors. The shapes are slightly irregular (not perfect circles) and the
 * ink uses `mix-blend-multiply` so where two drops overlap the colors
 * blend into a deeper third. Reads as "fresh ink on paper" — fits the
 * sketchbook brand without being a clipart palette icon.
 *
 * Swatches order: [accent, ink, paper] — accent gets pride of place, paper
 * provides a subtle highlight that catches the eye on dark surfaces.
 */
function InkDrops({ swatches, className = '' }: { swatches: string[]; className?: string }) {
  const [accent, ink, paper] = swatches;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <g style={{ mixBlendMode: 'multiply' }}>
        {/* Accent drop — front, slightly tear-shaped */}
        <path
          d="M12.4 4.4 C 16.2 5.2, 18.4 9, 17.4 12.6 C 16.4 16, 12.6 17.4, 9.4 16 C 6.4 14.6, 5.6 11, 7.4 8.4 C 8.6 6.6, 10.4 4, 12.4 4.4 Z"
          fill={accent}
        />
        {/* Ink drop — back-left, a little bigger */}
        <path
          d="M7.6 9.6 C 11 9, 13.4 11.4, 13 14.6 C 12.6 17.6, 9.6 19.4, 6.6 18.6 C 3.8 17.8, 2.4 14.8, 3.6 12.4 C 4.4 10.8, 5.8 9.8, 7.6 9.6 Z"
          fill={ink}
        />
        {/* Paper highlight — back-right, smaller, with a thin ink ring so it
            stays visible on light themes where paper is near-white. */}
        <path
          d="M17.6 9 C 20 9.4, 21.4 11.6, 20.6 13.8 C 19.8 16, 17.2 16.6, 15.4 15 C 13.8 13.6, 14 11, 15.6 9.6 C 16.2 9.2, 16.8 8.8, 17.6 9 Z"
          fill={paper}
          stroke={ink}
          strokeOpacity="0.35"
          strokeWidth="0.6"
        />
      </g>
    </svg>
  );
}
