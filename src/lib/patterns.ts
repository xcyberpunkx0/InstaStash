// URL pattern constants for platform detection
// These regex patterns match supported video URL formats for Instagram and YouTube.

export const URL_PATTERNS = {
  instagram: {
    post: /^https?:\/\/(www\.)?instagram\.com\/p\/([A-Za-z0-9_-]+)\/?/,
    reel: /^https?:\/\/(www\.)?instagram\.com\/reels?\/([A-Za-z0-9_-]+)\/?/,
  },
} as const;

/** All supported platform domains for quick domain-level checks */
export const SUPPORTED_DOMAINS = [
  'instagram.com',
  'www.instagram.com',
] as const;
