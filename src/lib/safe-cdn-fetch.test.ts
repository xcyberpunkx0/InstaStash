import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAllowedCdnUrl, fetchFromCdn, CdnUrlError } from './safe-cdn-fetch';

describe('isAllowedCdnUrl', () => {
  it('allows https URLs on Instagram/Facebook CDN hosts', () => {
    expect(isAllowedCdnUrl('https://scontent.cdninstagram.com/v/video.mp4')).toBe(true);
    expect(isAllowedCdnUrl('https://instagram.frdp5-1.fna.fbcdn.net/o1/v.mp4')).toBe(true);
    expect(isAllowedCdnUrl('https://i.instagram.com/img.jpg')).toBe(true);
  });

  it('rejects non-https schemes', () => {
    expect(isAllowedCdnUrl('http://scontent.cdninstagram.com/v.mp4')).toBe(false);
    expect(isAllowedCdnUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedCdnUrl('ftp://x.fbcdn.net/v.mp4')).toBe(false);
  });

  it('rejects internal and arbitrary hosts', () => {
    expect(isAllowedCdnUrl('https://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isAllowedCdnUrl('https://localhost:3000/api/secret')).toBe(false);
    expect(isAllowedCdnUrl('https://example.com/video.mp4')).toBe(false);
  });

  it('rejects suffix-spoofing hosts', () => {
    expect(isAllowedCdnUrl('https://evilfbcdn.net/v.mp4')).toBe(false);
    expect(isAllowedCdnUrl('https://fbcdn.net.evil.com/v.mp4')).toBe(false);
  });

  it('rejects unparseable URLs', () => {
    expect(isAllowedCdnUrl('not a url')).toBe(false);
    expect(isAllowedCdnUrl('')).toBe(false);
  });
});

describe('fetchFromCdn', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function redirectTo(location: string): Response {
    return new Response(null, { status: 302, headers: { Location: location } });
  }

  it('throws CdnUrlError without fetching when the initial URL is off-allowlist', async () => {
    await expect(
      fetchFromCdn('https://169.254.169.254/latest/meta-data/', {}),
    ).rejects.toBeInstanceOf(CdnUrlError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches with manual redirect handling', async () => {
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));

    const res = await fetchFromCdn('https://scontent.cdninstagram.com/v.mp4', {});

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://scontent.cdninstagram.com/v.mp4',
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('follows redirects between allowed hosts', async () => {
    mockFetch
      .mockResolvedValueOnce(redirectTo('https://scontent.cdninstagram.com/v.mp4'))
      .mockResolvedValueOnce(new Response('video', { status: 200 }));

    const res = await fetchFromCdn('https://instagram.frdp5-1.fna.fbcdn.net/v.mp4', {});

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://scontent.cdninstagram.com/v.mp4',
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('blocks redirects to off-allowlist hosts', async () => {
    mockFetch.mockResolvedValueOnce(redirectTo('https://169.254.169.254/latest/meta-data/'));

    await expect(
      fetchFromCdn('https://scontent.cdninstagram.com/v.mp4', {}),
    ).rejects.toBeInstanceOf(CdnUrlError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('blocks redirects that downgrade to http', async () => {
    mockFetch.mockResolvedValueOnce(redirectTo('http://scontent.cdninstagram.com/v.mp4'));

    await expect(
      fetchFromCdn('https://scontent.cdninstagram.com/v.mp4', {}),
    ).rejects.toBeInstanceOf(CdnUrlError);
  });

  it('gives up after too many redirects', async () => {
    mockFetch.mockResolvedValue(redirectTo('https://scontent.cdninstagram.com/loop.mp4'));

    await expect(
      fetchFromCdn('https://scontent.cdninstagram.com/v.mp4', {}),
    ).rejects.toThrow(/too many redirects/i);
  });
});
