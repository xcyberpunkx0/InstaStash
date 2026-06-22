// Download manager: runs yt-dlp into the user's chosen folder, parses progress,
// and reports back to the renderer via webContents events. Adapted from the old
// /api/download route, but saves to disk instead of streaming over HTTP.
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import type { WebContents } from 'electron';
import { platformDetector, isDetectSuccess } from '@/lib/platform-detector';
import { getCookieArgs } from '@/lib/ytdlp-cookies';
import { getYtDlpPath, getFfmpegPath } from '../binaries';
import { getSettings } from '../settings';
import { Channels, type DownloadInput } from '@/shared/ipc';

const STALL_TIMEOUT_MS = 30_000;
const HARD_TIMEOUT_MS = 5 * 60_000;
const MAX_FILESIZE = '500M';

/** Active jobs, so cancel() can kill the right process. */
const jobs = new Map<string, ChildProcess>();

/** Build the -f selector (chosen format first, then safe muxed fallbacks). */
function buildFormatSelector(formatId: string): string {
  const fallback = 'b/bestvideo*+bestaudio/best';
  const isPlausibleId =
    /^[A-Za-z0-9_.-]+$/.test(formatId) &&
    !['best', 'original'].includes(formatId.toLowerCase());
  return isPlausibleId ? `${formatId}+bestaudio/${formatId}/${fallback}` : fallback;
}

/** Map yt-dlp stderr to a user-facing message + code. */
function classifyFailure(stderrTail: string, exitCode: number | null): { message: string; code: string } {
  const errorLine = stderrTail
    .split('\n')
    .reverse()
    .find((line) => line.startsWith('ERROR:'))
    ?.replace(/^ERROR:\s*(\[[^\]]*\]\s*)?([\w-]+:\s*)?/, '')
    .trim();
  const haystack = `${errorLine ?? ''} ${stderrTail}`.toLowerCase();

  if (/login required|requested content is not available|rate-?limit/.test(haystack))
    return { message: 'Instagram is blocking access right now. Try again in a few minutes.', code: 'RATE_LIMITED' };
  if (/private/.test(haystack))
    return { message: "This video is private and can't be downloaded.", code: 'PRIVATE' };
  if (/unsupported url|not a valid url/.test(haystack))
    return { message: "This URL isn't a downloadable Instagram video.", code: 'INVALID' };
  if (/max-filesize/.test(haystack))
    return { message: `This video exceeds the ${MAX_FILESIZE} download limit.`, code: 'TOO_LARGE' };
  if (/requested format is not available/.test(haystack))
    return { message: 'The selected quality is no longer available.', code: 'FORMAT_GONE' };

  return { message: errorLine ?? `yt-dlp exited with code ${exitCode}`, code: 'DOWNLOAD_FAILED' };
}

/** Pull a 0–100 percentage out of a yt-dlp --newline progress line. */
function parsePct(line: string): number | null {
  const m = line.match(/\[download\]\s+([\d.]+)%/);
  return m ? Math.min(99, Math.floor(parseFloat(m[1]))) : null;
}

/** Find the produced file (largest non-temp file in the dir). */
async function findProducedFile(dir: string): Promise<string | null> {
  const entries = (await readdir(dir)).filter((n) => !n.endsWith('.part') && !n.endsWith('.ytdl'));
  if (entries.length === 0) return null;
  const sized = await Promise.all(
    entries.map(async (name) => ({ p: path.join(dir, name), size: (await stat(path.join(dir, name))).size })),
  );
  sized.sort((a, b) => b.size - a.size);
  return sized[0].p;
}

/**
 * Starts a download. Returns the jobId immediately; emits progress/done/error
 * events on `wc` keyed by that jobId.
 */
export async function startDownload(wc: WebContents, input: DownloadInput): Promise<string> {
  const jobId = randomUUID();

  // Validate up front so a bad URL fails fast with a typed error.
  const detection = platformDetector.detect(input.url);
  if (!isDetectSuccess(detection)) {
    queueMicrotask(() =>
      wc.send(Channels.error, { jobId, message: 'Only Instagram post/reel URLs are supported.', code: 'INVALID' }),
    );
    return jobId;
  }

  const { downloadDir } = await getSettings();
  const outTemplate = path.join(downloadDir, `${detection.videoId}.%(ext)s`);

  const args = [
    '-f', buildFormatSelector(input.formatId),
    '-o', outTemplate,
    '--newline',
    '--no-part',
    '--no-playlist',
    '--max-filesize', MAX_FILESIZE,
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', getFfmpegPath(),
    ...getCookieArgs(),
    detection.normalizedUrl,
  ];

  wc.send(Channels.progress, { jobId, pct: 0, stage: 'starting' });

  const proc = spawn(getYtDlpPath(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
  jobs.set(jobId, proc);

  let stderrTail = '';
  let settled = false;
  let stallTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    clearTimeout(hardTimer);
    if (stallTimer) clearTimeout(stallTimer);
    jobs.delete(jobId);
  };

  const fail = (message: string, code: string) => {
    if (settled) return;
    settled = true;
    cleanup();
    proc.kill('SIGTERM');
    wc.send(Channels.error, { jobId, message, code });
  };

  const hardTimer = setTimeout(() => fail('Download took too long and was cancelled.', 'TIMEOUT'), HARD_TIMEOUT_MS);
  const resetStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => fail('Download stalled — no progress for 30 seconds.', 'TIMEOUT'), STALL_TIMEOUT_MS);
  };
  resetStall();

  proc.stdout?.on('data', (chunk: Buffer) => {
    resetStall();
    for (const line of chunk.toString().split('\n')) {
      const pct = parsePct(line);
      if (pct !== null) wc.send(Channels.progress, { jobId, pct, stage: 'downloading' });
      else if (line.includes('[Merger]')) wc.send(Channels.progress, { jobId, pct: 99, stage: 'merging' });
    }
  });

  proc.stderr?.on('data', (chunk: Buffer) => {
    resetStall();
    stderrTail = (stderrTail + chunk.toString()).slice(-8192);
  });

  proc.on('error', (err) => fail(`Failed to run yt-dlp: ${err.message}`, 'SPAWN_FAILED'));

  proc.on('close', async (code) => {
    if (settled) return;
    if (code !== 0) {
      const { message, code: errCode } = classifyFailure(stderrTail, code);
      return fail(message, errCode);
    }
    try {
      const filePath = await findProducedFile(downloadDir);
      if (!filePath) return fail('Download finished but no file was produced.', 'NO_FILE');
      const { size } = await stat(filePath);
      settled = true;
      cleanup();
      wc.send(Channels.progress, { jobId, pct: 100, stage: 'downloading' });
      wc.send(Channels.done, { jobId, filePath, bytes: size });
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Failed to finalize download.', 'NO_FILE');
    }
  });

  return jobId;
}

/** Kill a running job, if any. */
export function cancelDownload(jobId: string): void {
  const proc = jobs.get(jobId);
  if (proc) {
    proc.kill('SIGTERM');
    jobs.delete(jobId);
  }
}
