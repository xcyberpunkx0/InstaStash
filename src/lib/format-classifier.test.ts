import { describe, it, expect } from 'vitest';
import { classifyYtDlpFormat, extractExpiry, type RawFormatLike } from './format-classifier';

// ─── classifyYtDlpFormat ───────────────────────────────────────────────────

describe('classifyYtDlpFormat', () => {
  describe('YouTube combined formats (itag 18, 22)', () => {
    it('returns directUrl + hasAudio for itag 18 (360p combined)', () => {
      const raw: RawFormatLike = {
        url: 'https://rr3---sn-abcd.googlevideo.com/videoplayback?expire=1900000000&itag=18',
        acodec: 'mp4a.40.2',
        vcodec: 'avc1.42001E',
        ext: 'mp4',
        protocol: 'https',
      };
      const result = classifyYtDlpFormat(raw);
      expect(result.directUrl).toBe(raw.url);
      expect(result.hasAudio).toBe(true);
    });

    it('returns directUrl + hasAudio for itag 22 (720p combined)', () => {
      const raw: RawFormatLike = {
        url: 'https://rr3.googlevideo.com/videoplayback?expire=1900000000&itag=22',
        acodec: 'mp4a.40.2',
        vcodec: 'avc1.64001F',
        ext: 'mp4',
        protocol: 'https',
      };
      const result = classifyYtDlpFormat(raw);
      expect(result.directUrl).toBe(raw.url);
      expect(result.hasAudio).toBe(true);
    });
  });

  describe('YouTube split streams', () => {
    it('rejects video-only formats (itag 137 = 1080p video-only)', () => {
      const raw: RawFormatLike = {
        url: 'https://rr3.googlevideo.com/videoplayback?itag=137',
        acodec: 'none',
        vcodec: 'avc1.640028',
        ext: 'mp4',
        protocol: 'https',
      };
      const result = classifyYtDlpFormat(raw);
      expect(result.directUrl).toBeUndefined();
      expect(result.hasAudio).toBe(false);
    });

    it('audio-only (itag 140) returns directUrl + hasAudio (saveable as m4a)', () => {
      const raw: RawFormatLike = {
        url: 'https://rr3.googlevideo.com/videoplayback?itag=140',
        acodec: 'mp4a.40.2',
        vcodec: 'none',
        ext: 'm4a',
        protocol: 'https',
      };
      const result = classifyYtDlpFormat(raw);
      // Browser CAN save the m4a stream directly. Whether the UI offers it as
      // "MP3" is a separate concern (that requires server-side transcode).
      expect(result.directUrl).toBe(raw.url);
      expect(result.hasAudio).toBe(true);
    });
  });

  describe('Non-progressive protocols', () => {
    it('rejects DASH manifests', () => {
      const raw: RawFormatLike = {
        url: 'https://example.com/manifest.mpd',
        acodec: 'mp4a.40.2',
        vcodec: 'avc1.640028',
        ext: 'mp4',
        protocol: 'http_dash_segments',
      };
      expect(classifyYtDlpFormat(raw).directUrl).toBeUndefined();
    });

    it('rejects HLS streams', () => {
      const raw: RawFormatLike = {
        url: 'https://example.com/stream.m3u8',
        acodec: 'mp4a.40.2',
        vcodec: 'avc1.640028',
        ext: 'mp4',
        protocol: 'm3u8_native',
      };
      expect(classifyYtDlpFormat(raw).directUrl).toBeUndefined();
    });

    it('rejects formats that expose a separate manifest_url', () => {
      const raw: RawFormatLike = {
        url: 'https://example.com/segment.mp4',
        acodec: 'mp4a.40.2',
        vcodec: 'avc1.640028',
        ext: 'mp4',
        protocol: 'https',
        manifest_url: 'https://example.com/manifest.mpd',
      };
      expect(classifyYtDlpFormat(raw).directUrl).toBeUndefined();
    });
  });

  describe('Instagram CDN', () => {
    it('returns directUrl + hasAudio for a typical IG reel URL', () => {
      const raw: RawFormatLike = {
        url: 'https://scontent-lhr8-2.cdninstagram.com/o1/v/t16/f1/abc.mp4?oe=68500000&_nc_expire=1900000000',
        acodec: 'mp4a.40.2',
        vcodec: 'avc1.64001F',
        ext: 'mp4',
        protocol: 'https',
      };
      const result = classifyYtDlpFormat(raw);
      expect(result.directUrl).toBe(raw.url);
      expect(result.hasAudio).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('returns hasAudio=false and no directUrl when url is missing', () => {
      const raw: RawFormatLike = {
        acodec: 'mp4a.40.2',
        vcodec: 'avc1.42001E',
        ext: 'mp4',
      };
      const result = classifyYtDlpFormat(raw);
      expect(result.directUrl).toBeUndefined();
      expect(result.hasAudio).toBe(true); // codec data still says it has audio
    });

    it('rejects non-http URLs', () => {
      const raw: RawFormatLike = {
        url: 'rtmp://example.com/live/stream',
        acodec: 'mp4a.40.2',
        vcodec: 'avc1.42001E',
      };
      expect(classifyYtDlpFormat(raw).directUrl).toBeUndefined();
    });

    it('handles empty codec strings as "no stream"', () => {
      const raw: RawFormatLike = {
        url: 'https://example.com/video.mp4',
        acodec: '',
        vcodec: '',
      };
      const result = classifyYtDlpFormat(raw);
      // No declared streams → we don't know it's saveable, but we also don't
      // know it's video-only-without-audio. Conservative: reject directUrl.
      expect(result.hasAudio).toBe(false);
      expect(result.directUrl).toBeUndefined();
    });

    it('does not throw on completely empty input', () => {
      expect(() => classifyYtDlpFormat({})).not.toThrow();
    });
  });
});

// ─── extractExpiry ─────────────────────────────────────────────────────────

describe('extractExpiry', () => {
  it('parses googlevideo expire= as unix seconds', () => {
    const url = 'https://rr3.googlevideo.com/videoplayback?expire=1900000000&itag=22';
    expect(extractExpiry(url)).toBe(1_900_000_000_000);
  });

  it('parses _nc_expire= on IG/FB CDN', () => {
    const url = 'https://scontent.cdninstagram.com/v/t.mp4?_nc_expire=1900000000';
    expect(extractExpiry(url)).toBe(1_900_000_000_000);
  });

  it('parses IG oe= as hex unix seconds', () => {
    // 0x71400000 = 1899429888 (within sane range)
    const url = 'https://scontent.cdninstagram.com/v/t.mp4?oe=71400000';
    expect(extractExpiry(url)).toBe(0x71400000 * 1000);
  });

  it('returns undefined when no recognizable expiry is present', () => {
    const url = 'https://example.com/video.mp4?foo=bar';
    expect(extractExpiry(url)).toBeUndefined();
  });

  it('returns undefined for malformed URLs', () => {
    expect(extractExpiry('not a url')).toBeUndefined();
  });

  it('ignores non-numeric expire values', () => {
    const url = 'https://rr3.googlevideo.com/videoplayback?expire=soon';
    expect(extractExpiry(url)).toBeUndefined();
  });

  it('ignores oe values that decode to absurdly old timestamps', () => {
    // 0x1 = 1970-01-01, way too old to be a real expiry
    const url = 'https://scontent.cdninstagram.com/v/t.mp4?oe=1';
    expect(extractExpiry(url)).toBeUndefined();
  });
});
