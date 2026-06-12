import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockExistsSync } = vi.hoisted(() => ({ mockExistsSync: vi.fn() }));

vi.mock('fs', () => {
  const m = { existsSync: mockExistsSync };
  return { ...m, default: m };
});

import { getCookieArgs, getCookieOptions, resetCookieWarning } from './ytdlp-cookies';

describe('ytdlp-cookies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCookieWarning();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns no args when nothing is configured', () => {
    vi.stubEnv('INSTAGRAM_COOKIES_FILE', '');
    vi.stubEnv('INSTAGRAM_COOKIES_FROM_BROWSER', '');

    expect(getCookieArgs()).toEqual([]);
    expect(getCookieOptions()).toEqual({});
  });

  it('uses the cookies file when it exists', () => {
    vi.stubEnv('INSTAGRAM_COOKIES_FILE', '/etc/secrets/ig-cookies.txt');
    mockExistsSync.mockReturnValue(true);

    expect(getCookieArgs()).toEqual(['--cookies', '/etc/secrets/ig-cookies.txt']);
    expect(getCookieOptions()).toEqual({ cookies: '/etc/secrets/ig-cookies.txt' });
  });

  it('skips a configured cookies file that does not exist, with a warning', () => {
    vi.stubEnv('INSTAGRAM_COOKIES_FILE', '/nope/cookies.txt');
    vi.stubEnv('INSTAGRAM_COOKIES_FROM_BROWSER', '');
    mockExistsSync.mockReturnValue(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getCookieArgs()).toEqual([]);
    expect(getCookieArgs()).toEqual([]); // second call
    expect(warn).toHaveBeenCalledTimes(1); // warn-once latch

    warn.mockRestore();
  });

  it('falls back to browser cookies when no file is set', () => {
    vi.stubEnv('INSTAGRAM_COOKIES_FILE', '');
    vi.stubEnv('INSTAGRAM_COOKIES_FROM_BROWSER', 'chrome');

    expect(getCookieArgs()).toEqual(['--cookies-from-browser', 'chrome']);
    expect(getCookieOptions()).toEqual({ cookiesFromBrowser: 'chrome' });
  });

  it('prefers the cookies file over browser cookies when both are set', () => {
    vi.stubEnv('INSTAGRAM_COOKIES_FILE', '/etc/secrets/ig-cookies.txt');
    vi.stubEnv('INSTAGRAM_COOKIES_FROM_BROWSER', 'chrome');
    mockExistsSync.mockReturnValue(true);

    expect(getCookieArgs()).toEqual(['--cookies', '/etc/secrets/ig-cookies.txt']);
  });

  it('falls back to browser cookies when the configured file is missing', () => {
    vi.stubEnv('INSTAGRAM_COOKIES_FILE', '/nope/cookies.txt');
    vi.stubEnv('INSTAGRAM_COOKIES_FROM_BROWSER', 'edge');
    mockExistsSync.mockReturnValue(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getCookieArgs()).toEqual(['--cookies-from-browser', 'edge']);

    warn.mockRestore();
  });
});
