"use client";

import React, {
  useReducer,
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import { URLInput } from "@/components/features/URLInput";
import { VideoDetails } from "@/components/features/VideoDetails";
import { DownloadProgressView } from "@/components/features/DownloadProgress";
import { DownloadComplete } from "@/components/features/DownloadComplete";
import { ErrorDisplay } from "@/components/features/ErrorDisplay";
import { FetchingState } from "@/components/features/FetchingState";
import { StickyNote } from "@/components/ui";
import { Logo } from "@/components/ui/Logo";
import { ThemePicker } from "@/components/ThemeSwitcher";
import {
  SketchArrow,
  SketchStar,
  DoodleSpiral,
  DoodleCircles,
} from "@/components/ui/SketchMarks";
import { useRetryState } from "@/hooks/useRetryState";
import { libraryStore } from "@/lib/library-store";
import { bridge, isDesktop } from "@/lib/desktop-client";
import type {
  AppState,
  DetectResponse,
  FetchResponse,
  VideoFormat,
  VideoQuality,
} from "@/types";
import type { DetectErrorResponse, FetchErrorResponse } from "@/types/errors";

// ─── State Management ────────────────────────────────────────────────────────

type AppAction =
  | { type: "SET_URL"; url: string }
  | { type: "DETECT_START" }
  | { type: "DETECT_SUCCESS"; result: DetectResponse }
  | { type: "DETECT_ERROR"; error: DetectErrorResponse }
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; metadata: FetchResponse }
  | { type: "FETCH_ERROR"; error: FetchErrorResponse }
  | { type: "DOWNLOAD_START" }
  | { type: "DOWNLOAD_PROGRESS"; percentage: number }
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
        download: { status: "downloading", percentage: action.percentage },
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

const RATE_LIMIT_DEFAULT_SECONDS = 60;

// ─── Reusable handwritten Caveat style ───────────────────────────────────────
const CAVEAT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-hand)",
  fontWeight: 500,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  // Tracks the in-flight download job so progress/done/error events can be
  // matched to it, plus the context needed to write the library entry on done.
  const activeJobIdRef = useRef<string | null>(null);
  const downloadCtxRef = useRef<{
    meta?: FetchResponse;
    fmt?: VideoFormat;
    platform: string;
    url: string;
  } | null>(null);
  const retryState = useRetryState();
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);

  // ─── Deep-link: ?url=... auto-starts detection on mount ──────────────────
  const didAutoStartRef = useRef(false);
  useEffect(() => {
    if (didAutoStartRef.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("url");
    if (incoming && incoming.trim()) {
      didAutoStartRef.current = true;
      // strip the param so a refresh doesn't re-trigger
      const url = new URL(window.location.href);
      url.searchParams.delete("url");
      window.history.replaceState(null, "", url.toString());
      handleDetectRef.current?.(incoming.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleDetectRef = useRef<((url: string) => void) | null>(null);

  const handleDetect = useCallback(async (url: string) => {
    dispatch({ type: "SET_URL", url });
    dispatch({ type: "DETECT_START" });
    if (!isDesktop()) {
      dispatch({
        type: "DETECT_ERROR",
        error: {
          error: "Please open InstaStash from the desktop app.",
          code: "TIMEOUT",
          supportedPlatforms: ["Instagram"],
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
      dispatch({ type: "DETECT_SUCCESS", result: detected.data });
      // Auto-fetch metadata after detection
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
          supportedPlatforms: ["Instagram"],
        },
      });
    }
  }, []);

  // Keep the autostart ref pointed at the latest handler.
  handleDetectRef.current = handleDetect;

  // Subscribe once to the main-process download events and route them into the
  // reducer. Events are matched to the active job via activeJobIdRef.
  useEffect(() => {
    if (!isDesktop()) return;
    const api = bridge();
    const offProgress = api.onProgress((e) => {
      if (e.jobId !== activeJobIdRef.current) return;
      dispatch({ type: "DOWNLOAD_PROGRESS", percentage: e.pct });
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
          platform: ctx?.platform ?? "instagram",
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

      // Cancel any previous in-flight job before starting a new one.
      if (activeJobIdRef.current) bridge().cancel(activeJobIdRef.current);

      const meta =
        state.fetch.status === "fetched" ? state.fetch.metadata : undefined;
      const fmt =
        meta?.formats.find((f) => f.formatId === formatId) ?? meta?.formats[0];
      const platform =
        state.detection.status === "detected"
          ? state.detection.result.platform
          : "instagram";
      downloadCtxRef.current = { meta, fmt, platform, url: state.url };

      try {
        const jobId = await bridge().download({
          url: state.url,
          formatId,
          directUrl: fmt?.directUrl,
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
    [state.url, state.fetch, state.detection],
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
    else if (state.download.status === "error") {
      handleDownload(selectedFormatId ?? "best");
    }
  }, [retryState, state, selectedFormatId, handleDetect, handleDownload]);

  // ─── Derived ─────────────────────────────────────────────────────────────

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

  // What state are we currently showing in the action area?
  const isIdle = state.detection.status === "idle";

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <main id="main-content" className="min-h-screen">
      {/* Minimal nav — logo + library link */}
      <header className="max-w-[1280px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <a
          href="/"
          className="inline-flex items-center gap-2.5 text-(--color-ink-900)"
          aria-label="InstaStash"
        >
          <Logo className="h-8" />
        </a>
        <div className="flex items-center gap-2">
          <ThemePicker align="top-left" />
          <a
            href="/library"
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
              <path d="M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v1.5" />
              <path d="M13.9 17.45c-1.2-1.2-1.14-2.8-.2-3.73a2.43 2.43 0 0 1 3.44 0l.36.34.34-.34a2.43 2.43 0 0 1 3.45-.01v0c.95.95 1 2.53-.2 3.74L17.5 21Z" />
            </svg>
            your library
          </a>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════════════════ */}
      <section className="relative max-w-[1280px] mx-auto px-6 md:px-12 pt-12 md:pt-20 pb-16">
        {/* Decorations — themeable inline SVG marks (use currentColor) */}
        <SketchStar
          className="absolute top-16 right-[200px] w-[38px] pointer-events-none hidden md:block text-terra-500"
          style={{ transform: "rotate(12deg)" }}
        />
        <DoodleSpiral
          className="absolute top-[240px] right-[280px] w-[70px] pointer-events-none hidden lg:block text-terra-500"
          decorOpacity={0.6}
        />
        <SketchArrow
          className="absolute top-[180px] right-[40px] w-[120px] pointer-events-none hidden lg:block text-ink-700"
          style={{ transform: "rotate(-10deg)" }}
          decorOpacity={0.8}
        />

        {/* Sticky notes */}
        <div className="hidden xl:block absolute top-[120px] right-[80px]">
          <StickyNote color="yellow" rotate={-3}>
            a tiny library
            <br />
            that&rsquo;s just yours ✦
          </StickyNote>
        </div>
        <div className="hidden xl:block absolute top-[320px] right-[140px]">
          <StickyNote color="sage" rotate={2}>
            no ads, no upsell,
            <br />
            no nonsense
          </StickyNote>
        </div>

        {/* Content */}
        <div className="max-w-[780px]">
          {/* Eyebrow — Caveat */}
          <span
            style={{ ...CAVEAT_STYLE, transform: "rotate(-2deg)" }}
            className="text-[28px] text-(--color-terra-600) inline-block mb-2"
          >
            a quieter way to keep the internet —
          </span>

          {/* Headline — Cormorant italic */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 500,
            }}
            className="text-[clamp(48px,8vw,96px)] leading-[0.96] tracking-[-0.02em] text-(--color-ink-900) m-0 text-balance max-w-[14ch]"
          >
            Save the internet,{" "}
            <span className="text-terra-500">beautifully.</span>
          </h1>

          <p className="text-[18px] leading-[1.55] text-(--color-ink-500) max-w-[52ch] mt-6 mb-9">
            Download videos and Reels from Instagram — fast, open-source, and
            blessedly distraction-free. Drop a link below.
          </p>

          {/* ══════════════════════════════════════════════════════════
              ACTION AREA — state-driven
              ══════════════════════════════════════════════════════════ */}

          {/* Idle: empty URL input */}
          {isIdle && (
            <URLInput
              onSubmit={handleDetect}
              isLoading={false}
              error={undefined}
            />
          )}

          {/* Detection / fetch error: show input with error message */}
          {state.detection.status === "error" && (
            <URLInput
              onSubmit={handleDetect}
              isLoading={false}
              error={detectionError}
            />
          )}

          {/* Fetching state: handwritten "looking for the file..." */}
          {isFetching && <FetchingState />}

          {/* Video metadata fetched: show URL + filename + quality */}
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

          {/* Downloading: thick terra progress bar */}
          {state.download.status === "downloading" && (
            <DownloadProgressView
              percentage={state.download.percentage}
              totalSize={totalFileSize}
            />
          )}

          {/* Complete: success card + Download another */}
          {state.download.status === "complete" && (
            <DownloadComplete
              filename={state.download.filename}
              onSaveAgain={() => handleDownload(selectedFormatId ?? "best")}
              onDownloadAnother={handleReset}
            />
          )}

          {/* Errors */}
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

          {/* Hint — only in idle state */}
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
              style={{ ...CAVEAT_STYLE, transform: "rotate(-1.5deg)" }}
              className="text-[24px] text-(--color-terra-600) inline-block mb-1.5"
            >
              three steps, then forget about it —
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 500,
              }}
              className="text-[clamp(36px,5vw,56px)] leading-[1.04] tracking-[-0.015em] text-(--color-ink-900) m-0 text-balance"
            >
              It&rsquo;s almost embarrassing
              <br />
              how simple this is.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {[
              {
                num: "01",
                title: "Paste a link.",
                desc: "Any public Instagram post or reel link. We'll detect the media format and best quality automatically.",
              },
              {
                num: "02",
                title: "Pick your shape.",
                desc: "Original quality or standard resolutions? Choose once and we'll remember for next time.",
              },
              {
                num: "03",
                title: "It's in your library.",
                desc: "Quiet, tagged, and searchable. Open it in any player you already love.",
              },
            ].map((step, i) => (
              <div key={step.num} className="relative">
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontWeight: 500,
                  }}
                  className="text-[64px] leading-none text-terra-500"
                >
                  {step.num}
                </div>
                <h3
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                  className="mt-2 mb-1.5 text-[26px] text-(--color-ink-900) m-0"
                >
                  {step.title}
                </h3>
                <p className="text-[15px] leading-[1.6] text-(--color-ink-500) m-0">
                  {step.desc}
                </p>

                {/* Hand-drawn arrow between steps */}
                {i < 2 && (
                  <SketchArrow
                    className="hidden md:block absolute top-[12px] -right-8 w-[64px] text-ink-700"
                    style={{
                      transform: i === 0 ? "rotate(-6deg)" : "rotate(4deg)",
                    }}
                    decorOpacity={0.7}
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
            <DoodleCircles
              className="h-[50px] mb-5 mx-auto text-(--color-ink-500)"
              decorOpacity={0.5}
            />
            <blockquote
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 500,
              }}
              className="text-[clamp(28px,4vw,42px)] leading-[1.18] text-(--color-ink-900) m-0 text-balance"
            >
              &ldquo;It feels like writing in a Moleskine. I didn&rsquo;t know a
              download manager could feel{" "}
              <span className="bg-[linear-gradient(transparent_70%,var(--color-terra-200)_70%)]">
                like this.
              </span>
              &rdquo;
            </blockquote>
            <div
              style={CAVEAT_STYLE}
              className="mt-6 text-h3 text-(--color-ink-500)"
            >
              — maya k., illustrator
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════════════════════════ */}
      {/* ════════════════════════════════════════════════════════════════
          FOOTER — design-system multi-column layout
          ════════════════════════════════════════════════════════════════ */}
      <footer
        className="max-w-[1280px] mx-auto px-6 md:px-12 pt-[60px] pb-12 bg-no-repeat bg-position-[top_center] bg-size-[100%_8px]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 8' preserveAspectRatio='none'><path d='M2 4 C 120 1.5, 240 6.5, 360 4 S 720 1.5, 840 4 1080 6.5, 1198 4' fill='none' stroke='%231F1B16' stroke-opacity='0.35' stroke-width='1.2' stroke-linecap='round'/></svg>")`,
        }}
      >
        <div className="flex justify-between items-start gap-10 flex-wrap">
          {/* Brand */}
          <div className="flex-1 min-w-[240px]">
            <Logo className="h-8 text-(--color-ink-900)" />
            <p className="text-(--color-ink-500) text-small max-w-[38ch] mt-3">
              A quieter way to keep the internet. Made with care, open-source
              forever.
            </p>
          </div>

          {/* Project */}
          <div>
            <h5 className="font-grotesk font-semibold text-[11px] uppercase tracking-[0.18em] text-ink-400 m-0 mb-3">
              Project
            </h5>
            <a
              href="https://github.com/xcyberpunkx0"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-ink-700 no-underline text-small mb-1.5 hover:text-(--color-terra-600) transition-colors duration-160"
            >
              GitHub
            </a>
            <a
              href="https://github.com/xcyberpunkx0"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-ink-700 no-underline text-small mb-1.5 hover:text-(--color-terra-600) transition-colors duration-160"
            >
              Source code
            </a>
            <a
              href="/library"
              className="block text-ink-700 no-underline text-small mb-1.5 hover:text-(--color-terra-600) transition-colors duration-160"
            >
              Your library
            </a>
          </div>

          {/* Connect */}
          <div>
            <h5 className="font-grotesk font-semibold text-[11px] uppercase tracking-[0.18em] text-ink-400 m-0 mb-3">
              Connect
            </h5>
            <a
              href="https://github.com/xcyberpunkx0"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-ink-700 no-underline text-small mb-1.5 hover:text-(--color-terra-600) transition-colors duration-160"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/aditya-gup1a/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-ink-700 no-underline text-small mb-1.5 hover:text-(--color-terra-600) transition-colors duration-160"
            >
              LinkedIn
            </a>
            <a
              href="https://www.adityagupta.space/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-ink-700 no-underline text-small mb-1.5 hover:text-(--color-terra-600) transition-colors duration-160"
            >
              Portfolio
            </a>
          </div>

          {/* Read */}
          <div>
            <h5 className="font-grotesk font-semibold text-[11px] uppercase tracking-[0.18em] text-ink-400 m-0 mb-3">
              Read
            </h5>
            <a
              href="https://github.com/xcyberpunkx0"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-ink-700 no-underline text-small mb-1.5 hover:text-(--color-terra-600) transition-colors duration-160"
            >
              Readme
            </a>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-ink-700 no-underline text-small mb-1.5 hover:text-(--color-terra-600) transition-colors duration-160"
            >
              License
            </a>
          </div>
        </div>

        {/* Bottom bar — handwritten, matches the design system reference */}
        <div className="mt-10 pt-[18px] flex justify-between items-center flex-wrap gap-2 font-hand text-ink-400 text-[18px]">
          <span>© {new Date().getFullYear()} · made by Aditya</span>
          <span>★ MIT licensed</span>
        </div>
      </footer>
    </main>
  );
}
