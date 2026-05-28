// ─── Format Classifier ─────────────────────────────────────────────────────
//
// Decides whether a yt-dlp format can be saved directly from the platform CDN
// (the "fast path" — browser fetches `directUrl` itself, no server proxy) or
// must go through our yt-dlp + ffmpeg proxy.
//
// Rules of thumb:
//   * `directUrl` is a progressive single-file HTTP URL (no DASH manifest).
//   * `hasAudio` means the stream is muxed video+audio OR pure audio. The
//     browser can play/save it as-is without our merge step.
//   * `expiresAt` is best-effort. We extract `expire=` (YouTube/googlevideo) or
//     `oe=` (Instagram cdninstagram) when present.
//
// Anything we're unsure about → leave the field undefined and let the caller
// fall back to the proxy path. This module never throws.

export interface RawFormatLike {
  /** yt-dlp's resolved direct URL for this format, when available. */
  url?: string;
  /** Audio codec ('none' for video-only). */
  acodec?: string;
  /** Video codec ('none' for audio-only). */
  vcodec?: string;
  /** Container ext: 'mp4', 'm4a', 'webm', etc. */
  ext?: string;
  /** Some extractors expose the manifest URL separately; we treat it as a no-go. */
  manifest_url?: string;
  /** yt-dlp marks 'http_dash_segments' / 'm3u8_native' etc. for non-progressive. */
  protocol?: string;
}

export interface ClassifiedFormat {
  /** Direct URL the browser can fetch. Undefined when no fast path is possible. */
  directUrl?: string;
  /** Whether this stream is playable/saveable as-is (muxed AV or audio-only). */
  hasAudio: boolean;
  /** Epoch ms when `directUrl` is expected to expire, if extractable. */
  expiresAt?: number;
}

/**
 * Classify a single yt-dlp format. Pure function, safe to call on partial data.
 */
export function classifyYtDlpFormat(raw: RawFormatLike): ClassifiedFormat {
  const acodec = (raw.acodec ?? '').toLowerCase();
  const vcodec = (raw.vcodec ?? '').toLowerCase();

  const hasAudioStream = acodec !== '' && acodec !== 'none';
  const hasVideoStream = vcodec !== '' && vcodec !== 'none';
  // "hasAudio" in our terminology = "browser can save without merging".
  // True for muxed video+audio AND for pure audio formats.
  const hasAudio = hasAudioStream;

  const directUrl = pickDirectUrl(raw, hasVideoStream, hasAudioStream);
  const expiresAt = directUrl ? extractExpiry(directUrl) : undefined;

  return { directUrl, hasAudio, expiresAt };
}

// ─── Internals ─────────────────────────────────────────────────────────────

/**
 * A URL is "directly fetchable" only when:
 *   1. yt-dlp gave us a concrete URL (not a manifest).
 *   2. The protocol is plain HTTP(S), not DASH/HLS segmented.
 *   3. We can affirmatively confirm the stream contains audio (muxed AV or
 *      audio-only). We refuse if codec data is missing or says video-only,
 *      because the browser can't merge with a separate audio stream.
 */
function pickDirectUrl(
  raw: RawFormatLike,
  hasVideoStream: boolean,
  hasAudioStream: boolean,
): string | undefined {
  const url = raw.url;
  if (!url || typeof url !== 'string') return undefined;
  if (!/^https?:\/\//i.test(url)) return undefined;

  // Non-progressive protocols can't be saved with a single GET.
  const proto = (raw.protocol ?? '').toLowerCase();
  if (
    proto.includes('dash') ||
    proto.includes('m3u8') ||
    proto.includes('hls') ||
    proto.includes('rtmp') ||
    proto.includes('rtsp') ||
    proto === 'mhtml'
  ) {
    return undefined;
  }
  // Manifest URLs are a tell that this is segmented, even if `protocol` lies.
  if (raw.manifest_url) return undefined;

  // Require an affirmative audio stream. Video-only or unknown → reject.
  if (!hasAudioStream) return undefined;
  // (When hasAudioStream is true, this is either muxed AV or pure audio —
  // both are saveable by the browser. hasVideoStream is intentionally not
  // gated here.)
  void hasVideoStream;

  return url;
}

/**
 * Best-effort expiry extraction from common CDN signatures.
 *   * googlevideo.com → `expire=<unix-seconds>`
 *   * cdninstagram.com → `oe=<hex-unix-seconds>`
 *   * Some IG/FB URLs use `_nc_expire=<unix-seconds>`
 * Returns epoch ms, or undefined if nothing recognizable is in the URL.
 */
export function extractExpiry(url: string): number | undefined {
  try {
    const u = new URL(url);

    // YouTube / googlevideo
    const expire = u.searchParams.get('expire');
    if (expire && /^\d+$/.test(expire)) {
      const ms = parseInt(expire, 10) * 1000;
      if (Number.isFinite(ms) && ms > 0) return ms;
    }

    // Some IG / FB CDN URLs
    const ncExpire = u.searchParams.get('_nc_expire');
    if (ncExpire && /^\d+$/.test(ncExpire)) {
      const ms = parseInt(ncExpire, 10) * 1000;
      if (Number.isFinite(ms) && ms > 0) return ms;
    }

    // Instagram CDN: `oe` is a hex unix timestamp in seconds.
    const oe = u.searchParams.get('oe');
    if (oe && /^[0-9a-fA-F]+$/.test(oe)) {
      const ms = parseInt(oe, 16) * 1000;
      if (Number.isFinite(ms) && ms > Date.now() - 86_400_000 /* sane lower bound */) {
        return ms;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}
