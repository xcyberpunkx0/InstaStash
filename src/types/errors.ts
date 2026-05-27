// Error response interfaces for the Video Downloader application

/** Error codes returned by the /api/detect endpoint */
export type DetectErrorCode =
  | 'UNSUPPORTED_PLATFORM'
  | 'INVALID_FORMAT'
  | 'EMPTY_URL'
  | 'TIMEOUT';

/** Error response from POST /api/detect */
export interface DetectErrorResponse {
  error: string;
  code: DetectErrorCode;
  supportedPlatforms: string[];
  exampleFormats?: string[];
}

/** Error codes returned by the /api/fetch endpoint */
export type FetchErrorCode =
  | 'PRIVATE'
  | 'UNAVAILABLE'
  | 'AGE_RESTRICTED'
  | 'GEO_BLOCKED'
  | 'DURATION_EXCEEDED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR';

/** Error response from POST /api/fetch */
export interface FetchErrorResponse {
  error: string;
  code: FetchErrorCode;
  retryAfter?: number;
}

/** SSE error event emitted during download */
export interface ErrorEvent {
  type: 'error';
  code: string;
  message: string;
}
