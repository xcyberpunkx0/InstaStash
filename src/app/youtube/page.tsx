"use client";

import React, { useReducer, useCallback, useRef, useState, useEffect } from "react";
import { URLInput } from "@/components/features/URLInput";
import { VideoDetails } from "@/components/features/VideoDetails";
import { DownloadProgressView } from "@/components/features/DownloadProgress";
import { DownloadComplete } from "@/components/features/DownloadComplete";
import { ErrorDisplay } from "@/components/features/ErrorDisplay";
import { FetchingState } from "@/components/features/FetchingState";
import { Logo } from "@/components/ui/Logo";
import { ThemePicker } from "@/components/ThemeSwitcher";
import { SketchArrow, SketchStar } from "@/components/ui/SketchMarks";
import { useRetryState } from "@/hooks/useRetryState";
import { libraryStore } from "@/lib/library-store";
import { bridge, isDesktop } from "@/lib/desktop-client";
import type {
  AppState,
  DetectResponse,
  FetchResponse,
  VideoFormat,
} from "@/types";
import type { DetectErrorResponse, FetchErrorResponse } from "@/types/errors";

// ─── State Management (scoped to YouTube) ────────────────────────────────────

type AppAction =
  | { type: "SET_URL"; url: string }
  | { type: "DETECT_START" }
  | { type: "DETECT_SUCCESS"; result: DetectResponse }
  | { type: "DETECT_ERROR"; error: DetectErrorResponse }
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; metadata: FetchResponse }
  | { type: "FETCH_ERROR"; error: FetchErrorResponse }
  | { type: "DOWNLOAD_START" }
  | { type: "DOWNLOAD_PROGRESS"; percentage: number; eta?: string }
  | { type: "DOWNLOAD_COMPLETE"; filename: string }
  | { type: "DOWNLOAD_ERROR"; error: string }
  | { type: "RESET" };

const initialState: AppState = {
  url: "",
  detection: { status: "idle" },
  fetch: { status: "idle" },
  download: { status: "idle" },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_URL":
      return { ...initialState, url: action.url };
    case "DETECT_START":
      return {
        ...state,
        detection: { status: "detecting" },
        fetch: { status: "idle" },
        download: { status: "idle" },
      };
    case "DETECT_SUCCESS":
      return {
        ...state,
        detection: { status: "detected", result: action.result },
      };
    case "DETECT_ERROR":
      return { ...state, detection: { status: "error", error: action.error } };
    case "FETCH_START":
      return {
        ...state,
        fetch: { status: "fetching" },
        download: { status: "idle" },
      };
    case "FETCH_SUCCESS":
      return {
        ...state,
        fetch: { status: "fetched", metadata: action.metadata },
      };
    case "FETCH_ERROR":
      return { ...state, fetch: { status: "error", error: action.error } };
    case "DOWNLOAD_START":
      return { ...state, download: { status: "downloading", percentage: 0 } };
    case "DOWNLOAD_PROGRESS":
      return {
        ...state,
        download: { status: "downloading", percentage: action.percentage, eta: action.eta },
      };
    case "DOWNLOAD_COMPLETE":
      return {
        ...state,
        download: { status: "complete", filename: action.filename },
      };
    case "DOWNLOAD_ERROR":
      return {
        ...state,
        download: {
          status: "error",
          error: action.error,
          retryCount:
            state.download.status === "error"
              ? state.download.retryCount + 1
              : 1,
        },
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const CAVEAT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-hand)",
  fontWeight: 500,
};

const NOT_YOUTUBE_MESSAGE =
  "That doesn't look like a YouTube link. Paste a youtube.com/watch or youtu.be URL.";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function YouTubePage() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const activeJobIdRef = useRef<string | null>(null);
  const downloadCtxRef = useRef<{
    meta?: FetchResponse;
    fmt?: VideoFormat;
    url: string;
  } | null>(null);
  const retryState = useRetryState();
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);

  const handleDetect = useCallback(async (url: string) => {
    dispatch({ type: "SET_URL", url });
    dispatch({ type: "DETECT_START" });
    if (!isDesktop()) {
      dispatch({
        type: "DETECT_ERROR",
        error: {
          error: "Please open InstaStash from the desktop app.",
          code: "TIMEOUT",
          supportedPlatforms: ["YouTube"],
        },
      });
      return;
    }
    try {
      const detected = await bridge().detect(url);
      if (!detected.ok) {
        dispatch({ type: "DETECT_ERROR", error: detected.error });
        return;
      }
      // This page is YouTube-only — gently redirect other platforms.
      if (detected.data.platform !== "youtube") {
        dispatch({
          type: "DETECT_ERROR",
          error: {
            error: NOT_YOUTUBE_MESSAGE,
            code: "UNSUPPORTED_PLATFORM",
            supportedPlatforms: ["YouTube"],
          },
        });
        return;
      }
      dispatch({ type: "DETECT_SUCCESS", result: detected.data });
      dispatch({ type: "FETCH_START" });
      const fetched = await bridge().fetchMetadata(url);
      if (!fetched.ok) {
        dispatch({ type: "FETCH_ERROR", error: fetched.error });
        return;
      }
      dispatch({ type: "FETCH_SUCCESS", metadata: fetched.data });
    } catch {
      dispatch({
        type: "DETECT_ERROR",
        error: {
          error: "Something went wrong — please try again.",
          code: "TIMEOUT",
          supportedPlatforms: ["YouTube"],
        },
      });
    }
  }, []);

  // Subscribe once to main-process download events.
  useEffect(() => {
    if (!isDesktop()) return;
    const api = bridge();
    const offProgress = api.onProgress((e) => {
      if (e.jobId !== activeJobIdRef.current) return;
      dispatch({ type: "DOWNLOAD_PROGRESS", percentage: e.pct, eta: e.eta });
    });
    const offDone = api.onDone((e) => {
      if (e.jobId !== activeJobIdRef.current) return;
      const filename = e.filePath.split(/[\\/]/).pop() ?? "video.mp4";
      dispatch({ type: "DOWNLOAD_COMPLETE", filename });
      const ctx = downloadCtxRef.current;
      try {
        libraryStore.add({
          url: ctx?.url ?? "",
          title: ctx?.meta?.title ?? filename,
          platform: "youtube",
          thumbnail: ctx?.meta?.thumbnail,
          duration: ctx?.meta?.duration,
          fileSize: ctx?.fmt?.fileSize || e.bytes,
          resolution: ctx?.fmt?.resolution,
          format: ctx?.fmt?.ext,
          filename,
        });
      } catch {
        /* swallow — library write is non-critical */
      }
      activeJobIdRef.current = null;
    });
    const offError = api.onError((e) => {
      if (e.jobId !== activeJobIdRef.current) return;
      dispatch({ type: "DOWNLOAD_ERROR", error: e.message });
      activeJobIdRef.current = null;
    });
    return () => {
      offProgress();
      offDone();
      offError();
    };
  }, []);

  const handleDownload = useCallback(
    async (formatId: string) => {
      setSelectedFormatId(formatId);
      dispatch({ type: "DOWNLOAD_START" });
      if (!isDesktop()) {
        dispatch({
          type: "DOWNLOAD_ERROR",
          error: "Please open InstaStash from the desktop app.",
        });
        return;
      }

      if (activeJobIdRef.current) bridge().cancel(activeJobIdRef.current);

      const meta =
        state.fetch.status === "fetched" ? state.fetch.metadata : undefined;
      const fmt =
        meta?.formats.find((f) => f.formatId === formatId) ?? meta?.formats[0];
      downloadCtxRef.current = { meta, fmt, url: state.url };

      try {
        const jobId = await bridge().download({
          url: state.url,
          formatId,
          directUrl: fmt?.directUrl,
          // Always merge audio for YouTube — the download handler appends
          // +bestaudio, so the saved file always has sound.
          hasAudio: fmt?.hasAudio,
          ext: fmt?.ext,
        });
        activeJobIdRef.current = jobId;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Download failed — please try again.";
        dispatch({ type: "DOWNLOAD_ERROR", error: message });
      }
    },
    [state.url, state.fetch],
  );

  const handleReset = useCallback(() => {
    setSelectedFormatId(null);
    dispatch({ type: "RESET" });
  }, []);

  const handleRetry = useCallback(() => {
    const allowed = retryState.retry();
    if (!allowed) return;
    if (state.detection.status === "error") handleDetect(state.url);
    else if (state.fetch.status === "error") handleDetect(state.url);
    else if (state.download.status === "error")
      handleDownload(selectedFormatId ?? "best");
  }, [retryState, state, selectedFormatId, handleDetect, handleDownload]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const detectionError =
    state.detection.status === "error"
      ? state.detection.error.error
      : undefined;
  const showVideoDetails =
    state.fetch.status === "fetched" && state.download.status === "idle";
  const isFetching =
    state.detection.status === "detecting" || state.fetch.status === "fetching";
  const totalFileSize =
    state.fetch.status === "fetched" && selectedFormatId
      ? state.fetch.metadata.formats.find(
          (f) => f.formatId === selectedFormatId,
        )?.fileSize
      : state.fetch.status === "fetched"
        ? state.fetch.metadata.formats[0]?.fileSize
        : undefined;
  const isIdle = state.detection.status === "idle";

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <main id="main-content" className="min-h-screen">
      {/* Nav — logo + back to home */}
      <header className="max-w-[1280px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <a
          href="/"
          className="inline-flex items-center gap-2.5 text-(--color-ink-900)"
          aria-label="InstaStash home"
        >
          <Logo className="h-8" />
        </a>
        <div className="flex items-center gap-2">
          <ThemePicker align="top-left" />
          <a
            href="/"
            className="
              inline-flex items-center gap-2
              px-4 py-2 rounded-pill
              bg-transparent border border-line-medium
              text-ink-700 no-underline
              font-grotesk font-medium text-[13px]
              hover:bg-(--color-paper-200)
              transition-colors duration-160
            "
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            back home
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative max-w-[1280px] mx-auto px-6 md:px-12 pt-12 md:pt-20 pb-16">
        <SketchStar
          className="absolute top-16 right-[200px] w-[38px] pointer-events-none hidden md:block text-rouge-500"
          style={{ transform: "rotate(12deg)" }}
        />
        <SketchArrow
          className="absolute top-[180px] right-[40px] w-[120px] pointer-events-none hidden lg:block text-ink-700"
          style={{ transform: "rotate(-10deg)" }}
          decorOpacity={0.8}
        />

        <div className="max-w-[780px]">
          {/* Eyebrow */}
          <span
            style={{ ...CAVEAT_STYLE, transform: "rotate(-2deg)" }}
            className="inline-flex items-center gap-2 text-[28px] text-(--color-rouge-500) mb-2"
          >
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6Z" />
            </svg>
            paste a link, grab the video —
          </span>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 500,
            }}
            className="text-[clamp(48px,8vw,96px)] leading-[0.96] tracking-[-0.02em] text-(--color-ink-900) m-0 text-balance max-w-[14ch]"
          >
            YouTube,{" "}
            <span className="text-rouge-500">with the audio.</span>
          </h1>

          <p className="text-[18px] leading-[1.55] text-(--color-ink-500) max-w-[52ch] mt-6 mb-9">
            Paste any YouTube link below. We grab the best video and merge the
            audio into a single MP4 — no muted clips, no fuss.
          </p>

          {/* ACTION AREA */}
          {isIdle && (
            <URLInput onSubmit={handleDetect} isLoading={false} error={undefined} />
          )}

          {state.detection.status === "error" && (
            <URLInput
              onSubmit={handleDetect}
              isLoading={false}
              error={detectionError}
            />
          )}

          {isFetching && <FetchingState />}

          {showVideoDetails && state.fetch.status === "fetched" && (
            <VideoDetails
              title={state.fetch.metadata.title}
              formats={state.fetch.metadata.formats}
              onDownload={handleDownload}
              url={state.url}
              thumbnail={state.fetch.metadata.thumbnail}
              previewVideoUrl={state.fetch.metadata.previewVideoUrl}
            />
          )}

          {state.download.status === "downloading" && (
            <DownloadProgressView
              percentage={state.download.percentage}
              totalSize={totalFileSize}
              eta={state.download.eta}
            />
          )}

          {state.download.status === "complete" && (
            <DownloadComplete
              filename={state.download.filename}
              onSaveAgain={() => handleDownload(selectedFormatId ?? "best")}
              onDownloadAnother={handleReset}
            />
          )}

          {state.download.status === "error" && (
            <ErrorDisplay
              message={state.download.error}
              onRetry={handleRetry}
              retryDisabled={retryState.isDisabled}
              countdown={retryState.countdown}
            />
          )}
          {state.fetch.status === "error" && (
            <ErrorDisplay
              message={state.fetch.error.error}
              onRetry={handleRetry}
              retryDisabled={retryState.isDisabled}
              countdown={retryState.countdown}
            />
          )}

          {isIdle && (
            <div className="mt-3.5 text-(--color-ink-300) text-[13px] flex items-center gap-2.5">
              <svg
                className="w-[14px] h-[14px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              video + audio merged into one MP4 · no account · 100% open-source
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
