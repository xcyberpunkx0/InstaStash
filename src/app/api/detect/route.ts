import { NextRequest, NextResponse } from 'next/server';
import { platformDetector, isDetectError, isDetectSuccess } from '@/lib/platform-detector';
import type { DetectRequest, DetectResponse } from '@/types';
import type { DetectErrorResponse } from '@/types/errors';

const DETECTION_TIMEOUT_MS = 1000;

const SUPPORTED_PLATFORMS = ['Instagram', 'YouTube'];

const EXAMPLE_FORMATS = [
  'https://www.instagram.com/p/ABC123/',
  'https://www.instagram.com/reel/ABC123/',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ',
];

export async function POST(request: NextRequest): Promise<NextResponse<DetectResponse | DetectErrorResponse>> {
  let body: DetectRequest;

  try {
    body = await request.json();
  } catch {
    const errorResponse: DetectErrorResponse = {
      error: 'Invalid request body',
      code: 'EMPTY_URL',
      supportedPlatforms: SUPPORTED_PLATFORMS,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';

  // Validate non-empty URL
  if (!url) {
    const errorResponse: DetectErrorResponse = {
      error: 'Please paste a video URL to get started!',
      code: 'EMPTY_URL',
      supportedPlatforms: SUPPORTED_PLATFORMS,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // Run detection with a 1-second timeout
  try {
    const result = await Promise.race([
      Promise.resolve(platformDetector.detect(url)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), DETECTION_TIMEOUT_MS)
      ),
    ]);

    if (isDetectError(result)) {
      const errorResponse: DetectErrorResponse = {
        error: result.error,
        code: result.code,
        supportedPlatforms: result.supportedPlatforms,
        ...(result.exampleFormats && { exampleFormats: result.exampleFormats }),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (isDetectSuccess(result)) {
      return NextResponse.json(result, { status: 200 });
    }

    // Fallback - should not reach here
    const errorResponse: DetectErrorResponse = {
      error: "We don't recognize this URL. We support Instagram and YouTube!",
      code: 'UNSUPPORTED_PLATFORM',
      supportedPlatforms: SUPPORTED_PLATFORMS,
      exampleFormats: EXAMPLE_FORMATS,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'TIMEOUT') {
      const errorResponse: DetectErrorResponse = {
        error: 'That took too long! Try pasting the URL again.',
        code: 'TIMEOUT',
        supportedPlatforms: SUPPORTED_PLATFORMS,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Unexpected error
    const errorResponse: DetectErrorResponse = {
      error: "We don't recognize this URL. We support Instagram and YouTube!",
      code: 'UNSUPPORTED_PLATFORM',
      supportedPlatforms: SUPPORTED_PLATFORMS,
      exampleFormats: EXAMPLE_FORMATS,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }
}
