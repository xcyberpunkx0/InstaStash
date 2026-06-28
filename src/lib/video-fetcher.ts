import youtubeDlExec from 'youtube-dl-exec';
import type { Platform, VideoFormat } from '@/types';
import type { FetchErrorCode } from '@/types/errors';
import { scrapeInstagramVideo } from './instagram-scraper';
import { classifyYtDlpFormat, extractExpiry } from './format-classifier';
import { getCookieOptions } from './ytdlp-cookies';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum allowed video duration in seconds (60 minutes) */
const MAX_DURATION_SECONDS = 3600;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Raw format object returned by yt-dlp */
interface YtDlpFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  width?: number;
  height?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  format_note?: string;
  // ─── Direct-CDN fields (used by format-classifier) ──────────────────
  url?: string;
  protocol?: string;
  manifest_url?: string;
}

/** Raw output from yt-dlp --dump-json */
interface YtDlpOutput {
  title: string;
  duration: number;
  thumbnail?: string;
  formats: YtDlpFormat[];
}

/** Metadata returned by the VideoFetcher */
export interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  formats: VideoFormat[];
  previewVideoUrl?: string;
}

/** Error thrown by VideoFetcher with a typed error code */
export class VideoFetchError extends Error {
  constructor(
    message: string,
    public readonly code: FetchErrorCode,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'VideoFetchError';
  }
}

// ─── Error Mapping ───────────────────────────────────────────────────────────

/** Map yt-dlp error messages/stderr to typed error codes */
function mapYtDlpError(errorMessage: string): { code: FetchErrorCode; message: string; retryAfter?: number } {
  const msg = errorMessage.toLowerCase();

  if (msg.includes('private') || msg.includes('login required') || msg.includes('sign in') || msg.includes('empty media response') || msg.includes('cookies')) {
    return { code: 'PRIVATE', message: 'This content requires login — we can only download public videos accessible without an account.' };
  }

  if (msg.includes('age') || msg.includes('age-restricted') || msg.includes('age_gate')) {
    return { code: 'AGE_RESTRICTED', message: 'This video is age-restricted and can\'t be downloaded.' };
  }

  if (msg.includes('geo') || msg.includes('not available in your country') || msg.includes('blocked')) {
    return { code: 'GEO_BLOCKED', message: 'This video isn\'t available in your region.' };
  }

  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
    const retryMatch = errorMessage.match(/retry.after[:\s]*(\d+)/i);
    const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : 60;
    return { code: 'RATE_LIMITED', message: 'Too many requests! Please wait before trying again.', retryAfter };
  }

  if (
    msg.includes('not available') ||
    msg.includes('removed') ||
    msg.includes('deleted') ||
    msg.includes('does not exist') ||
    msg.includes('video unavailable') ||
    msg.includes('this video is unavailable')
  ) {
    return { code: 'UNAVAILABLE', message: 'This content is no longer available on the platform.' };
  }

  if (
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('unable to download') ||
    msg.includes('urlopen error')
  ) {
    return { code: 'NETWORK_ERROR', message: 'Couldn\'t connect — check your internet and try again!' };
  }

  // Default to NETWORK_ERROR for unrecognized errors
  return { code: 'NETWORK_ERROR', message: 'An unexpected error occurred while fetching the video.' };
}

// ─── Format Helpers ──────────────────────────────────────────────────────────

/** Parse a resolution string like "1920x1080" or "1080p" into a height number */
function parseResolutionHeight(format: YtDlpFormat): number {
  if (format.height) return format.height;
  if (format.resolution) {
    const match = format.resolution.match(/(\d+)p/);
    if (match) return parseInt(match[1], 10);
    const dimMatch = format.resolution.match(/\d+x(\d+)/);
    if (dimMatch) return parseInt(dimMatch[1], 10);
  }
  return 0;
}

/** Build a human-readable resolution label */
function buildResolutionLabel(height: number): string {
  if (height >= 2160) return '2160p';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  if (height >= 240) return '240p';
  if (height >= 144) return '144p';
  return `${height}p`;
}

/** Build a quality label like "1080p HD (~45MB)" */
function buildQualityLabel(height: number, fileSize: number): string {
  const resolution = buildResolutionLabel(height);
  const hdSuffix = height >= 720 ? ' HD' : '';
  const sizeMB = (fileSize / (1024 * 1024)).toFixed(0);
  return `${resolution}${hdSuffix} (~${sizeMB}MB)`;
}


/** Map Instagram format to a single VideoFormat at original resolution */
function mapInstagramFormats(rawFormats: YtDlpFormat[]): VideoFormat[] {
  // Find the best quality format (highest resolution)
  let best: YtDlpFormat | null = null;
  let bestHeight = 0;

  for (const format of rawFormats) {
    const height = parseResolutionHeight(format);
    if (height > bestHeight) {
      bestHeight = height;
      best = format;
    }
  }

  // If no format with height found, pick the first available
  if (!best && rawFormats.length > 0) {
    best = rawFormats[0];
    bestHeight = parseResolutionHeight(best);
  }

  if (!best) return [];

  const fileSize = best.filesize ?? best.filesize_approx ?? 0;
  const classified = classifyYtDlpFormat(best);
  return [
    {
      formatId: best.format_id,
      resolution: bestHeight > 0 ? buildResolutionLabel(bestHeight) : 'original',
      fileSize,
      ext: best.ext || 'mp4',
      quality: bestHeight > 0 ? buildQualityLabel(bestHeight, fileSize) : 'Original',
      directUrl: classified.directUrl,
      hasAudio: classified.hasAudio,
      expiresAt: classified.expiresAt,
    },
  ];
}

/**
 * Map YouTube's many raw formats into one VideoFormat per standard resolution.
 *
 * YouTube serves high resolutions as video-only DASH streams, so we pick the
 * best representative format at each height (preferring mp4/H.264 for broad
 * compatibility). Audio is merged at download time via `<formatId>+bestaudio`,
 * so `hasAudio` is left false here — these are selection hints, not direct URLs.
 */
function mapYouTubeFormats(rawFormats: YtDlpFormat[]): VideoFormat[] {
  // Score a format for "preferred representative at its height".
  const score = (f: YtDlpFormat): number => {
    const vcodec = (f.vcodec ?? '').toLowerCase();
    const acodec = (f.acodec ?? '').toLowerCase();
    const ext = (f.ext ?? '').toLowerCase();
    let s = 0;
    if (ext === 'mp4') s += 3;
    if (vcodec.includes('avc') || vcodec.includes('h264')) s += 3;
    if (acodec && acodec !== 'none') s += 1; // muxed = convenient, no merge needed
    return s;
  };

  const byHeight = new Map<number, YtDlpFormat>();
  for (const format of rawFormats) {
    const vcodec = (format.vcodec ?? '').toLowerCase();
    if (!vcodec || vcodec === 'none') continue; // need a video stream
    const height = parseResolutionHeight(format);
    if (height <= 0) continue;
    const existing = byHeight.get(height);
    if (!existing || score(format) > score(existing)) byHeight.set(height, format);
  }

  const heights = [...byHeight.keys()].sort((a, b) => b - a);
  return heights.map((height) => {
    const best = byHeight.get(height)!;
    const fileSize = best.filesize ?? best.filesize_approx ?? 0;
    return {
      formatId: best.format_id,
      resolution: buildResolutionLabel(height),
      fileSize,
      ext: 'mp4',
      quality: fileSize > 0 ? buildQualityLabel(height, fileSize) : buildResolutionLabel(height),
      hasAudio: false,
    };
  });
}

/** Find a playable progressive URL from raw formats */
function findPreviewUrl(rawFormats: YtDlpFormat[]): string | undefined {
  // Look for format with format_id === '1' first (Instagram progressive format)
  const format1 = rawFormats.find(f => f.format_id === '1');
  if (format1 && format1.url) return format1.url;

  // Otherwise, look for any format that has both video and audio and is not DASH/manifest
  for (const format of rawFormats) {
    const acodec = (format.acodec ?? '').toLowerCase();
    const vcodec = (format.vcodec ?? '').toLowerCase();
    const hasAudio = acodec !== '' && acodec !== 'none';
    const hasVideo = vcodec !== '' && vcodec !== 'none';
    
    const proto = (format.protocol ?? '').toLowerCase();
    const isSegmented = proto.includes('dash') || proto.includes('m3u8') || proto.includes('hls') || format.manifest_url;

    if (hasAudio && hasVideo && !isSegmented && format.url) {
      return format.url;
    }
  }

  // Fallback to the first format with a URL that is not segmented
  for (const format of rawFormats) {
    const proto = (format.protocol ?? '').toLowerCase();
    const isSegmented = proto.includes('dash') || proto.includes('m3u8') || proto.includes('hls') || format.manifest_url;
    if (!isSegmented && format.url) {
      return format.url;
    }
  }

  return undefined;
}

// ─── VideoFetcher Class ──────────────────────────────────────────────────────

export class VideoFetcher {
  /**
   * Fetch video metadata from a URL using yt-dlp.
   * Returns title, duration, thumbnail, and available formats.
   * Throws VideoFetchError with typed error codes on failure.
   */
  async fetchMetadata(url: string, platform: Platform): Promise<VideoMetadata> {
    if (platform === 'youtube') {
      return this.fetchYouTubeMetadata(url);
    }
    if (platform !== 'instagram') {
      throw new VideoFetchError('Unsupported platform', 'NETWORK_ERROR');
    }

    try {
      const scraped = await scrapeInstagramVideo(url);
      return {
        title: scraped.title,
        duration: scraped.duration,
        thumbnail: scraped.thumbnailUrl,
        formats: [{
          formatId: 'original',
          resolution: 'original',
          fileSize: 0,
          ext: 'mp4',
          quality: 'Original',
          // Scraper gives us a CDN URL — fast path is available.
          directUrl: scraped.videoUrl,
          hasAudio: true,
          expiresAt: extractExpiry(scraped.videoUrl),
        }],
        previewVideoUrl: scraped.videoUrl,
      };
    } catch {
      // Scraping failed, fall through to yt-dlp
    }

    let output: YtDlpOutput;

    try {
      output = await this.executeYtDlp(url);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Also check stderr if available
      const stderr = (error as { stderr?: string })?.stderr ?? '';
      const combined = `${errorMessage} ${stderr}`;
      const mapped = mapYtDlpError(combined);
      throw new VideoFetchError(mapped.message, mapped.code, mapped.retryAfter);
    }

    // Validate duration
    if (output.duration > MAX_DURATION_SECONDS) {
      throw new VideoFetchError(
        'This video is too long! We support videos up to 60 minutes.',
        'DURATION_EXCEEDED'
      );
    }

    // Map formats
    const formats = mapInstagramFormats(output.formats);

    return {
      title: output.title,
      duration: output.duration,
      thumbnail: output.thumbnail ?? '',
      formats,
      previewVideoUrl: findPreviewUrl(output.formats),
    };
  }

  /**
   * Fetch YouTube metadata via yt-dlp and expose one option per resolution.
   * No CDN scraping — YouTube formats come straight from --dump-json.
   */
  private async fetchYouTubeMetadata(url: string): Promise<VideoMetadata> {
    let output: YtDlpOutput;
    try {
      output = await this.executeYtDlp(url);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stderr = (error as { stderr?: string })?.stderr ?? '';
      const mapped = mapYtDlpError(`${errorMessage} ${stderr}`);
      throw new VideoFetchError(mapped.message, mapped.code, mapped.retryAfter);
    }

    if (output.duration > MAX_DURATION_SECONDS) {
      throw new VideoFetchError(
        'This video is too long! We support videos up to 60 minutes.',
        'DURATION_EXCEEDED',
      );
    }

    const formats = mapYouTubeFormats(output.formats);

    return {
      title: output.title,
      duration: output.duration,
      thumbnail: output.thumbnail ?? '',
      // Always offer at least a "best available" option so the UI can download.
      formats: formats.length
        ? formats
        : [{ formatId: 'best', resolution: 'best', fileSize: 0, ext: 'mp4', quality: 'Best available', hasAudio: false }],
    };
  }

  /**
   * Execute yt-dlp to extract video metadata as JSON.
   * Uses youtube-dl-exec to call the yt-dlp binary.
   */
  private async executeYtDlp(url: string): Promise<YtDlpOutput> {
    const result = await youtubeDlExec(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: false,
      skipDownload: true,
      ...getCookieOptions(),
    });

    // youtube-dl-exec returns the parsed JSON when dumpSingleJson is used
    return result as unknown as YtDlpOutput;
  }
}

// Export constants for testing
export { MAX_DURATION_SECONDS };
