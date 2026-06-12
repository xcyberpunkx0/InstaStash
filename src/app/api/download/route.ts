import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { createReadStream } from 'fs';
import { mkdtemp, readdir, rm, stat } from 'fs/promises';
import { Readable } from 'stream';
import { platformDetector, isDetectSuccess } from '@/lib/platform-detector';
import type { DownloadRequest } from '@/types';

/**
 * POST /api/download
 *
 * Downloads an Instagram video using yt-dlp into a per-request temp
 * directory, then streams the file back with Content-Disposition /
 * Content-Type headers so the browser saves it as a named file.
 *
 * Production hardening:
 *  - Only Instagram post/reel URLs are accepted (validated server-side).
 *  - Output template uses %(ext)s so the file is found even when yt-dlp
 *    picks a different container than expected.
 *  - The requested formatId is honored with safe fallbacks that always
 *    include audio.
 *  - stderr is captured so failures surface a real reason, not just an
 *    exit code.
 *  - Stall timeout (no output) plus a hard overall timeout.
 *  - The yt-dlp process is killed if the client disconnects.
 *  - The file is streamed from disk, not buffered in memory.
 */

/** Kill the download if yt-dlp produces no output for this long. */
const STALL_TIMEOUT_MS = 30_000;
/** Kill the download if it has not finished within this long overall. */
const HARD_TIMEOUT_MS = 5 * 60_000;
/** Refuse files larger than this (yt-dlp skips the download past the cap). */
const MAX_FILESIZE = '500M';

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  m4a: 'audio/mp4',
};

export async function POST(request: NextRequest): Promise<Response> {
  let body: DownloadRequest;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid request body', 'INVALID_REQUEST');
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const formatId = typeof body.formatId === 'string' ? body.formatId.trim() : '';

  if (!url || !formatId) {
    return jsonError(400, 'Both url and formatId are required', 'INVALID_REQUEST');
  }

  const detection = platformDetector.detect(url);
  if (!isDetectSuccess(detection)) {
    return jsonError(400, 'Only Instagram post/reel URLs are supported', 'INVALID_REQUEST');
  }

  let tempDir: string | null = null;
  const cleanup = () => {
    if (tempDir) {
      rm(tempDir, { recursive: true, force: true }).catch(() => {});
      tempDir = null;
    }
  };

  try {
    tempDir = await mkdtemp(join(tmpdir(), 'vdl-'));

    const result = await downloadWithYtDlp(
      detection.normalizedUrl,
      formatId,
      tempDir,
      request.signal,
    );

    const filePath = await findProducedFile(tempDir, result.stderrTail);
    const { size } = await stat(filePath);
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'mp4';
    const filename = `${detection.videoId}.${ext}`;

    // Stream from disk; remove the temp dir once the stream is done.
    const fileStream = createReadStream(filePath);
    fileStream.once('close', cleanup);

    return new Response(Readable.toWeb(fileStream) as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': CONTENT_TYPES[ext] ?? 'video/mp4',
        'Content-Length': String(size),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    cleanup();

    if (request.signal.aborted) {
      // Client went away; the response will never be read.
      return jsonError(499, 'Client cancelled the download', 'DOWNLOAD_CANCELLED');
    }

    if (error instanceof YtDlpError) {
      return jsonError(error.status, error.message, 'DOWNLOAD_FAILED');
    }

    const message = error instanceof Error ? error.message : 'Download failed';
    return jsonError(502, message, 'DOWNLOAD_FAILED');
  }
}

function jsonError(status: number, error: string, code: string): Response {
  return Response.json({ error, code }, { status });
}

/** Error with an HTTP status derived from yt-dlp's stderr. */
class YtDlpError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
  ) {
    super(message);
    this.name = 'YtDlpError';
  }
}

/**
 * Builds the -f selector. The user's chosen format is tried first (merged
 * with the best audio, then alone), then we degrade to the best pre-muxed
 * file, then best video+audio. Format ids that aren't plausible yt-dlp ids
 * (e.g. the scraper's "original") skip straight to the fallbacks.
 */
function buildFormatSelector(formatId: string): string {
  const fallback = 'b/bestvideo*+bestaudio/best';
  const isPlausibleId = /^[A-Za-z0-9_.-]+$/.test(formatId)
    && !['best', 'original'].includes(formatId.toLowerCase());
  return isPlausibleId ? `${formatId}+bestaudio/${formatId}/${fallback}` : fallback;
}

/**
 * Maps the tail of yt-dlp's stderr to a user-facing message and HTTP status.
 */
function classifyFailure(stderrTail: string, exitCode: number | null): YtDlpError {
  const errorLine = stderrTail
    .split('\n')
    .reverse()
    .find((line) => line.startsWith('ERROR:'))
    ?.replace(/^ERROR:\s*(\[[^\]]*\]\s*)?([\w-]+:\s*)?/, '')
    .trim();

  const haystack = `${errorLine ?? ''} ${stderrTail}`.toLowerCase();

  if (/login required|requested content is not available|rate-?limit/.test(haystack)) {
    return new YtDlpError(
      'Instagram is blocking anonymous access to this video right now. Try again in a few minutes.',
      429,
    );
  }
  if (/private/.test(haystack)) {
    return new YtDlpError('This video is private and can\'t be downloaded.', 403);
  }
  if (/unsupported url|not a valid url/.test(haystack)) {
    return new YtDlpError('This URL isn\'t a downloadable Instagram video.', 400);
  }
  if (/max-filesize/.test(haystack)) {
    return new YtDlpError(`This video exceeds the ${MAX_FILESIZE} download limit.`, 413);
  }
  if (/requested format is not available/.test(haystack)) {
    return new YtDlpError('The selected quality is no longer available for this video.', 409);
  }

  return new YtDlpError(
    errorLine ?? `yt-dlp exited with code ${exitCode}`,
    502,
  );
}

interface YtDlpResult {
  stderrTail: string;
}

/**
 * Runs yt-dlp, writing the file into `outputDir`. Resolves on exit code 0,
 * rejects with a classified YtDlpError otherwise.
 */
function downloadWithYtDlp(
  url: string,
  formatId: string,
  outputDir: string,
  signal: AbortSignal,
): Promise<YtDlpResult> {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', buildFormatSelector(formatId),
      '-o', join(outputDir, 'video.%(ext)s'),
      '--newline',
      '--no-part',
      '--no-playlist',
      '--max-filesize', MAX_FILESIZE,
      '--merge-output-format', 'mp4',
      url,
    ];

    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderrTail = '';
    let settled = false;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimers();
      signal.removeEventListener('abort', onAbort);
      proc.kill('SIGTERM');
      reject(error);
    };

    const succeed = (result: YtDlpResult) => {
      if (settled) return;
      settled = true;
      clearTimers();
      signal.removeEventListener('abort', onAbort);
      resolve(result);
    };

    const hardTimer = setTimeout(() => {
      fail(new YtDlpError('Download took too long and was cancelled.', 504));
    }, HARD_TIMEOUT_MS);

    const resetStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        fail(new YtDlpError('Download timed out — no progress for 30 seconds.', 504));
      }, STALL_TIMEOUT_MS);
    };

    const clearTimers = () => {
      clearTimeout(hardTimer);
      if (stallTimer) clearTimeout(stallTimer);
    };

    const onAbort = () => fail(new Error('Client aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();

    resetStallTimer();

    proc.stdout?.on('data', resetStallTimer);
    proc.stderr?.on('data', (chunk: Buffer) => {
      resetStallTimer();
      stderrTail = (stderrTail + chunk.toString()).slice(-8192);
    });

    proc.on('error', (err) => {
      fail(new YtDlpError(`Failed to run yt-dlp: ${err.message}`, 500));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        succeed({ stderrTail });
      } else {
        fail(classifyFailure(stderrTail, code));
      }
    });
  });
}

/**
 * Finds the file yt-dlp produced. Guards against the "exit 0 but nothing
 * written" class of failures (e.g. max-filesize skip) with a clear error.
 */
async function findProducedFile(dir: string, stderrTail: string): Promise<string> {
  const entries = await readdir(dir);
  const candidates = entries.filter(
    (name) => !name.endsWith('.part') && !name.endsWith('.ytdl'),
  );

  if (candidates.length === 0) {
    if (/max-filesize/i.test(stderrTail)) {
      throw new YtDlpError(`This video exceeds the ${MAX_FILESIZE} download limit.`, 413);
    }
    throw new YtDlpError('Download finished but no file was produced. Please try again.', 502);
  }

  // If merging left intermediates behind, prefer the largest file.
  if (candidates.length === 1) return join(dir, candidates[0]);

  const sized = await Promise.all(
    candidates.map(async (name) => {
      const filePath = join(dir, name);
      const { size } = await stat(filePath);
      return { filePath, size };
    }),
  );
  sized.sort((a, b) => b.size - a.size);
  return sized[0].filePath;
}
