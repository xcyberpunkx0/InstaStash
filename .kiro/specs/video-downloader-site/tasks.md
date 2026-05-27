# Implementation Plan: Video Downloader Site

## Overview

A Next.js full-stack application with a sketchbook-style aesthetic that downloads videos from Instagram and YouTube using yt-dlp. The implementation follows an incremental approach: project setup → backend services → API routes → frontend components → integration and polish.

## Tasks

- [x] 1. Set up project structure and core configuration
  - [x] 1.1 Initialize Next.js project with TypeScript, Tailwind CSS, and install dependencies
    - Initialize Next.js 16.2 project with App Router and TypeScript
    - Install dependencies: `youtube-dl-exec`, `roughjs`, `rough-notation`, `fast-check` (dev), `vitest` (dev)
    - Configure Tailwind CSS with the sketchbook theme colors, fonts, and breakpoints from the design tokens
    - Add Google Fonts (Caveat + Nunito) via `next/font`
    - Set up the base layout with warm cream background (`#FFF8F0`) and global font styles
    - _Requirements: 5.1, 5.2, 5.3, 5.8_

  - [x] 1.2 Define TypeScript interfaces and types
    - Create `src/types/index.ts` with all shared interfaces: `DetectRequest`, `DetectResponse`, `FetchRequest`, `FetchResponse`, `DownloadRequest`, `VideoFormat`, `VideoQuality`, `AppState`, `DetectionState`, `FetchState`, `DownloadState`, `RetryState`
    - Create `src/types/errors.ts` with error response interfaces: `DetectErrorResponse`, `FetchErrorResponse`, `ErrorEvent`
    - Define URL pattern constants in `src/lib/patterns.ts` matching the regex definitions from the design
    - _Requirements: 1.2, 6.1, 6.2, 6.5_

- [x] 2. Implement backend services
  - [x] 2.1 Implement PlatformDetector service
    - Create `src/lib/platform-detector.ts` with the `PlatformDetector` class
    - Implement `detect(url: string)` method using regex patterns for Instagram (post, reel) and YouTube (video, short, youtu.be)
    - Implement `normalize(url: string)` to strip whitespace, tracking params, and standardize scheme/subdomain
    - Implement `extractVideoId(url: string, platform)` to pull the video identifier from the URL
    - Handle edge cases: empty/whitespace input, supported domain but invalid path, unsupported domains
    - _Requirements: 1.2, 1.4, 1.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 2.2 Write property tests for PlatformDetector - URL Detection Correctness
    - **Property 1: URL Detection Correctness**
    - Use fast-check to generate valid URLs from templates with random shortcodes/IDs for both platforms
    - Assert that `detect()` correctly identifies platform, content type, and video ID for all generated URLs
    - **Validates: Requirements 1.2, 2.1, 2.2, 3.1, 3.2, 6.1, 6.2**

  - [x] 2.3 Write property tests for PlatformDetector - URL Normalization Invariance
    - **Property 2: URL Normalization Invariance**
    - Use fast-check to take valid URLs and apply random transformations (whitespace, extra params, scheme change, www toggle, trailing slash)
    - Assert that all transformations produce the same detection result as the canonical URL
    - **Validates: Requirements 6.3, 6.4, 6.5**

  - [x] 2.4 Write property tests for PlatformDetector - Invalid URL Rejection
    - **Property 3: Invalid URL Rejection**
    - Use fast-check to generate invalid URLs (whitespace-only strings, supported domain with bad paths, unsupported domains)
    - Assert that `detect()` returns an error result and never produces a successful detection
    - **Validates: Requirements 1.4, 1.6, 2.5, 6.6**

  - [x] 2.5 Implement VideoFetcher service
    - Create `src/lib/video-fetcher.ts` with the `VideoFetcher` class
    - Implement `fetchMetadata(url, platform)` that calls yt-dlp via `youtube-dl-exec` to extract title, duration, thumbnail, and available formats
    - Implement duration validation: reject videos exceeding 3600 seconds (60 minutes)
    - Map yt-dlp errors to typed error codes: `PRIVATE`, `UNAVAILABLE`, `AGE_RESTRICTED`, `GEO_BLOCKED`, `DURATION_EXCEEDED`, `RATE_LIMITED`, `NETWORK_ERROR`
    - For YouTube: return multiple format options with resolution labels and approximate file sizes
    - For Instagram: return single format at original resolution
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.6, 3.7_

  - [x] 2.6 Write property test for duration boundary enforcement
    - **Property 5: Duration Boundary Enforcement**
    - Use fast-check to generate random integers around the 3600-second boundary
    - Assert that videos with duration ≤ 3600 are accepted and duration > 3600 are rejected
    - **Validates: Requirements 3.7**

  - [x] 2.7 Implement DownloadManager service
    - Create `src/lib/download-manager.ts` with the `DownloadManager` class
    - Implement `download(url, formatId, onProgress)` that streams video via yt-dlp
    - Parse yt-dlp progress output and emit percentage updates (0-100, monotonically non-decreasing)
    - Return a ReadableStream for the file content
    - Handle download failures and timeout (30 seconds of no progress)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.8 Write property test for progress value invariant
    - **Property 7: Progress Value Invariant**
    - Use fast-check to generate sequences of progress values
    - Assert that all values are integers in [0, 100] and successive values are monotonically non-decreasing
    - **Validates: Requirements 4.2**

- [x] 3. Checkpoint - Backend services verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement API routes
  - [x] 4.1 Implement /api/detect route
    - Create `src/app/api/detect/route.ts` with POST handler
    - Accept `{ url: string }` body, trim whitespace, validate non-empty
    - Call `PlatformDetector.detect()` and return structured response
    - Implement 1-second timeout for detection
    - Return appropriate error responses with codes: `UNSUPPORTED_PLATFORM`, `INVALID_FORMAT`, `EMPTY_URL`, `TIMEOUT`
    - _Requirements: 1.2, 1.4, 1.5, 1.6_

  - [x] 4.2 Implement /api/fetch route
    - Create `src/app/api/fetch/route.ts` with POST handler
    - Accept `{ url: string, platform: string }` body
    - Call `VideoFetcher.fetchMetadata()` and return video metadata with quality options
    - Return error responses with codes for private, unavailable, age-restricted, geo-blocked, duration exceeded, rate limited
    - Include `retryAfter` in rate limit responses
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.6, 3.7_

  - [x] 4.3 Implement /api/download route
    - Create `src/app/api/download/route.ts` with POST handler
    - Accept `{ url: string, formatId: string }` body
    - Use Server-Sent Events to stream progress updates to the client
    - On completion, stream the MP4 file to the client for browser download
    - Handle mid-download failures and emit error events
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Implement frontend UI components
  - [x] 5.1 Create SketchBook base components and theme utilities
    - Create `src/components/SketchBorder.tsx` using Rough.js to render hand-drawn borders on containers
    - Create `src/components/SketchButton.tsx` with hand-drawn button styling and micro-animations (150-400ms)
    - Create `src/hooks/useReducedMotion.ts` to detect `prefers-reduced-motion` and conditionally disable animations
    - Set up Rough.js canvas rendering utilities in `src/lib/rough-utils.ts`
    - _Requirements: 5.1, 5.4, 5.5, 5.6_

  - [x] 5.2 Write property test for animation duration bounds
    - **Property 9: Animation Duration Bounds**
    - Enumerate all animation definitions in the sketchbook theme
    - Assert that all micro-animation durations are between 150ms and 400ms inclusive
    - **Validates: Requirements 5.4**

  - [x] 5.3 Write property test for color contrast accessibility
    - **Property 8: Color Contrast Accessibility**
    - Enumerate all text/background color combinations from the sketchbook theme
    - Compute contrast ratios and assert ≥ 4.5:1 for normal text and ≥ 3:1 for large text
    - **Validates: Requirements 5.2**

  - [x] 5.4 Implement URLInputField component
    - Create `src/components/URLInputField.tsx` with sketchbook-styled input field
    - Implement paste handling with automatic whitespace trimming
    - Show loading state during detection
    - Display inline error messages below the input
    - Integrate with PlatformIndicator to show detected platform badge
    - _Requirements: 1.1, 1.2, 1.3, 6.4_

  - [x] 5.5 Implement PlatformIndicator component
    - Create `src/components/PlatformIndicator.tsx` with hand-drawn platform icons
    - Display platform name and content type (post, reel, video, short)
    - Use Rough.js for sketchy icon rendering
    - _Requirements: 1.3_

  - [x] 5.6 Implement QualitySelector component
    - Create `src/components/QualitySelector.tsx` with sketchbook-styled radio buttons
    - Display quality options sorted from highest to lowest resolution
    - Show resolution label and approximate file size for each option
    - Skip rendering when only one quality option is available
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [x] 5.7 Write property test for quality options ordering
    - **Property 4: Quality Options Ordering**
    - Use fast-check to generate random arrays of VideoQuality objects
    - Assert that the sort function produces a list where each item's resolution ≥ the next item's resolution
    - **Validates: Requirements 3.3**

  - [x] 5.8 Implement DownloadProgress component
    - Create `src/components/DownloadProgress.tsx` with sketchbook-style animated progress bar
    - Show percentage fill with hand-drawn animation
    - Display completion state with celebratory doodle
    - Show error state with retry button
    - Respect `prefers-reduced-motion` for animations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.4, 5.5_

  - [x] 5.9 Implement SketchCharacter component
    - Create `src/components/SketchCharacter.tsx` with illustrated character that changes mood
    - Support moods: idle, thinking, happy, sad, error
    - Use SVG-based illustrations with Rough.js styling
    - _Requirements: 5.7_

  - [x] 5.10 Implement ErrorMessage component
    - Create `src/components/ErrorMessage.tsx` with friendly error display
    - Map error codes to specific user-facing messages (each code gets a distinct message)
    - Include retry button with countdown timer for rate-limited states
    - Integrate SketchCharacter with appropriate mood for each error type
    - _Requirements: 2.4, 2.5, 2.6, 3.6, 7.1, 7.2, 7.3, 7.4_

  - [x] 5.11 Write property test for error code to message mapping
    - **Property 6: Error Code to Restriction Message Mapping**
    - Use fast-check to generate from the enum of error codes (PRIVATE, AGE_RESTRICTED, GEO_BLOCKED, UNAVAILABLE)
    - Assert that each error code maps to a distinct message and no two codes produce the same message
    - **Validates: Requirements 3.6**

  - [x] 5.12 Implement HelpSection component
    - Create `src/components/HelpSection.tsx` with example URLs and step-by-step instructions
    - Include at least one example URL per supported platform (Instagram, YouTube)
    - Add illustrated steps with sketchbook styling
    - _Requirements: 7.5_

- [x] 6. Checkpoint - Component verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate page and wire components together
  - [x] 7.1 Build the main page with full download flow
    - Create `src/app/page.tsx` as the main application page
    - Implement the full state machine: idle → detecting → detected → fetching → fetched → downloading → complete
    - Wire URLInputField → /api/detect → PlatformIndicator
    - Wire download button → /api/fetch → QualitySelector → /api/download → DownloadProgress
    - Implement SSE client for progress updates from /api/download
    - Manage AppState with React state/reducer
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

  - [x] 7.2 Implement retry logic and error state management
    - Implement retry state machine: max 3 attempts, 30-second cooldown after exhaustion
    - Preserve URL and quality settings across retries
    - Handle rate-limit responses with platform-provided or default (60s) countdown
    - Disable retry button during cooldown with visible countdown timer
    - Preserve user's input URL in the text field on all errors
    - _Requirements: 4.4, 4.5, 7.1, 7.2, 7.4_

  - [x] 7.3 Implement responsive layout and accessibility
    - Ensure layout works at 360px, 768px, 1024px, and 1440px viewports
    - Add proper ARIA labels and roles for screen readers
    - Implement keyboard navigation for all interactive elements
    - Ensure `prefers-reduced-motion` disables non-essential animations globally
    - Verify all text meets WCAG contrast requirements against backgrounds
    - _Requirements: 5.2, 5.5, 5.6, 5.8_

- [x] 8. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The application uses TypeScript throughout (frontend and backend)
- yt-dlp must be installed on the system for the backend services to function

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.5", "2.7", "5.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.6", "2.8", "5.2", "5.3", "5.4", "5.5", "5.9", "5.12"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "5.6", "5.8", "5.10"] },
    { "id": 5, "tasks": ["5.7", "5.11"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3"] }
  ]
}
```
