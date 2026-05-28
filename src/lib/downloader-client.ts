// ─── Downloader (client) ───────────────────────────────────────────────────
//
// Two paths to save a file in the user's browser:
//
//   1. `downloadDirect`  — fetch a CDN URL, stream the body into a Blob,
//                          trigger an <a download>. Zero server bandwidth.
//                          Used when the fetcher returned `directUrl + hasAudio`.
//
//   2. `downloadViaProxy` — POST to /api/download, parse the SSE stream the
//                           server emits (progress + base64 file frames),
//                           assemble a Blob, trigger an <a download>. This is
//                           the existing path; bytes flow through our server.
//
// Both return a uniform `DownloadResult` so the caller can write to the
// library identically.

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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function deriveFilename(srcUrl: string, fallbackExt = 'mp4'): string {
  try {
    const u = new URL(srcUrl);
    // Prefer the YouTube `v` param for stable, recognizable filenames.
    const v = u.searchParams.get('v');
    if (v) return `${v}.${fallbackExt}`;
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
    // CDNs vary on credentials; keep it simple.
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

// ─── Proxy path (existing SSE) ─────────────────────────────────────────────

/**
 * Hit our `/api/download` SSE endpoint, parse `progress`/`file`/`error`
 * frames, assemble the file from the base64 payload, and trigger a save.
 *
 * Mirrors the original handleDownload() flow from src/app/page.tsx.
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

  if (!response.ok || !response.body) {
    throw new Error('Failed to start download');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Filled in by the 'file' frame.
  let resultFilename = '';
  let resultBytes = 0;
  let blob: Blob | null = null;

  // Filled in by the 'error' frame, surfaced after the stream closes.
  let serverError: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith('data: ')) continue;
      let evt: { type: string; [k: string]: unknown };
      try {
        evt = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      switch (evt.type) {
        case 'progress': {
          const pct = typeof evt.percentage === 'number' ? evt.percentage : 0;
          onProgress(Math.min(99, Math.max(0, pct)));
          break;
        }
        case 'file': {
          const data = typeof evt.data === 'string' ? evt.data : '';
          const filename = typeof evt.filename === 'string' ? evt.filename : 'video.mp4';
          const mimeType = typeof evt.mimeType === 'string' ? evt.mimeType : 'video/mp4';
          const byteString = atob(data);
          const bytes = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
          blob = new Blob([bytes as BlobPart], { type: mimeType });
          resultFilename = filename;
          resultBytes = blob.size;
          break;
        }
        case 'error': {
          serverError = typeof evt.message === 'string' ? evt.message : 'Download failed';
          break;
        }
      }
    }
  }

  if (serverError) throw new Error(serverError);
  if (!blob) throw new Error('Download finished without producing a file');

  onProgress(100);
  triggerSave(blob, resultFilename);

  return { filename: resultFilename, bytes: resultBytes, path: 'proxy' };
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
