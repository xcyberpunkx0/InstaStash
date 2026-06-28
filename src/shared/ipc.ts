// ─── IPC contract ────────────────────────────────────────────────────────────
//
// The single source of truth for the bridge between the renderer (React UI) and
// the Electron main process. The preload script implements `window.instastash`;
// the renderer consumes it. Keeping it here (under src/) means both sides share
// the exact same types.

import type { DetectResponse, FetchResponse } from '@/types';
import type { DetectErrorResponse, FetchErrorResponse } from '@/types/errors';

/** IPC channel names — referenced by both preload and main. */
export const Channels = {
  detect: 'instastash:detect',
  fetchMetadata: 'instastash:fetchMetadata',
  download: 'instastash:download',
  cancel: 'instastash:cancel',
  chooseFolder: 'instastash:chooseFolder',
  revealFile: 'instastash:revealFile',
  getSettings: 'instastash:getSettings',
  setSettings: 'instastash:setSettings',
  // main → renderer events
  progress: 'instastash:progress',
  done: 'instastash:done',
  error: 'instastash:error',
} as const;

export interface Settings {
  /** Folder downloads are saved into. Defaults to the OS Downloads dir. */
  downloadDir: string;
}

export interface DownloadInput {
  /** The Instagram URL the user pasted. */
  url: string;
  /** Chosen yt-dlp format id. */
  formatId: string;
  /** Container ext, used for the saved filename. */
  ext?: string;
  /** Direct CDN URL when known — enables the fast path. */
  directUrl?: string;
  /** True when `directUrl` is muxed/saveable as-is. */
  hasAudio?: boolean;
}

export interface ProgressEvent {
  jobId: string;
  /** 0–100. */
  pct: number;
  /** 'downloading' | 'merging' | 'starting'. */
  stage: string;
  /** Human-readable time remaining from yt-dlp, e.g. "00:42". Absent when unknown. */
  eta?: string;
}

export interface DoneEvent {
  jobId: string;
  filePath: string;
  bytes: number;
}

export interface ErrorEvent {
  jobId: string;
  message: string;
  code: string;
}

/** Discriminated results so the UI can render success or the typed error. */
export type DetectResult =
  | { ok: true; data: DetectResponse }
  | { ok: false; error: DetectErrorResponse };

export type FetchResult =
  | { ok: true; data: FetchResponse }
  | { ok: false; error: FetchErrorResponse };

/** The API surfaced on `window.instastash`. */
export interface InstaStashAPI {
  detect(url: string): Promise<DetectResult>;
  fetchMetadata(url: string): Promise<FetchResult>;
  /** Starts a download; resolves with a jobId. Progress/result arrive via events. */
  download(input: DownloadInput): Promise<string>;
  cancel(jobId: string): void;

  /** Subscribe to progress for any job. Returns an unsubscribe fn. */
  onProgress(cb: (e: ProgressEvent) => void): () => void;
  onDone(cb: (e: DoneEvent) => void): () => void;
  onError(cb: (e: ErrorEvent) => void): () => void;

  chooseFolder(): Promise<string | null>;
  revealFile(filePath: string): void;
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<Settings>;
}

declare global {
  interface Window {
    instastash: InstaStashAPI;
  }
}
