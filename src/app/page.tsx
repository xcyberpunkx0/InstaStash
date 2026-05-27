'use client';

import React, { useReducer, useCallback, useRef, useState } from 'react';
import { URLInputField } from '@/components/URLInputField';
import { QualitySelector } from '@/components/QualitySelector';
import { DownloadProgress } from '@/components/DownloadProgress';
import { SketchCharacter } from '@/components/SketchCharacter';
import { HelpSection } from '@/components/HelpSection';
import { SketchButton } from '@/components/SketchButton';
import { useRetryState } from '@/hooks/useRetryState';
import type {
  AppState,
  DetectResponse,
  FetchResponse,
  VideoQuality,
} from '@/types';
import type { DetectErrorResponse, FetchErrorResponse } from '@/types/errors';

// ─── Action Types ────────────────────────────────────────────────────────────

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

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: AppState = {
  url: '',
  detection: { status: 'idle' },
  fetch: { status: 'idle' },
  download: { status: 'idle' },
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_URL':
      return {
        ...initialState,
        url: action.url,
      };
    case 'DETECT_START':
      return {
        ...state,
        detection: { status: 'detecting' },
        fetch: { status: 'idle' },
        download: { status: 'idle' },
      };
    case 'DETECT_SUCCESS':
      return {
        ...state,
        detection: { status: 'detected', result: action.result },
      };
    case 'DETECT_ERROR':
      return {
        ...state,
        detection: { status: 'error', error: action.error },
      };
    case 'FETCH_START':
      return {
        ...state,
        fetch: { status: 'fetching' },
        download: { status: 'idle' },
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        fetch: { status: 'fetched', metadata: action.metadata },
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        fetch: { status: 'error', error: action.error },
      };
    case 'DOWNLOAD_START':
      return {
        ...state,
        download: { status: 'downloading', percentage: 0 },
      };
    case 'DOWNLOAD_PROGRESS':
      return {
        ...state,
        download: { status: 'downloading', percentage: action.percentage },
      };
    case 'DOWNLOAD_COMPLETE':
      return {
        ...state,
        download: { status: 'complete', filename: action.filename },
      };
    case 'DOWNLOAD_ERROR':
      return {
        ...state,
        download: {
          status: 'error',
          error: action.error,
          retryCount: state.download.status === 'error' ? state.download.retryCount + 1 : 1,
        },
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ─── Error Type Mapping ──────────────────────────────────────────────────────

function mapDetectErrorToType(code: string): 'unsupported' | 'format' | 'timeout' | 'network' {
  switch (code) {
    case 'UNSUPPORTED_PLATFORM':
      return 'unsupported';
    case 'INVALID_FORMAT':
      return 'format';
    case 'TIMEOUT':
      return 'timeout';
    case 'EMPTY_URL':
      return 'format';
    default:
      return 'network';
  }
}

function mapFetchErrorToType(code: string): 'private' | 'unavailable' | 'rate-limit' | 'duration' | 'network' {
  switch (code) {
    case 'PRIVATE':
    case 'AGE_RESTRICTED':
    case 'GEO_BLOCKED':
      return 'private';
    case 'UNAVAILABLE':
      return 'unavailable';
    case 'RATE_LIMITED':
      return 'rate-limit';
    case 'DURATION_EXCEEDED':
      return 'duration';
    default:
      return 'network';
  }
}

// ─── Retry Constants ─────────────────────────────────────────────────────────

const RATE_LIMIT_DEFAULT_SECONDS = 60;

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Retry state management via custom hook
  const retryState = useRetryState();
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);

  // ─── Detect Handler ──────────────────────────────────────────────────────

  const handleDetect = useCallback(async (url: string) => {
    dispatch({ type: 'SET_URL', url });
    dispatch({ type: 'DETECT_START' });

    try {
      const response = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        dispatch({ type: 'DETECT_ERROR', error: data as DetectErrorResponse });
        return;
      }

      dispatch({ type: 'DETECT_SUCCESS', result: data as DetectResponse });
    } catch {
      dispatch({
        type: 'DETECT_ERROR',
        error: {
          error: "Couldn't connect — check your internet and try again!",
          code: 'TIMEOUT',
          supportedPlatforms: ['Instagram', 'YouTube'],
        },
      });
    }
  }, []);

  // ─── Fetch Handler ───────────────────────────────────────────────────────

  const handleFetch = useCallback(async () => {
    if (state.detection.status !== 'detected') return;

    const { result } = state.detection;
    dispatch({ type: 'FETCH_START' });

    try {
      const response = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: state.url, platform: result.platform }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as FetchErrorResponse;
        dispatch({ type: 'FETCH_ERROR', error: errorData });
        // If rate-limited, start countdown immediately
        if (errorData.code === 'RATE_LIMITED') {
          const retryAfter = errorData.retryAfter ?? RATE_LIMIT_DEFAULT_SECONDS;
          retryState.handleRateLimit(retryAfter);
        }
        return;
      }

      const metadata = data as FetchResponse;
      dispatch({ type: 'FETCH_SUCCESS', metadata });

      // Auto-proceed for Instagram or single format
      if (result.platform === 'instagram' || metadata.formats.length <= 1) {
        const formatId = metadata.formats[0]?.formatId ?? 'best';
        handleDownload(formatId);
      }
    } catch {
      dispatch({
        type: 'FETCH_ERROR',
        error: {
          error: "Couldn't connect — check your internet and try again!",
          code: 'NETWORK_ERROR',
        },
      });
    }
  }, [state.detection, state.url]);

  // ─── Download Handler (SSE) ──────────────────────────────────────────────

  const handleDownload = useCallback(async (formatId: string) => {
    dispatch({ type: 'DOWNLOAD_START' });

    // Abort any previous download
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: state.url, formatId }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        dispatch({ type: 'DOWNLOAD_ERROR', error: 'Failed to start download' });
        return;
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith('data: ')) continue;

          try {
            const eventData = JSON.parse(dataLine.slice(6));

            switch (eventData.type) {
              case 'progress':
                dispatch({ type: 'DOWNLOAD_PROGRESS', percentage: eventData.percentage });
                break;
              case 'complete':
                dispatch({ type: 'DOWNLOAD_COMPLETE', filename: eventData.filename });
                break;
              case 'error':
                dispatch({ type: 'DOWNLOAD_ERROR', error: eventData.message });
                break;
            }
          } catch {
            // Skip malformed SSE data
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      dispatch({ type: 'DOWNLOAD_ERROR', error: 'Download failed — please try again.' });
    }
  }, [state.url]);

  // ─── Quality Selection Handler ───────────────────────────────────────────

  const handleQualitySelect = useCallback((formatId: string) => {
    setSelectedFormatId(formatId);
    handleDownload(formatId);
  }, [handleDownload]);

  // ─── Retry Handler ───────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    // Attempt retry via the state machine — returns false if blocked
    const allowed = retryState.retry();
    if (!allowed) return;

    // Perform the retry based on which step failed
    if (state.detection.status === 'error') {
      handleDetect(state.url);
    } else if (state.fetch.status === 'error') {
      // Check for rate-limit error
      if (state.fetch.error.code === 'RATE_LIMITED') {
        const retryAfter = state.fetch.error.retryAfter ?? RATE_LIMIT_DEFAULT_SECONDS;
        retryState.handleRateLimit(retryAfter);
        return;
      }
      handleFetch();
    } else if (state.download.status === 'error') {
      // Retry download preserving selected format
      const formatId = selectedFormatId
        ?? (state.fetch.status === 'fetched' ? state.fetch.metadata.formats[0]?.formatId : null)
        ?? 'best';
      handleDownload(formatId);
    }
  }, [retryState, state, selectedFormatId, handleDetect, handleFetch, handleDownload]);

  // ─── Derived State ───────────────────────────────────────────────────────

  const detectedPlatform = state.detection.status === 'detected'
    ? { platform: state.detection.result.platform, contentType: state.detection.result.contentType }
    : undefined;

  const detectionError = state.detection.status === 'error'
    ? state.detection.error.error
    : undefined;

  // Build quality options from fetched metadata
  const qualityOptions: VideoQuality[] = state.fetch.status === 'fetched'
    ? state.fetch.metadata.formats.map((f) => ({
        formatId: f.formatId,
        resolution: f.resolution,
        fileSize: f.fileSize,
        label: `${f.resolution} (~${Math.round(f.fileSize / (1024 * 1024))}MB)`,
      }))
    : [];

  // Show quality selector only for YouTube with multiple formats
  const showQualitySelector =
    state.fetch.status === 'fetched' &&
    state.detection.status === 'detected' &&
    state.detection.result.platform === 'youtube' &&
    qualityOptions.length > 1 &&
    state.download.status === 'idle';

  // Determine if retry is disabled (cooldown active or rate-limit active)
  const isRetryDisabled = retryState.isDisabled;

  // Determine the active countdown to display
  const activeCountdown = retryState.countdown;

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-20"
      aria-label="Video Downloader"
    >
      <div className="w-full max-w-lg flex flex-col items-center gap-8">
        {/* Page Title */}
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading text-primary mb-2">
            Video Downloader
          </h1>
          <p className="text-base font-body text-text-muted">
            Paste a link from Instagram or YouTube to save your video
          </p>
        </header>

        {/* Main Download Area — single clean card */}
        <section aria-label="Download video" className="w-full space-y-4">
          {/* URL Input */}
          <URLInputField
            onSubmit={handleDetect}
            isLoading={state.detection.status === 'detecting'}
            error={detectionError}
            detectedPlatform={detectedPlatform}
          />

          {/* Download Button — appears right after successful detection */}
          {state.detection.status === 'detected' && state.fetch.status === 'idle' && state.download.status === 'idle' && (
            <div className="flex justify-center">
              <SketchButton
                variant="primary"
                onClick={handleFetch}
                aria-label="Download video"
              >
                Download
              </SketchButton>
            </div>
          )}

          {/* Fetching State — simple spinner */}
          {state.fetch.status === 'fetching' && (
            <div className="flex justify-center items-center gap-3 py-4" role="status" aria-live="polite">
              <div
                className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              <span className="font-body text-text-muted">Fetching video info...</span>
            </div>
          )}

          {/* Quality Selector (YouTube with multiple formats) */}
          {showQualitySelector && (
            <QualitySelector
              options={qualityOptions}
              onSelect={handleQualitySelect}
            />
          )}

          {/* Download Progress */}
          {state.download.status === 'downloading' && (
            <DownloadProgress
              percentage={state.download.percentage}
              status="downloading"
            />
          )}

          {/* Download Complete */}
          {state.download.status === 'complete' && (
            <DownloadProgress
              percentage={100}
              status="complete"
            />
          )}

          {/* Download Error — simple inline */}
          {state.download.status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <SketchCharacter mood="sad" />
              <p className="font-body text-error text-sm">
                Download failed. Please try again.
              </p>
              <SketchButton variant="secondary" onClick={handleRetry} disabled={isRetryDisabled}>
                Try Again
              </SketchButton>
            </div>
          )}

          {/* Fetch Error — simple inline */}
          {state.fetch.status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <SketchCharacter mood="sad" />
              <p className="font-body text-error text-sm">
                {state.fetch.error.error}
              </p>
              {activeCountdown > 0 && (
                <p className="font-body text-text-muted text-xs">
                  Retry in {activeCountdown}s
                </p>
              )}
              <SketchButton variant="secondary" onClick={handleRetry} disabled={isRetryDisabled}>
                Try Again
              </SketchButton>
            </div>
          )}
        </section>

        {/* Help Section — only show when idle */}
        {state.detection.status === 'idle' && (
          <section aria-label="Help and instructions" className="w-full">
            <HelpSection platforms={[]} />
          </section>
        )}
      </div>
    </main>
  );
}
