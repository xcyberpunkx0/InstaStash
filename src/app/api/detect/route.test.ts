import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/detect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns detected platform for a valid Instagram post URL', async () => {
    const req = createRequest({ url: 'https://www.instagram.com/p/ABC123/' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.platform).toBe('instagram');
    expect(data.contentType).toBe('post');
    expect(data.videoId).toBe('ABC123');
    expect(data.normalizedUrl).toBeDefined();
  });

  it('returns detected platform for an Instagram reel URL', async () => {
    const req = createRequest({ url: 'https://www.instagram.com/reel/XYZ789/' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.platform).toBe('instagram');
    expect(data.contentType).toBe('reel');
    expect(data.videoId).toBe('XYZ789');
  });

  it('trims whitespace from the URL before detection', async () => {
    const req = createRequest({ url: '  https://www.instagram.com/p/ABC123/  ' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.platform).toBe('instagram');
    expect(data.videoId).toBe('ABC123');
  });

  it('returns EMPTY_URL error for empty string', async () => {
    const req = createRequest({ url: '' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('EMPTY_URL');
    expect(data.supportedPlatforms).toContain('Instagram');
  });

  it('returns EMPTY_URL error for whitespace-only string', async () => {
    const req = createRequest({ url: '   \t\n  ' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('EMPTY_URL');
  });

  it('returns EMPTY_URL error for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('EMPTY_URL');
  });

  it('returns UNSUPPORTED_PLATFORM error for unknown domain', async () => {
    const req = createRequest({ url: 'https://www.tiktok.com/@user/video/123' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('UNSUPPORTED_PLATFORM');
    expect(data.supportedPlatforms).toContain('Instagram');
  });

  it('returns INVALID_FORMAT error for supported domain with invalid path', async () => {
    const req = createRequest({ url: 'https://www.instagram.com/explore/' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('INVALID_FORMAT');
    expect(data.exampleFormats).toBeDefined();
    expect(data.exampleFormats!.length).toBeGreaterThan(0);
  });

  it('returns EMPTY_URL error when url field is not a string', async () => {
    const req = createRequest({ url: 123 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('EMPTY_URL');
  });

  it('strips tracking parameters from URLs', async () => {
    const req = createRequest({ url: 'https://www.instagram.com/p/ABC123xyz/?utm_source=twitter&si=abc123' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.platform).toBe('instagram');
    expect(data.videoId).toBe('ABC123xyz');
  });

  it('returns TIMEOUT error with status 400 when detection exceeds 1 second', async () => {
    // Mock platformDetector.detect to simulate a slow operation
    const { platformDetector } = await import('@/lib/platform-detector');
    const originalDetect = platformDetector.detect.bind(platformDetector);
    platformDetector.detect = () => {
      // This will never resolve before the timeout
      return new Promise(() => {}) as unknown as ReturnType<typeof originalDetect>;
    };

    const req = createRequest({ url: 'https://www.instagram.com/p/ABC123/' });
    const resPromise = POST(req);

    // Advance timers past the 1-second timeout
    await vi.advanceTimersByTimeAsync(1100);

    const res = await resPromise;
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe('TIMEOUT');
    expect(data.error).toBe('That took too long! Try pasting the URL again.');
    expect(data.supportedPlatforms).toContain('Instagram');

    // Restore original
    platformDetector.detect = originalDetect;
  });
});
