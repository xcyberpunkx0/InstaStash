'use client';

import React, { useReducer, useCallback, useRef, useState, useEffect } from 'react';
import { URLInput } from '@/components/features/URLInput';
import { VideoDetails } from '@/components/features/VideoDetails';
import { DownloadProgressView } from '@/components/features/DownloadProgress';
import { DownloadComplete } from '@/components/features/DownloadComplete';
import { ErrorDisplay } from '@/components/features/ErrorDisplay';
import { FetchingState } from '@/components/features/FetchingState';
import { StickyNote } from '@/components/ui';
import { useRetryState } from '@/hooks/useRetryState';
import { libraryStore } from '@/lib/library-store';
import type { AppState, DetectResponse, FetchResponse, VideoQuality } from '@/types';
import type { DetectErrorResponse, FetchErrorResponse } from '@/types/errors';

// ─── State Management ────────────────────────────────────────────────────────

type AppAction =
  | { type: 'SET_URL'; url: string }
  | { type: 'DETECT_START' }
  | { type: 'DETECT_SUCCESS'; result: DetectResponse }
  | { type: 'DETECT_ERROR'; error: DetectErrorResponse }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; metadata: FetchResponse }
  | { type: 'FETCH_ERROR'; error: FetchErrorResponse }
  | { type: 'DOWNLOAD_START' }
  | { type: 'DOWNLOAD_PROGRESS'; percentage: number }
  | { type: 'DOWNLOAD_COMPLETE'; filename: string }
  | { type: 'DOWNLOAD_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: AppState = { url: '', detection: { status: 'idle' }, fetch: { status: 'idle' }, download: { status: 'idle' } };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_URL': return { ...initialState, url: action.url };
    case 'DETECT_START': return { ...state, detection: { status: 'detecting' }, fetch: { status: 'idle' }, download: { status: 'idle' } };
    case 'DETECT_SUCCESS': return { ...state, detection: { status: 'detected', result: action.result } };
    case 'DETECT_ERROR': return { ...state, detection: { status: 'error', error: action.error } };
    case 'FETCH_START': return { ...state, fetch: { status: 'fetching' }, download: { status: 'idle' } };
    case 'FETCH_SUCCESS': return { ...state, fetch: { status: 'fetched', metadata: action.metadata } };
    case 'FETCH_ERROR': return { ...state, fetch: { status: 'error', error: action.error } };
    case 'DOWNLOAD_START': return { ...state, download: { status: 'downloading', percentage: 0 } };
    case 'DOWNLOAD_PROGRESS': return { ...state, download: { status: 'downloading', percentage: action.percentage } };
    case 'DOWNLOAD_COMPLETE': return { ...state, download: { status: 'complete', filename: action.filename } };
    case 'DOWNLOAD_ERROR': return { ...state, download: { status: 'error', error: action.error, retryCount: state.download.status === 'error' ? state.download.retryCount + 1 : 1 } };
    case 'RESET': return initialState;
    default: return state;
  }
}

const RATE_LIMIT_DEFAULT_SECONDS = 60;

// ─── Reusable handwritten Caveat style ───────────────────────────────────────
const CAVEAT_STYLE: React.CSSProperties = { fontFamily: 'var(--font-hand)', fontWeight: 500 };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryState = useRetryState();
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);

  // ─── Deep-link: ?url=... auto-starts detection on mount ──────────────────
  const didAutoStartRef = useRef(false);
  useEffect(() => {
    if (didAutoStartRef.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get('url');
    if (incoming && incoming.trim()) {
      didAutoStartRef.current = true;
      // strip the param so a refresh doesn't re-trigger
      const url = new URL(window.location.href);
      url.searchParams.delete('url');
      window.history.replaceState(null, '', url.toString());
      handleDetectRef.current?.(incoming.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleDetectRef = useRef<((url: string) => void) | null>(null);

  const handleDetect = useCallback(async (url: string) => {
    dispatch({ type: 'SET_URL', url });
    dispatch({ type: 'DETECT_START' });
    try {
      const response = await fetch('/api/detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await response.json();
      if (!response.ok) { dispatch({ type: 'DETECT_ERROR', error: data as DetectErrorResponse }); return; }
      const result = data as DetectResponse;
      dispatch({ type: 'DETECT_SUCCESS', result });
      // Auto-fetch metadata after detection
      dispatch({ type: 'FETCH_START' });
      const fetchResp = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, platform: result.platform }) });
      const fetchData = await fetchResp.json();
      if (!fetchResp.ok) { dispatch({ type: 'FETCH_ERROR', error: fetchData as FetchErrorResponse }); return; }
      dispatch({ type: 'FETCH_SUCCESS', metadata: fetchData as FetchResponse });
    } catch {
      dispatch({ type: 'DETECT_ERROR', error: { error: "Couldn't connect — check your internet and try again.", code: 'TIMEOUT', supportedPlatforms: ['Instagram', 'YouTube'] } });
    }
  }, []);

  // Keep the autostart ref pointed at the latest handler.
  handleDetectRef.current = handleDetect;

  const handleDownload = useCallback(async (formatId: string) => {
    setSelectedFormatId(formatId);
    dispatch({ type: 'DOWNLOAD_START' });
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const response = await fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: state.url, formatId }), signal: controller.signal });
      if (!response.ok || !response.body) { dispatch({ type: 'DOWNLOAD_ERROR', error: 'Failed to start download' }); return; }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith('data: ')) continue;
          try {
            const eventData = JSON.parse(dataLine.slice(6));
            switch (eventData.type) {
              case 'progress': dispatch({ type: 'DOWNLOAD_PROGRESS', percentage: eventData.percentage }); break;
              case 'file': {
                const byteString = atob(eventData.data);
                const bytes = new Uint8Array(byteString.length);
                for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
                const blob = new Blob([bytes], { type: eventData.mimeType || 'video/mp4' });
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl; a.download = eventData.filename || 'video.mp4';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
                dispatch({ type: 'DOWNLOAD_COMPLETE', filename: eventData.filename });
                // Save to library — best-effort, never block the UI
                try {
                  const meta = state.fetch.status === 'fetched' ? state.fetch.metadata : undefined;
                  const platform = state.detection.status === 'detected' ? state.detection.result.platform : 'unknown';
                  const fmt = meta?.formats.find((f) => f.formatId === formatId) ?? meta?.formats[0];
                  libraryStore.add({
                    url: state.url,
                    title: meta?.title ?? eventData.filename ?? 'Untitled',
                    platform,
                    thumbnail: meta?.thumbnail,
                    duration: meta?.duration,
                    fileSize: fmt?.fileSize,
                    resolution: fmt?.resolution,
                    format: fmt?.ext,
                    filename: eventData.filename ?? 'video.mp4',
                  });
                } catch { /* swallow — library write is non-critical */ }
                break;
              }
              case 'error': dispatch({ type: 'DOWNLOAD_ERROR', error: eventData.message }); break;
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      dispatch({ type: 'DOWNLOAD_ERROR', error: 'Download failed — please try again.' });
    }
  }, [state.url, state.fetch, state.detection]);

  const handleReset = useCallback(() => {
    setSelectedFormatId(null);
    dispatch({ type: 'RESET' });
  }, []);

  const handleRetry = useCallback(() => {
    const allowed = retryState.retry();
    if (!allowed) return;
    if (state.detection.status === 'error') handleDetect(state.url);
    else if (state.fetch.status === 'error') handleDetect(state.url);
    else if (state.download.status === 'error') {
      handleDownload(selectedFormatId ?? 'best');
    }
  }, [retryState, state, selectedFormatId, handleDetect, handleDownload]);

  // ─── Derived ─────────────────────────────────────────────────────────────

  const detectionError = state.detection.status === 'error' ? state.detection.error.error : undefined;
  const qualityOptions: VideoQuality[] = state.fetch.status === 'fetched'
    ? state.fetch.metadata.formats.map((f) => ({ formatId: f.formatId, resolution: f.resolution, fileSize: f.fileSize, label: `${f.resolution}` }))
    : [];
  const showVideoDetails = state.fetch.status === 'fetched' && state.download.status === 'idle';
  const isFetching = state.detection.status === 'detecting' || state.fetch.status === 'fetching';
  const totalFileSize = state.fetch.status === 'fetched' && selectedFormatId
    ? state.fetch.metadata.formats.find(f => f.formatId === selectedFormatId)?.fileSize
    : state.fetch.status === 'fetched' ? state.fetch.metadata.formats[0]?.fileSize : undefined;

  // What state are we currently showing in the action area?
  const isIdle = state.detection.status === 'idle';

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <main id="main-content" className="min-h-screen">
      {/* Minimal nav — logo + library link */}
      <header className="max-w-[1280px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <a href="/" className="inline-flex items-center gap-2.5">
          <img src="/assets/logo.svg" alt="AuraVault" className="h-8" />
        </a>
        <a
          href="/library"
          className="
            inline-flex items-center gap-2
            px-4 py-2 rounded-[var(--radius-pill)]
            bg-transparent border border-[var(--color-line-medium)]
            text-[var(--color-ink-700)] no-underline
            font-[family-name:var(--font-grotesk)] font-medium text-[13px]
            hover:bg-[var(--color-paper-200)]
            transition-colors duration-[160ms]
          "
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v1.5"/><path d="M13.9 17.45c-1.2-1.2-1.14-2.8-.2-3.73a2.43 2.43 0 0 1 3.44 0l.36.34.34-.34a2.43 2.43 0 0 1 3.45-.01v0c.95.95 1 2.53-.2 3.74L17.5 21Z"/></svg>
          your library
        </a>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════════════════ */}
      <section className="relative max-w-[1280px] mx-auto px-6 md:px-12 pt-12 md:pt-20 pb-16">
        {/* Decorations */}
        <img src="/assets/sketch-star.svg" alt="" aria-hidden="true" className="absolute top-16 right-[200px] w-[38px] pointer-events-none hidden md:block" style={{ transform: 'rotate(12deg)' }} />
        <img src="/assets/doodle-spiral.svg" alt="" aria-hidden="true" className="absolute top-[240px] right-[280px] w-[70px] opacity-60 pointer-events-none hidden lg:block" />
        <img src="/assets/sketch-arrow.svg" alt="" aria-hidden="true" className="absolute top-[180px] right-[40px] w-[120px] opacity-80 pointer-events-none hidden lg:block" style={{ transform: 'rotate(-10deg)' }} />

        {/* Sticky notes */}
        <div className="hidden xl:block absolute top-[120px] right-[80px]">
          <StickyNote color="yellow" rotate={-3}>a tiny library<br />that&rsquo;s just yours ✦</StickyNote>
        </div>
        <div className="hidden xl:block absolute top-[320px] right-[140px]">
          <StickyNote color="sage" rotate={2}>no ads, no upsell,<br />no nonsense</StickyNote>
        </div>

        {/* Content */}
        <div className="max-w-[780px]">
          {/* Eyebrow — Caveat */}
          <span
            style={{ ...CAVEAT_STYLE, transform: 'rotate(-2deg)' }}
            className="text-[28px] text-[var(--color-terra-600)] inline-block mb-2"
          >
            a quieter way to keep the internet —
          </span>

          {/* Headline — Cormorant italic */}
          <h1
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
            className="text-[clamp(48px,8vw,96px)] leading-[0.96] tracking-[-0.02em] text-[var(--color-ink-900)] m-0 text-balance max-w-[14ch]"
          >
            Save the internet, <span className="text-[var(--color-terra-500)]">beautifully.</span>
          </h1>

          <p className="text-[18px] leading-[1.55] text-[var(--color-ink-500)] max-w-[52ch] mt-6 mb-9">
            Download videos from YouTube, Instagram, TikTok and seventy more — fast, open-source, and blessedly distraction-free. Drop a link below.
          </p>

          {/* ══════════════════════════════════════════════════════════
              ACTION AREA — state-driven
              ══════════════════════════════════════════════════════════ */}

          {/* Idle: empty URL input */}
          {isIdle && (
            <URLInput onSubmit={handleDetect} isLoading={false} error={undefined} />
          )}

          {/* Detection / fetch error: show input with error message */}
          {state.detection.status === 'error' && (
            <URLInput onSubmit={handleDetect} isLoading={false} error={detectionError} />
          )}

          {/* Fetching state: handwritten "looking for the file..." */}
          {isFetching && <FetchingState />}

          {/* Video metadata fetched: show URL + filename + quality */}
          {showVideoDetails && state.fetch.status === 'fetched' && (
            <VideoDetails
              title={state.fetch.metadata.title}
              formats={qualityOptions}
              onDownload={handleDownload}
              url={state.url}
            />
          )}

          {/* Downloading: thick terra progress bar */}
          {state.download.status === 'downloading' && (
            <DownloadProgressView percentage={state.download.percentage} totalSize={totalFileSize} />
          )}

          {/* Complete: success card + Download another */}
          {state.download.status === 'complete' && (
            <DownloadComplete
              filename={state.download.filename}
              onSaveAgain={() => handleDownload(selectedFormatId ?? 'best')}
              onDownloadAnother={handleReset}
            />
          )}

          {/* Errors */}
          {state.download.status === 'error' && (
            <ErrorDisplay message={state.download.error} onRetry={handleRetry} retryDisabled={retryState.isDisabled} countdown={retryState.countdown} />
          )}
          {state.fetch.status === 'error' && (
            <ErrorDisplay message={state.fetch.error.error} onRetry={handleRetry} retryDisabled={retryState.isDisabled} countdown={retryState.countdown} />
          )}

          {/* Hint — only in idle state */}
          {isIdle && (
            <div className="mt-3.5 text-[var(--color-ink-300)] text-[13px] flex items-center gap-2.5">
              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              no account · no tracking · 100% open-source
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          HOW IT WORKS — 3 numbered steps, only in idle
          ════════════════════════════════════════════════════════════════ */}
      {isIdle && (
        <section className="max-w-[1280px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="max-w-[760px] mb-12">
            {/* Eyebrow — Caveat */}
            <span
              style={{ ...CAVEAT_STYLE, transform: 'rotate(-1.5deg)' }}
              className="text-[24px] text-[var(--color-terra-600)] inline-block mb-1.5"
            >
              three steps, then forget about it —
            </span>
            <h2
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
              className="text-[clamp(36px,5vw,56px)] leading-[1.04] tracking-[-0.015em] text-[var(--color-ink-900)] m-0 text-balance"
            >
              It&rsquo;s almost embarrassing<br />how simple this is.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {[
              { num: '01', title: 'Paste a link.', desc: "Anything you can play in a browser. We'll detect the platform, format, and best quality automatically." },
              { num: '02', title: 'Pick your shape.', desc: "Full HD? Audio only? With subtitles? Choose once and we'll remember for next time." },
              { num: '03', title: "It's in your library.", desc: 'Quiet, tagged, and searchable. Open it in any player you already love.' },
            ].map((step, i) => (
              <div key={step.num} className="relative">
                <div
                  style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
                  className="text-[64px] leading-none text-[var(--color-terra-500)]"
                >
                  {step.num}
                </div>
                <h3
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
                  className="mt-2 mb-1.5 text-[26px] text-[var(--color-ink-900)] m-0"
                >
                  {step.title}
                </h3>
                <p className="text-[15px] leading-[1.6] text-[var(--color-ink-500)] m-0">
                  {step.desc}
                </p>

                {/* Hand-drawn arrow between steps */}
                {i < 2 && (
                  <img
                    src="/assets/sketch-arrow.svg"
                    alt=""
                    aria-hidden="true"
                    className="hidden md:block absolute top-[12px] -right-8 w-[64px] opacity-70"
                    style={{ transform: i === 0 ? 'rotate(-6deg)' : 'rotate(4deg)' }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════
          QUOTE — only in idle
          ════════════════════════════════════════════════════════════════ */}
      {isIdle && (
        <section className="max-w-[1280px] mx-auto px-6 md:px-12 py-16 md:py-24 text-center">
          <div className="max-w-[760px] mx-auto">
            <img src="/assets/doodle-circles.svg" alt="" aria-hidden="true" className="h-[50px] opacity-50 mb-5 mx-auto" />
            <blockquote
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500 }}
              className="text-[clamp(28px,4vw,42px)] leading-[1.18] text-[var(--color-ink-900)] m-0 text-balance"
            >
              &ldquo;It feels like writing in a Moleskine. I didn&rsquo;t know a download manager could feel{' '}
              <span className="bg-[linear-gradient(transparent_70%,var(--color-terra-200)_70%)]">like this.</span>&rdquo;
            </blockquote>
            <div
              style={CAVEAT_STYLE}
              className="mt-6 text-[22px] text-[var(--color-ink-500)]"
            >
              — maya k., illustrator
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════════════════════════ */}
      <footer className="max-w-[1280px] mx-auto px-6 md:px-12 py-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-line-soft)]">
        <p style={CAVEAT_STYLE} className="text-[20px] text-[var(--color-ink-400)] m-0">
          made with care, open-source forever.
        </p>

        {/* Social links — github, linkedin, portfolio */}
        <nav aria-label="Social links" className="flex items-center gap-1.5">
          <a
            href="https://github.com/xcyberpunkx0"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)] hover:bg-[var(--color-paper-200)] transition-colors duration-[160ms]"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.18c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/aditya-gup1a/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)] hover:bg-[var(--color-paper-200)] transition-colors duration-[160ms]"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.21 24 24 23.23 24 22.28V1.72C24 .77 23.21 0 22.22 0z"/>
            </svg>
          </a>
          <a
            href="https://www.adityagupta.space/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Portfolio"
            title="Portfolio"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)] hover:bg-[var(--color-paper-200)] transition-colors duration-[160ms]"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </a>
        </nav>

        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-300)] m-0">
          AuraVault · MIT licensed
        </p>
      </footer>
    </main>
  );
}
