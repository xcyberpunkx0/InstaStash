// ─── Downloader (client) ───────────────────────────────────────────────────
//
// Two paths to save a file in the user's browser:
//
//   1. `downloadDirect`  — fetch a CDN URL, stream the body into a Blob,
//                          trigger an <a download>. Zero server bandwidth.
//                          Used when the fetcher returned `directUrl + hasAudio`.
//
//   2. `downloadViaProxy` — POST to /api/download, which runs yt-dlp and
//                           returns the file as a binary response with proper
//                           Content-Disposition header. The browser handles
//                           the save dialog automatically.

export interface DownloadResult {
  /** Suggested filename (already sanitized for the browser). */
  filename: string;
  /** Final size in bytes of the downloaded blob. */
  bytes: number;
  /** Which path actually delivered the file. Useful for analytics & debugging. */
  path: 'direct' | 'proxy';
}

export type ProgressFn = (pct: number) => void;

// ─── Common helpers ────────────────────────────────────────────────────────

function triggerSave(blob: Blob, filename: string): void {
  const safeName = filename || 'video.mp4';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Defer cleanup — the browser needs time to start the download
  // before we invalidate the blob URL and remove the element.
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 60_000);
}

function deriveFilename(srcUrl: string, fallbackExt = 'mp4'): string {
  try {
    const u = new URL(srcUrl);
    const last = u.pathname.split('/').filter(Boolean).pop() ?? '';
    const cleaned = last.replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleaned) return `${cleaned}.${fallbackExt}`;
  } catch {
    /* fallthrough */
  }
  return `video.${fallbackExt}`;
}

// ─── Direct path ───────────────────────────────────────────────────────────

/**
 * Save `directUrl` to disk via the browser. Reports progress when the response
 * advertises a Content-Length; otherwise emits 0/100 only.
 *
 * Throws on network failure, CORS rejection, non-2xx, or signal abort. Caller
 * is expected to catch and fall back to `downloadViaProxy`.
 */
export async function downloadDirect(
  directUrl: string,
  filename: string,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  onProgress(0);

  const response = await fetch(directUrl, {
    method: 'GET',
    signal,
    credentials: 'omit',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Direct download failed: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('Direct download failed: empty response body');
  }

  const totalHeader = response.headers.get('Content-Length');
  const total = totalHeader ? parseInt(totalHeader, 10) : 0;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let lastReported = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      if (total > 0) {
        const pct = Math.min(99, Math.floor((received / total) * 100));
        if (pct > lastReported) {
          lastReported = pct;
          onProgress(pct);
        }
      }
    }
  }

  const blob = new Blob(chunks as BlobPart[], {
    type: response.headers.get('Content-Type') ?? 'video/mp4',
  });

  onProgress(100);
  triggerSave(blob, filename);

  return { filename, bytes: blob.size, path: 'direct' };
}

// ─── Proxy path ────────────────────────────────────────────────────────────

/**
 * POST to `/api/download`, which runs yt-dlp and returns the video as a
 * binary response with Content-Disposition. We stream the body, track
 * progress via Content-Length, then trigger a browser save.
 */
export async function downloadViaProxy(
  srcUrl: string,
  formatId: string,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  onProgress(0);

  const response = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: srcUrl, formatId }),
    signal,
  });

  if (!response.ok) {
    let message = 'Download failed';
    try {
      const err = await response.json();
      if (typeof err.error === 'string') message = err.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error('Download response has no body');
  }

  // Extract filename from Content-Disposition header
  const disposition = response.headers.get('Content-Disposition') ?? '';
  let resultFilename = 'video.mp4';
  const filenameMatch = disposition.match(/filename="?([^";\s]+)"?/);
  if (filenameMatch?.[1]) {
    resultFilename = filenameMatch[1];
  }

  // Stream the binary response and track progress
  const totalHeader = response.headers.get('Content-Length');
  const total = totalHeader ? parseInt(totalHeader, 10) : 0;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let lastReported = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      if (total > 0) {
        const pct = Math.min(99, Math.floor((received / total) * 100));
        if (pct > lastReported) {
          lastReported = pct;
          onProgress(pct);
        }
      }
    }
  }

  const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
  onProgress(100);
  triggerSave(blob, resultFilename);

  return { filename: resultFilename, bytes: blob.size, path: 'proxy' };
}

// ─── Smart router ──────────────────────────────────────────────────────────

export interface SmartDownloadInput {
  /** The original page URL the user pasted. */
  srcUrl: string;
  /** yt-dlp format id; used by the proxy fallback. */
  formatId: string;
  /** Direct CDN URL when known. Triggers the fast path. */
  directUrl?: string;
  /** True if `directUrl` is muxed (or audio-only) and saveable as-is. */
  hasAudio?: boolean;
  /** Container ext for filename derivation. */
  ext?: string;
}

/**
 * Decide between direct and proxy paths. Falls back to proxy if the fast path
 * fails for any reason that isn't an explicit user abort.
 */
export async function smartDownload(
  input: SmartDownloadInput,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  const canFastPath = Boolean(input.directUrl && input.hasAudio);
  if (canFastPath) {
    const filename = deriveFilename(input.srcUrl, input.ext ?? 'mp4');
    try {
      return await downloadDirect(input.directUrl as string, filename, onProgress, signal);
    } catch (err) {
      // Honor user-initiated cancels — never fall back.
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      // Anything else (CORS, 4xx, expired URL, transient network) → degrade
      // to the proxy path. The user gets their file; we eat the bandwidth.
      // eslint-disable-next-line no-console
      console.warn('[downloader] direct path failed, falling back to proxy:', err);
    }
  }
  return downloadViaProxy(input.srcUrl, input.formatId, onProgress, signal);
}
