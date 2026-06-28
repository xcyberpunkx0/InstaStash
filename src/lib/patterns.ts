// URL pattern constants for platform detection
// These regex patterns match supported video URL formats for Instagram and YouTube.

export const URL_PATTERNS = {
  instagram: {
    post: /^https?:\/\/(www\.)?instagram\.com\/p\/([A-Za-z0-9_-]+)\/?/,
    reel: /^https?:\/\/(www\.)?instagram\.com\/reels?\/([A-Za-z0-9_-]+)\/?/,
  },
  youtube: {
    // youtube.com/watch?v=VIDEOID (v may sit anywhere in the query string)
    watch: /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})/,
    // youtube.com/shorts/VIDEOID
    short: /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    // youtube.com/embed/VIDEOID
    embed: /^https?:\/\/(?:www\.|m\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    // youtu.be/VIDEOID short share links
    shareUrl: /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})/,
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
