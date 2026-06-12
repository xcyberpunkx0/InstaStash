// Shared interfaces and types for the Video Downloader application

/** Platform types supported by the application */
export type Platform = 'instagram';

/** Content types for each platform */
export type ContentType = 'post' | 'reel';

// ─── API Request/Response Interfaces ─────────────────────────────────────────

/** POST /api/detect request body */
export interface DetectRequest {
  url: string;
}

/** POST /api/detect success response */
export interface DetectResponse {
  platform: Platform;
  contentType: ContentType;
  videoId: string;
  normalizedUrl: string;
}

/** POST /api/fetch request body */
export interface FetchRequest {
  url: string;
  platform: Platform;
}

/** POST /api/fetch success response */
export interface FetchResponse {
  title: string;
  thumbnail?: string;
  duration: number;
  formats: VideoFormat[];
  previewVideoUrl?: string;
}

/** POST /api/download request body */
export interface DownloadRequest {
  url: string;
  formatId: string;
}

// ─── Video Format & Quality ──────────────────────────────────────────────────

/** A single video format option returned by the fetcher */
export interface VideoFormat {
  formatId: string;
  resolution: string;
  fileSize: number;
  ext: string;
  quality: string;

  // ─── Direct-CDN download hints (Option A3) ────────────────────────────
  // When present, the browser can save the file directly from the platform CDN
  // without us proxying the bytes. See `src/lib/format-classifier.ts` for the
  // rules that populate these fields.

  /** Signed CDN URL valid for ~hours. Only set when this is a muxed, progressive HTTP stream. */
  directUrl?: string;
  /** True if the stream contains audio (combined-AV or audio-only). */
  hasAudio?: boolean;
  /** Epoch ms when `directUrl` is expected to expire, if extractable. */
  expiresAt?: number;
}

/** A quality option presented to the user in the UI */
export interface VideoQuality {
  formatId: string;
  resolution: string;
  fileSize: number;
  label: string;
}

// ─── Application State ───────────────────────────────────────────────────────

/** Top-level application state */
export interface AppState {
  url: string;
  detection: DetectionState;
  fetch: FetchState;
  download: DownloadState;
}

/** State machine for URL detection */
export type DetectionState =
  | { status: 'idle' }
  | { status: 'detecting' }
  | { status: 'detected'; result: DetectResponse }
  | { status: 'error'; error: import('./errors').DetectErrorResponse };

/** State machine for video metadata fetching */
export type FetchState =
  | { status: 'idle' }
  | { status: 'fetching' }
  | { status: 'fetched'; metadata: FetchResponse }
  | { status: 'error'; error: import('./errors').FetchErrorResponse };

/** State machine for video download */
export type DownloadState =
  | { status: 'idle' }
  | { status: 'downloading'; percentage: number }
  | { status: 'complete'; filename: string }
  | { status: 'error'; error: string; retryCount: number };

/** Retry state for managing retry attempts and cooldown */
export interface RetryState {
  attempts: number;
  maxAttempts: 3;
  cooldownSeconds: 30;
  cooldownEndTime?: number;
  isDisabled: boolean;
}
