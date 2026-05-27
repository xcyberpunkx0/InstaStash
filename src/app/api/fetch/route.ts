import { NextRequest, NextResponse } from 'next/server';
import { VideoFetcher, VideoFetchError } from '@/lib/video-fetcher';
import type { Platform, FetchResponse } from '@/types';
import type { FetchErrorCode, FetchErrorResponse } from '@/types/errors';

// ─── Status Code Mapping ─────────────────────────────────────────────────────

const ERROR_STATUS_CODES: Record<FetchErrorCode, number> = {
  PRIVATE: 403,
  AGE_RESTRICTED: 403,
  GEO_BLOCKED: 403,
  UNAVAILABLE: 404,
  DURATION_EXCEEDED: 400,
  RATE_LIMITED: 429,
  NETWORK_ERROR: 502,
};

// ─── Validation ──────────────────────────────────────────────────────────────

const VALID_PLATFORMS: Platform[] = ['instagram', 'youtube'];

function isValidPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && VALID_PLATFORMS.includes(value as Platform);
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { url?: unknown; platform?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'NETWORK_ERROR' } satisfies FetchErrorResponse,
      { status: 400 }
    );
  }

  const { url, platform } = body;

  // Validate url field
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return NextResponse.json(
      { error: 'A valid URL is required.', code: 'NETWORK_ERROR' } satisfies FetchErrorResponse,
      { status: 400 }
    );
  }

  // Validate platform field
  if (!isValidPlatform(platform)) {
    return NextResponse.json(
      { error: 'Platform must be "instagram" or "youtube".', code: 'NETWORK_ERROR' } satisfies FetchErrorResponse,
      { status: 400 }
    );
  }

  const fetcher = new VideoFetcher();

  try {
    const metadata = await fetcher.fetchMetadata(url.trim(), platform);

    const response: FetchResponse = {
      title: metadata.title,
      thumbnail: metadata.thumbnail || undefined,
      duration: metadata.duration,
      formats: metadata.formats,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof VideoFetchError) {
      const statusCode = ERROR_STATUS_CODES[error.code];
      const errorResponse: FetchErrorResponse = {
        error: error.message,
        code: error.code,
      };

      // Include retryAfter for rate-limited responses
      if (error.code === 'RATE_LIMITED' && error.retryAfter !== undefined) {
        errorResponse.retryAfter = error.retryAfter;
      }

      return NextResponse.json(errorResponse, { status: statusCode });
    }

    // Unexpected errors
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the video.', code: 'NETWORK_ERROR' } satisfies FetchErrorResponse,
      { status: 502 }
    );
  }
}
