# Requirements Document

## Introduction

A video downloader website with a sketchbook-style design aesthetic that supports downloading videos from Instagram (posts and Reels) and YouTube (videos and Shorts). The site should feel pleasant, heartwarming, and make users happy when they visit — featuring hand-drawn, doodle-like UI elements, warm soft colors, and a playful inviting atmosphere.

## Glossary

- **Downloader_App**: The web application that allows users to paste video URLs and download videos from supported platforms
- **URL_Input**: The text input field where users paste video links
- **Video_Fetcher**: The backend service responsible for extracting video data from supported platforms
- **Download_Manager**: The component that handles video file delivery to the user's device
- **Platform_Detector**: The component that identifies which platform a URL belongs to
- **Sketchbook_UI**: The visual design system using hand-drawn, doodle-like elements with warm soft colors

## Requirements

### Requirement 1: URL Input and Platform Detection

**User Story:** As a user, I want to paste a video URL and have the site automatically detect which platform it belongs to, so that I can download videos without worrying about technical details.

#### Acceptance Criteria

1. THE Downloader_App SHALL display a single URL_Input field as the primary interactive element on the main page, visible without scrolling on viewports 360px wide or larger
2. WHEN a user pastes or enters a URL of up to 2048 characters into the URL_Input, THE Platform_Detector SHALL identify the platform as Instagram, YouTube, or unsupported within 1 second
3. WHEN the Platform_Detector identifies a valid supported platform (Instagram or YouTube), THE Downloader_App SHALL display a visual indicator showing the detected platform name and a hand-drawn icon style corresponding to that platform; no platform indicator SHALL be displayed for unsupported platforms
4. IF the Platform_Detector cannot identify a supported platform, THEN THE Downloader_App SHALL display an error message indicating that the URL is not recognized and listing the supported platforms (Instagram, YouTube) with example URL formats
5. IF the Platform_Detector does not return a result within 1 second, THEN THE Downloader_App SHALL display an error message indicating that detection timed out and prompting the user to try again
6. IF the URL_Input is empty or contains only whitespace when detection is triggered, THEN THE Downloader_App SHALL display an error message indicating that a URL is required

### Requirement 2: Instagram Video Download

**User Story:** As a user, I want to download Instagram videos and Reels by pasting their URL, so that I can save content for offline viewing.

#### Acceptance Criteria

1. WHEN a URL matching an Instagram post pattern (https://www.instagram.com/p/{shortcode}/ or https://instagram.com/p/{shortcode}/) is provided, THE Video_Fetcher SHALL extract the video source from the Instagram post within 30 seconds
2. WHEN a URL matching an Instagram Reel pattern (https://www.instagram.com/reel/{shortcode}/ or https://www.instagram.com/reels/{shortcode}/) is provided, THE Video_Fetcher SHALL extract the video source from the Instagram Reel within 30 seconds
3. WHEN the Video_Fetcher successfully extracts an Instagram video, THE Download_Manager SHALL provide the video file in MP4 format with the original resolution of the source video; IF the extracted video does not maintain the original resolution, THEN THE Downloader_App SHALL reject the result and display an error indicating the video could not be delivered at original quality
4. IF the Video_Fetcher cannot access an Instagram video due to privacy settings, THEN THE Downloader_App SHALL display a message explaining that private content cannot be downloaded
5. IF the provided URL does not match a recognized Instagram post or Reel pattern, THEN THE Downloader_App SHALL display a message indicating the URL format is not supported
6. IF the Video_Fetcher fails to extract the video due to the content being unavailable (deleted, expired, or network error), THEN THE Downloader_App SHALL display a message indicating the content could not be retrieved and preserve any user-entered URL in the input field

### Requirement 3: YouTube Video Download

**User Story:** As a user, I want to download YouTube videos and Shorts by pasting their URL, so that I can watch content offline.

#### Acceptance Criteria

1. WHEN a valid YouTube video URL is provided, THE Video_Fetcher SHALL extract available video qualities from the YouTube video and present each option with its resolution label (e.g., 360p, 720p, 1080p) and approximate file size
2. WHEN a valid YouTube Shorts URL is provided, THE Video_Fetcher SHALL extract the video source from the YouTube Short in the highest available quality
3. WHEN multiple video qualities are available, THE Downloader_App SHALL present quality options to the user in a selection interface styled consistently with the Sketchbook_UI, listing options from highest to lowest resolution
4. WHEN only one video quality is available, THE Downloader_App SHALL skip the quality selection step and proceed directly to download preparation
5. WHEN the user selects a quality option, THE Download_Manager SHALL provide the video file in MP4 format at the selected quality
6. IF the Video_Fetcher cannot access a YouTube video because it is age-restricted, private, geo-blocked, or otherwise unavailable, THEN THE Downloader_App SHALL display a message indicating the specific type of restriction encountered
7. IF the YouTube video or Short exceeds 60 minutes in duration, THEN THE Downloader_App SHALL inform the user that content longer than 60 minutes is not supported

### Requirement 4: Download Progress and Delivery

**User Story:** As a user, I want to see download progress and receive my video file reliably, so that I know the download is working.

#### Acceptance Criteria

1. WHEN a download is initiated, THE Downloader_App SHALL display an animated progress indicator using sketchbook-style animation within 500 milliseconds of initiation
2. WHILE a download is in progress, THE Download_Manager SHALL report progress as an integer percentage from 0 to 100
3. WHEN a download completes successfully, THE Download_Manager SHALL initiate a browser file download to the user's device and THE Downloader_App SHALL replace the progress indicator with a sketchbook-style completion confirmation
4. IF a download fails mid-progress, THEN THE Downloader_App SHALL display an error message indicating the failure reason and offer a retry option that re-attempts the download with the same video URL and quality settings
5. IF no download progress is received for 30 seconds, THEN THE Downloader_App SHALL treat the download as failed and display a timeout error message with a retry option

### Requirement 5: Sketchbook Visual Design

**User Story:** As a user, I want the site to feel warm, playful, and hand-crafted, so that downloading videos feels like a pleasant experience rather than a utilitarian task.

#### Acceptance Criteria

1. THE Sketchbook_UI SHALL use hand-drawn border styles and doodle-like decorative elements on all container components, buttons, input fields, and section dividers
2. THE Sketchbook_UI SHALL use a warm, soft color palette with muted pastels and earthy tones as primary colors, maintaining a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text against background colors
3. THE Sketchbook_UI SHALL use a handwritten or sketch-style font for headings and a complementary font for body text with a minimum size of 16px
4. THE Sketchbook_UI SHALL include micro-animations with a duration between 150ms and 400ms on interactive elements such as buttons and the URL_Input field
5. IF the user's system has prefers-reduced-motion enabled, THEN THE Sketchbook_UI SHALL disable all non-essential animations and transitions while preserving essential status-communicating animations such as loading indicators
6. WHEN the user's system does not have prefers-reduced-motion enabled or the preference is not set, THE Sketchbook_UI SHALL enable all animations by default
7. WHEN a user action triggers a state change such as a successful download or an error, THE Sketchbook_UI SHALL display an illustrated character or doodle that visually changes appearance to reflect the current state
8. THE Downloader_App SHALL be fully responsive and maintain the sketchbook aesthetic across viewports at breakpoints of 768px or below for mobile, 769px to 1024px for tablet, and above 1024px for desktop

### Requirement 6: Supported URL Formats

**User Story:** As a user, I want the site to accept various URL formats from Instagram and YouTube, so that I can paste links however I copy them.

#### Acceptance Criteria

1. THE Platform_Detector SHALL recognize Instagram URLs in formats including instagram.com/p/{post-id}/, instagram.com/reel/{reel-id}/, and instagram.com/reels/{reel-id}/
2. THE Platform_Detector SHALL recognize YouTube URLs in formats including youtube.com/watch?v={id}, youtu.be/{id}, youtube.com/shorts/{id}, and m.youtube.com/watch?v={id}
3. WHEN a URL contains additional query parameters or tracking data (such as utm_source, igshid, si, or feature parameters), THE Platform_Detector SHALL extract the core video identifier and identify the platform without requiring parameter removal by the user
4. THE Downloader_App SHALL remove leading and trailing whitespace characters (spaces, tabs, newline characters) from pasted URLs before processing
5. THE Platform_Detector SHALL recognize URLs regardless of whether they use http or https scheme, include or omit the www subdomain, or include a trailing slash
6. IF a pasted URL matches a supported platform domain but does not contain a valid video identifier path, THEN THE Downloader_App SHALL display an error message indicating that the URL does not point to a specific video and suggesting the user check the link

### Requirement 7: Error Handling and User Guidance

**User Story:** As a user, I want clear and friendly guidance when something goes wrong, so that I can fix the issue or understand limitations without frustration.

#### Acceptance Criteria

1. IF a network error occurs during video fetching, THEN THE Downloader_App SHALL display a connection error message with a hand-drawn sad cloud illustration and a retry button that re-attempts the failed fetch when activated
2. IF the retry button is activated and the network error persists after 3 consecutive retry attempts, THEN THE Downloader_App SHALL disable the retry button and display an explicit countdown timer showing the remaining seconds out of 30 before the retry button becomes active again, along with a message indicating the user should check their internet connection
3. IF a video URL points to content that has been deleted, THEN THE Downloader_App SHALL display a message in the main content area indicating that the content is no longer available on the source platform
4. IF the Video_Fetcher encounters a rate limit from a platform, THEN THE Downloader_App SHALL display a message asking the user to try again and show a countdown timer starting from the platform-provided retry-after duration, or from 60 seconds if no duration is provided by the platform
5. THE Downloader_App SHALL display a help section containing at least one example URL per supported platform and illustrated step-by-step instructions for using the application
