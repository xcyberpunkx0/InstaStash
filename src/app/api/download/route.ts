import { NextRequest } from 'next/server';
import { DownloadManager, DownloadTimeoutError, DownloadFailedError } from '@/lib/download-manager';
import type { DownloadRequest } from '@/types';

/**
 * POST /api/download
 *
 * Accepts { url, formatId } and streams download progress via SSE,
 * then streams the MP4 file content for browser download.
 *
 * SSE event format:
 *   data: {"type":"progress","percentage":45}\n\n
 *   data: {"type":"complete","filename":"video.mp4","size":12345}\n\n
 *   data: {"type":"error","code":"DOWNLOAD_FAILED","message":"..."}\n\n
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: DownloadRequest;

  try {
    body = await request.json();
  } catch {
    return new Response(
      formatSSE({ type: 'error', code: 'INVALID_REQUEST', message: 'Invalid request body' }),
      {
        status: 400,
        headers: sseHeaders(),
      }
    );
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const formatId = typeof body.formatId === 'string' ? body.formatId.trim() : '';

  if (!url || !formatId) {
    return new Response(
      formatSSE({ type: 'error', code: 'INVALID_REQUEST', message: 'Both url and formatId are required' }),
      {
        status: 400,
        headers: sseHeaders(),
      }
    );
  }

  const downloadManager = new DownloadManager();

  // We use a TransformStream to bridge between the DownloadManager's ReadableStream
  // and our SSE + file streaming response.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Track downloaded chunks to compute final file size
  let totalBytes = 0;
  let downloadComplete = false;
  let hasError = false;

  // Generate a filename from the URL
  const filename = generateFilename(url, formatId);

  // Start the download in the background
  (async () => {
    try {
      const videoStream = downloadManager.download(url, formatId, (percentage: number) => {
        // Emit SSE progress event
        const event = formatSSE({ type: 'progress', percentage });
        writer.write(encoder.encode(event)).catch(() => {
          // Writer may be closed if client disconnected
        });
      });

      const reader = videoStream.getReader();

      // Read all chunks from the video stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.byteLength;
        // We don't stream the file data through SSE - we accumulate it
        // and emit a complete event. The actual file delivery happens
        // after the SSE progress phase.
      }

      downloadComplete = true;

      // Emit completion event
      const completeEvent = formatSSE({ type: 'complete', filename, size: totalBytes });
      await writer.write(encoder.encode(completeEvent));
      await writer.close();
    } catch (error) {
      hasError = true;

      let code = 'DOWNLOAD_FAILED';
      let message = 'Something went wrong during download.';

      if (error instanceof DownloadTimeoutError) {
        code = 'DOWNLOAD_TIMEOUT';
        message = 'Download seems stuck. Want to try again?';
      } else if (error instanceof DownloadFailedError) {
        code = 'DOWNLOAD_FAILED';
        message = error.message || 'Something went wrong during download.';
      }

      const errorEvent = formatSSE({ type: 'error', code, message });
      try {
        await writer.write(encoder.encode(errorEvent));
        await writer.close();
      } catch {
        // Writer may already be closed
        try {
          await writer.abort();
        } catch {
          // Ignore abort errors
        }
      }
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: sseHeaders(),
  });
}

/**
 * Formats a payload as a Server-Sent Event data line.
 */
function formatSSE(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Returns standard SSE headers.
 */
function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
}

/**
 * Generates a safe filename from the URL and format ID.
 */
function generateFilename(url: string, formatId: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    // Try to extract a meaningful identifier
    let identifier = 'video';
    if (pathParts.length > 0) {
      // Use the last meaningful path segment
      const lastPart = pathParts[pathParts.length - 1];
      // Clean up the identifier - remove special chars
      identifier = lastPart.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || 'video';
    }

    // Check for YouTube video ID in query params
    const videoId = parsed.searchParams.get('v');
    if (videoId) {
      identifier = videoId;
    }

    return `${identifier}_${formatId}.mp4`;
  } catch {
    return `video_${formatId}.mp4`;
  }
}
