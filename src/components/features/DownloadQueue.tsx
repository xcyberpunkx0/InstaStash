'use client';

import React from 'react';
import { ProgressBar, StatusPill } from '@/components/ui';

export interface DownloadQueueItemProps {
  status: 'downloading' | 'queued' | 'complete' | 'error';
  percentage: number;
  title?: string;
  platform?: string;
  fileSize?: string;
  duration?: string;
  thumbnail?: string; // CSS gradient or url(...)
  onCancel?: () => void;
  onPlay?: () => void;
  onRetry?: () => void;
  onShowInFolder?: () => void;
}

/**
 * Single download queue item with thumbnail, progress, status pill, and actions.
 * Matches AuraVault app kit: 120x68 thumbnail, ink title, status pill + progress + size.
 */
export function DownloadQueueItem({
  status,
  percentage,
  title,
  platform,
  fileSize,
  duration,
  thumbnail,
  onCancel,
  onPlay,
  onRetry,
  onShowInFolder,
}: DownloadQueueItemProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));

  return (
    <div className="
      grid grid-cols-[120px_1fr_auto] gap-4 items-center
      p-3 pr-[18px]
      bg-[var(--color-bg-surface)]
      rounded-[16px]
      border border-[var(--color-line-soft)]
      shadow-[0_1px_0_rgba(31,27,22,0.04),0_10px_22px_-14px_rgba(31,27,22,0.18)]
    ">
      {/* Thumbnail */}
      <div
        className="w-[120px] h-[68px] rounded-[10px] overflow-hidden relative shrink-0 border border-[rgba(31,27,22,0.18)] shadow-[0_4px_10px_-6px_rgba(31,27,22,0.35)]"
        style={{ background: thumbnail ?? 'linear-gradient(135deg, #3A2618 0%, #C97B4E 100%)' }}
      >
        {duration && (
          <div className="absolute right-1.5 bottom-1.5 px-1.5 py-0.5 rounded-[var(--radius-pill)] bg-[rgba(31,27,22,0.72)] backdrop-blur-[4px] text-[var(--color-paper-50)] font-[family-name:var(--font-mono)] text-[10px] z-[2]">
            {duration}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        {platform && (
          <div className="font-[family-name:var(--font-grotesk)] font-semibold text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-400)] mb-[3px]">
            {platform}
          </div>
        )}
        {title && (
          <h3 className="font-[family-name:var(--font-display)] font-medium text-[18px] leading-[1.15] text-[var(--color-ink-900)] m-0 mb-1.5 truncate">
            {title}
          </h3>
        )}
        <div className="flex items-center gap-2.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-500)]">
          <StatusPill variant={status}>
            {status === 'downloading' ? 'downloading' : status === 'complete' ? 'downloaded' : status === 'error' ? 'failed' : 'queued'}
          </StatusPill>
          <div className="flex-1 min-w-[60px]">
            <ProgressBar
              value={clamped}
              variant={status === 'complete' ? 'sage' : 'terra'}
              label={`Download progress: ${clamped}%`}
            />
          </div>
          <span className="whitespace-nowrap">
            {status === 'complete' ? (fileSize ?? 'done') : status === 'queued' ? (fileSize ?? '—') : `${clamped}%${fileSize ? ` · ${fileSize}` : ''}`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        {status === 'complete' && (
          <>
            <ActionButton onClick={onShowInFolder} title="Show file" icon={
              <><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18"/></>
            } />
            <ActionButton onClick={onPlay} title="Play" primary icon={
              <polygon points="5 3 19 12 5 21 5 3"/>
            } />
          </>
        )}
        {status === 'downloading' && (
          <>
            <ActionButton onClick={onCancel} title="Pause" icon={
              <><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></>
            } />
            <ActionButton onClick={onCancel} title="Cancel" icon={
              <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>
            } />
          </>
        )}
        {status === 'queued' && (
          <>
            <ActionButton onClick={onPlay} title="Start now" primary icon={
              <polygon points="5 3 19 12 5 21 5 3"/>
            } />
            <ActionButton onClick={onCancel} title="Cancel" icon={
              <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>
            } />
          </>
        )}
        {status === 'error' && onRetry && (
          <ActionButton onClick={onRetry} title="Retry" primary icon={
            <><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></>
          } />
        )}
      </div>
    </div>
  );
}

function ActionButton({ onClick, title, icon, primary }: { onClick?: () => void; title: string; icon: React.ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`
        w-8 h-8 rounded-full border-0 cursor-pointer inline-flex items-center justify-center
        transition-colors duration-[160ms]
        ${primary
          ? 'bg-[var(--color-ink-900)] text-[var(--color-paper-50)] hover:bg-[var(--color-ink-700)]'
          : 'bg-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-300)]'
        }
      `}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
    </button>
  );
}
