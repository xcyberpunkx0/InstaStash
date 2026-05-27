import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the download-manager module
vi.mock('@/lib/download-manager', () => {
  const DownloadTimeoutError = class extends Error {
    constructor(message = 'Download timed out') {
      super(message);
      this.name = 'DownloadTimeoutError';
    }
  };

  const DownloadFailedError = class extends Error {
    constructor(message = 'Download failed') {
      super(message);
      this.name = 'DownloadFailedError';
    }
  };

  return {
    DownloadTimeoutError,
    DownloadFailedError,
    DownloadManager: vi.fn(),
  };
});

import { DownloadManager, DownloadTimeoutError, DownloadFailedError } from '@/lib/download-manager';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createInvalidRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json',
  });
}

async function readSSEEvents(response: Response): Promise<Array<Record<string, unknown>>> {
  const text = await response.text();
  const events: Array<Record<string, unknown>> = [];

  const lines = text.split('\n\n').filter(Boolean);
  for (const line of lines) {
    const dataMatch = line.match(/^data: (.+)$/);
    if (dataMatch) {
      events.push(JSON.parse(dataMatch[1]));
    }
  }

  return events;
}

describe('POST /api/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error event for invalid JSON body', async () => {
    const request = createInvalidRequest();
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');

    const events = await readSSEEvents(response);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'error',
      code: 'INVALID_REQUEST',
      message: 'Invalid request body',
    });
  });

  it('returns error event when url is missing', async () => {
    const request = createRequest({ url: '', formatId: 'best' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const events = await readSSEEvents(response);
    expect(events[0]).toEqual({
      type: 'error',
      code: 'INVALID_REQUEST',
      message: 'Both url and formatId are required',
    });
  });

  it('returns error event when formatId is missing', async () => {
    const request = createRequest({ url: 'https://youtube.com/watch?v=abc', formatId: '' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const events = await readSSEEvents(response);
    expect(events[0]).toEqual({
      type: 'error',
      code: 'INVALID_REQUEST',
      message: 'Both url and formatId are required',
    });
  });

  it('sets correct SSE headers', async () => {
    // Mock a successful download
    const mockDownload = vi.fn().mockReturnValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      })
    );
    (DownloadManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      download: mockDownload,
    }));

    const request = createRequest({ url: 'https://youtube.com/watch?v=abc123', formatId: '22' });
    const response = await POST(request);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');
  });

  it('streams progress events and emits complete event on success', async () => {
    let progressCallback: ((pct: number) => void) | null = null;

    const mockDownload = vi.fn().mockImplementation((_url, _fmt, onProgress) => {
      progressCallback = onProgress;
      return new ReadableStream({
        start(controller) {
          // Simulate progress
          onProgress(25);
          onProgress(50);
          onProgress(75);
          onProgress(100);
          // Emit some data
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
          controller.close();
        },
      });
    });

    (DownloadManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      download: mockDownload,
    }));

    const request = createRequest({ url: 'https://youtube.com/watch?v=test123', formatId: '22' });
    const response = await POST(request);

    expect(response.status).toBe(200);

    const events = await readSSEEvents(response);

    // Should have progress events and a complete event
    const progressEvents = events.filter((e) => e.type === 'progress');
    const completeEvents = events.filter((e) => e.type === 'complete');

    expect(progressEvents.length).toBeGreaterThan(0);
    expect(completeEvents).toHaveLength(1);

    // Verify complete event structure
    expect(completeEvents[0]).toMatchObject({
      type: 'complete',
      filename: expect.stringContaining('.mp4'),
      size: expect.any(Number),
    });
  });

  it('emits error event on download timeout', async () => {
    const mockDownload = vi.fn().mockImplementation(() => {
      return new ReadableStream({
        start(controller) {
          controller.error(new DownloadTimeoutError('Download timed out'));
        },
      });
    });

    (DownloadManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      download: mockDownload,
    }));

    const request = createRequest({ url: 'https://youtube.com/watch?v=timeout', formatId: '22' });
    const response = await POST(request);

    const events = await readSSEEvents(response);
    const errorEvents = events.filter((e) => e.type === 'error');

    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0]).toEqual({
      type: 'error',
      code: 'DOWNLOAD_TIMEOUT',
      message: 'Download seems stuck. Want to try again?',
    });
  });

  it('emits error event on download failure', async () => {
    const mockDownload = vi.fn().mockImplementation(() => {
      return new ReadableStream({
        start(controller) {
          controller.error(new DownloadFailedError('yt-dlp exited with code 1'));
        },
      });
    });

    (DownloadManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      download: mockDownload,
    }));

    const request = createRequest({ url: 'https://youtube.com/watch?v=fail', formatId: '22' });
    const response = await POST(request);

    const events = await readSSEEvents(response);
    const errorEvents = events.filter((e) => e.type === 'error');

    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0]).toEqual({
      type: 'error',
      code: 'DOWNLOAD_FAILED',
      message: 'yt-dlp exited with code 1',
    });
  });

  it('generates filename from YouTube URL with video ID', async () => {
    const mockDownload = vi.fn().mockImplementation((_url, _fmt, onProgress) => {
      return new ReadableStream({
        start(controller) {
          onProgress(100);
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });
    });

    (DownloadManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      download: mockDownload,
    }));

    const request = createRequest({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', formatId: '22' });
    const response = await POST(request);

    const events = await readSSEEvents(response);
    const completeEvent = events.find((e) => e.type === 'complete');

    expect(completeEvent).toBeDefined();
    expect(completeEvent!.filename).toBe('dQw4w9WgXcQ_22.mp4');
  });

  it('generates filename from Instagram URL path', async () => {
    const mockDownload = vi.fn().mockImplementation((_url, _fmt, onProgress) => {
      return new ReadableStream({
        start(controller) {
          onProgress(100);
          controller.enqueue(new Uint8Array([10, 20]));
          controller.close();
        },
      });
    });

    (DownloadManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      download: mockDownload,
    }));

    const request = createRequest({ url: 'https://www.instagram.com/reel/ABC123xyz/', formatId: 'best' });
    const response = await POST(request);

    const events = await readSSEEvents(response);
    const completeEvent = events.find((e) => e.type === 'complete');

    expect(completeEvent).toBeDefined();
    expect(completeEvent!.filename).toBe('ABC123xyz_best.mp4');
  });

  it('passes url and formatId to DownloadManager', async () => {
    const mockDownload = vi.fn().mockImplementation((_url, _fmt, onProgress) => {
      return new ReadableStream({
        start(controller) {
          onProgress(100);
          controller.enqueue(new Uint8Array([1]));
          controller.close();
        },
      });
    });

    (DownloadManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      download: mockDownload,
    }));

    const request = createRequest({ url: 'https://youtube.com/watch?v=test', formatId: '137' });
    await POST(request);

    // Wait for the async download to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockDownload).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=test',
      '137',
      expect.any(Function)
    );
  });
});
