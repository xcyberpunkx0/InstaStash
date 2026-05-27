import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import type { DownloadRequest } from '@/types';

/**
 * POST /api/download
 *
 * Downloads a video using yt-dlp, streams progress via SSE,
 * then sends the actual file data as a final binary chunk
 * that the frontend can save via a Blob download.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: DownloadRequest;

  try {
    body = await request.json();
  } catch {
    return new Response(
      formatSSE({ type: 'error', code: 'INVALID_REQUEST', message: 'Invalid request body' }),
      { status: 400, headers: sseHeaders() }
    );
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const formatId = typeof body.formatId === 'string' ? body.formatId.trim() : '';

  if (!url || !formatId) {
    return new Response(
      formatSSE({ type: 'error', code: 'INVALID_REQUEST', message: 'Both url and formatId are required' }),
      { status: 400, headers: sseHeaders() }
    );
  }

  const filename = generateFilename(url, formatId);
  const tempPath = join(tmpdir(), `vdl-${randomUUID()}.mp4`);

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Run yt-dlp in background, stream progress via SSE, then send file
  (async () => {
    try {
      // Download to temp file using yt-dlp
      await downloadWithYtDlp(url, formatId, tempPath, async (percentage) => {
        const event = formatSSE({ type: 'progress', percentage });
        await writer.write(encoder.encode(event)).catch(() => {});
      });

      // Read the downloaded file
      if (!existsSync(tempPath)) {
        throw new Error('Download completed but file not found');
      }

      const fileBuffer = await readFile(tempPath);

      // Send complete event with file size and filename
      const completeEvent = formatSSE({
        type: 'complete',
        filename,
        size: fileBuffer.byteLength,
      });
      await writer.write(encoder.encode(completeEvent));

      // Send the actual file data as a special "file" event with base64 encoding
      const base64Data = fileBuffer.toString('base64');
      const fileEvent = formatSSE({
        type: 'file',
        data: base64Data,
        filename,
        mimeType: 'video/mp4',
      });
      await writer.write(encoder.encode(fileEvent));

      await writer.close();

      // Cleanup temp file
      await unlink(tempPath).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      const errorEvent = formatSSE({ type: 'error', code: 'DOWNLOAD_FAILED', message });
      try {
        await writer.write(encoder.encode(errorEvent));
        await writer.close();
      } catch {
        try { await writer.abort(); } catch {}
      }
      // Cleanup temp file on error
      await unlink(tempPath).catch(() => {});
    }
  })();

  return new Response(readable, { status: 200, headers: sseHeaders() });
}

/**
 * Downloads video to a file using yt-dlp, reporting progress via callback.
 */
function downloadWithYtDlp(
  url: string,
  formatId: string,
  outputPath: string,
  onProgress: (pct: number) => Promise<void>
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Format selector strategy (prefer pre-merged streams first, no ffmpeg needed):
    // - Numeric YouTube format IDs (e.g. "137"=1080p video-only) → merge that exact
    //   video stream with bestaudio. Fall back to best combined if merge fails.
    // - Anything else → 'b' (best combined w/ audio) first, then bestvideo+bestaudio.
    //   This guarantees Instagram, TikTok, Vimeo etc. always get audio because
    //   their direct URLs are pre-muxed.
    const isYouTubeNumericFormat = /^\d+$/.test(formatId);
    const formatSelector = isYouTubeNumericFormat
      ? `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/b`
      : 'b/bestvideo*+bestaudio/best';

    const args = [
      '-f', formatSelector,
      '-o', outputPath,
      '--newline',
      '--no-part',
      '--merge-output-format', 'mp4',
      url,
    ];

    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let lastProgress = 0;
    let stderrBuffer = '';
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const resetTimeout = () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error('Download timed out — no progress for 30 seconds'));
      }, 30_000);
    };

    resetTimeout();

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
      const lines = stderrBuffer.split('\n');
      stderrBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (match) {
          const pct = Math.min(100, Math.max(0, Math.floor(parseFloat(match[1]))));
          if (pct >= lastProgress) {
            lastProgress = pct;
            onProgress(pct);
            resetTimeout();
          }
        }
      }
    });

    proc.stdout?.on('data', () => {
      resetTimeout();
    });

    proc.on('error', (err) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      reject(new Error(`Failed to run yt-dlp: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (code === 0) {
        onProgress(100).then(resolve).catch(resolve);
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}

function formatSSE(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
}

function generateFilename(url: string, formatId: string): string {
  try {
    const parsed = new URL(url);
    const videoId = parsed.searchParams.get('v');
    if (videoId) return `${videoId}.mp4`;
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1]?.replace(/[^a-zA-Z0-9_-]/g, '') || 'video';
    return `${lastPart}.mp4`;
  } catch {
    return `video_${formatId}.mp4`;
  }
}
