// URL pattern constants for platform detection
// These regex patterns match supported video URL formats for Instagram and YouTube.

export const URL_PATTERNS = {
  instagram: {
    post: /^https?:\/\/(www\.)?instagram\.com\/p\/([A-Za-z0-9_-]+)\/?/,
    reel: /^https?:\/\/(www\.)?instagram\.com\/reels?\/([A-Za-z0-9_-]+)\/?/,
  },
  youtube: {
    video: /^https?:\/\/(www\.|m\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    short: /^https?:\/\/(www\.|m\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    shortUrl: /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})/,
  },
} as const;

/** All supported platform domains for quick domain-level checks */
export const SUPPORTED_DOMAINS = [
  'instagram.com',
  'www.instagram.com',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
] as const;
