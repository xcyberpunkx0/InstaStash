# Refactor: Direct-CDN Download Path (Option A3)

> Move from "always proxy bytes through our server" to "redirect to the CDN when we
> can, proxy only when we must." Instagram becomes pure redirect. YouTube becomes
> hybrid — redirect for combined-AV streams, proxy for split / audio-only.

---

## TL;DR

| Path | Today | After |
|---|---|---|
| Instagram reel/post | `yt-dlp` → temp file → base64 over SSE → blob in browser | Backend extracts CDN URL → browser fetches direct from `cdninstagram.com` |
| YouTube ≤720p combined (itag 18, 22) | yt-dlp + proxy | Direct redirect to `googlevideo.com` |
| YouTube 1080p+ (split video+audio) | yt-dlp + ffmpeg merge + proxy | Same as today (no change) |
| YouTube audio-only (mp3) | yt-dlp + transcode + proxy | Same as today (no change) |

Most user traffic (Instagram + sub-720p YouTube) stops touching our bandwidth. The
heavy paths stay proxied so feature parity is preserved.

---

## Why this and not "everything redirect" or "everything proxy"

- **Everything proxy** (today): every byte costs us egress. Fine for a personal box,
  expensive on Vercel/Workers, fragile under any traffic spike.
- **Everything redirect**: impossible for YouTube 1080p+ (split streams need server
  merge), impossible for MP3 (YouTube doesn't serve MP3, needs transcode), and
  fragile for IP-bound URLs.
- **Hybrid (this plan)**: covers the majority of real traffic with a redirect, keeps
  the proxy as an honest fallback, ships incrementally without a big-bang rewrite.

This is the same shape that `indown.io`, `ssyou.online`, `savefrom.net` and friends
ship in production.

---

## Current architecture (concrete)

```
src/app/api/fetch/route.ts        → POST: returns FetchResponse { title, formats[] }
src/app/api/download/route.ts     → POST: spawns yt-dlp, base64-streams the file via SSE
src/lib/video-fetcher.ts          → yt-dlp metadata extraction
src/lib/instagram-scraper.ts      → already extracts a direct videoUrl (currently UNUSED past metadata)
src/lib/download-manager.ts       → ReadableStream wrapper around yt-dlp stdout (unused by current route)
src/types/index.ts                → VideoFormat, FetchResponse, DownloadRequest, DownloadState
src/app/page.tsx (handleDownload) → SSE consumer: parses progress/file/error frames, builds Blob, click-trigger <a>
```

Two important facts hidden in there:

1. `instagram-scraper.ts` already returns a `videoUrl` (the CDN URL), but we throw it
   away — `VideoFetcher.fetchMetadata` only keeps title/duration/thumbnail and then
   re-resolves at download time via yt-dlp.
2. `next.config.ts` has `serverExternalPackages: ['youtube-dl-exec']`, so the
   Node-only path is already isolated from the bundler.

---

## Target architecture

### New API contract

`VideoFormat` (in `src/types/index.ts`) gains three optional fields:

```ts
export interface VideoFormat {
  formatId: string;
  resolution: string;
  fileSize: number;
  ext: string;
  quality: string;

  // NEW — only present when a direct download is possible
  directUrl?: string;       // signed CDN URL, valid for ~hours
  hasAudio?: boolean;       // true if this format is muxed (browser can save it as-is)
  expiresAt?: number;       // epoch ms; UI can warn if user dawdles
}
```

Rule on the client:

- If `directUrl && hasAudio` → use it. Skip `/api/download` entirely.
- Otherwise → fall back to existing SSE proxy.

Server endpoints are unchanged in name; the response shape is a strict superset.

### New file

`src/lib/format-classifier.ts` — small pure module that, given a yt-dlp format,
decides `{ directUrl, hasAudio }`. Keeps the routing logic in one place and unit
testable.

### Files that change

| File | Change |
|---|---|
| `src/types/index.ts` | Add `directUrl`, `hasAudio`, `expiresAt` to `VideoFormat`. |
| `src/lib/video-fetcher.ts` | When mapping yt-dlp formats, populate the new fields via `format-classifier`. For Instagram, attach the scraped `videoUrl` as `directUrl` on the single returned format. |
| `src/lib/instagram-scraper.ts` | No logic change. Re-export `InstagramVideoData` so the fetcher can pass `videoUrl` through cleanly. |
| `src/app/api/fetch/route.ts` | No code change — type widening flows through automatically. |
| `src/app/api/download/route.ts` | Unchanged. Stays as the proxy fallback. |
| `src/app/page.tsx` (`handleDownload`) | Branch: if selected format has `directUrl && hasAudio`, do client-side download (fetch + Blob for progress UX, or `<a download>` for zero-overhead). Library write happens on success either way. |
| `src/components/features/QualityPicker.tsx` (or equivalent) | Optionally show a small "fast" badge on direct-download formats. Optional, cosmetic. |
| `src/lib/format-classifier.test.ts` (new) | Vitest unit tests for the classifier. |

### Files that do NOT change

- `src/lib/download-manager.ts` — already correctly wraps yt-dlp; not used by the
  current SSE route, but it's the cleaner long-term replacement when we revisit
  the proxy. Leave alone for this refactor.
- `src/app/api/detect/route.ts` — URL detection is upstream of all this.
- The library page, components, hooks — purely UI-side, unaffected.

---

## Frontend flow changes

Current (`handleDownload`):

```
fetch('/api/download') → SSE stream → parse 'progress'/'file' frames →
  base64 decode → Blob → <a download>.click()
```

After:

```
const fmt = state.fetch.metadata.formats.find(f => f.formatId === selectedId);

if (fmt.directUrl && fmt.hasAudio) {
  // FAST PATH — no server bandwidth
  await downloadDirect(fmt.directUrl, filenameFor(state.url), onProgress);
} else {
  // EXISTING PATH — server proxy via SSE
  await downloadViaProxy(state.url, fmt.formatId, onProgress);
}

// Library write is unified after either path resolves.
```

Two reasonable implementations of `downloadDirect`:

1. **Anchor click** — zero JS overhead, browser handles it natively. Downside: no
   progress bar (browser shows its own). Use this for the simplest UX.
2. **Fetch + ReadableStream + Blob** — gives us the existing pretty progress bar.
   Downside: holds the full file in memory in the tab and re-downloads if the
   user retries. Reasonable for ≤500 MB files.

Recommend (2) for consistency with the current UX. (1) is a 5-line fallback if
fetch hits CORS issues on a given CDN.

### CORS reality check

- `cdninstagram.com` allows cross-origin GET. Verified by every IG downloader site.
- `googlevideo.com` mostly allows GET, but on some itags / regions the response
  omits `Access-Control-Allow-Origin`. If fetch fails CORS, fall back to anchor
  click (still works, just no progress).
- We'll detect and downgrade silently.

---

## Pros and cons (the honest list)

### Pros

- **Bandwidth**: Instagram traffic and ~half of YouTube traffic stops paying our
  egress. On a $5 VPS this stops being a concern entirely.
- **Speed**: redirect path is faster than proxy because there's one fewer hop. CDNs
  are also closer to the user than our origin.
- **Cost predictability**: a viral spike on Instagram reels no longer torches the
  bill. The expensive paths (1080p YouTube, MP3) stay rate-limitable on our box.
- **Smaller blast radius for ToS issues**: we're "linking" to the CDN, not
  redistributing the bytes. Doesn't make a downloader site legal, but it's the
  industry-standard posture.
- **Simpler error model on the fast path**: no SSE, no base64, no progress parser,
  no `/tmp` cleanup. Either the CDN serves the bytes or it doesn't.
- **Mostly additive**: existing tests for the proxy path keep passing. Risk of
  regression is contained to the new branch.

### Cons / honest tradeoffs

- **Two code paths to maintain**. The `if (directUrl && hasAudio)` branch is real
  complexity that didn't exist before.
- **Direct URLs expire**. If the user pastes a link, picks a quality, then walks
  away for 4 hours, the CDN URL might 403 by the time they click. Mitigation:
  fall back to proxy when direct fetch returns 4xx, or refresh metadata on click
  if `expiresAt` is in the past.
- **YouTube IP-binding**: `googlevideo.com` URLs sometimes only work from the IP
  that requested them. Our backend extracts on its IP; the user's browser fetches
  from theirs. Failure rate in practice is low (5-15% in field reports) but
  non-zero. Mitigation: same fallback to proxy on fetch failure.
- **Loss of unified progress reporting on the fast path** if we use anchor-click.
  Avoidable by sticking with fetch + Blob.
- **The progress UX during a Blob fetch holds the file in memory**. A 1 GB 1080p
  download will spike tab memory by ~1 GB. Acceptable for the typical use case
  (sub-200 MB clips); flag in the UI for >500 MB if we want to be polite.
- **Doesn't fix audio-only or 1080p+ YouTube**. Those still go through yt-dlp +
  ffmpeg + proxy. If those are the dominant requests in practice, the cost
  reduction will be smaller than expected.
- **CORS surprises**: the fast path can fail on certain CDNs/regions in ways we
  can't predict from dev. Need real-traffic testing.

### What this does NOT change

- yt-dlp is still required on the server for metadata extraction and for the proxy
  fallback. We do not become a pure-frontend app.
- ffmpeg is still required for the merge/transcode paths.
- The proxy route (`/api/download`) is still the right tool for what it does. We
  just route fewer requests through it.
- Deployment shape: still a Node server with binaries on disk. The refactor reduces
  bandwidth pressure but doesn't unlock "deploy on Vercel functions" — the proxy
  fallback still needs a long-running process.

---

## Implementation plan (incremental, each step shippable)

### Phase 1 — Types and classifier (1-2 hr)

- [ ] Extend `VideoFormat` in `src/types/index.ts` with optional `directUrl`,
      `hasAudio`, `expiresAt`.
- [ ] Add `src/lib/format-classifier.ts` with `classifyYtDlpFormat(raw) → { directUrl, hasAudio, expiresAt? }`.
  - Rule for `hasAudio`: `acodec !== 'none'` AND `vcodec !== 'none'` for video, or
    `vcodec === 'none' && acodec !== 'none'` for audio-only (which we don't take
    the fast path on anyway).
  - Extract `expiresAt` from yt-dlp's `url` query param (`expire=` is a unix
    timestamp on YouTube; Instagram has `oe=` hex timestamp).
- [ ] Add unit tests in `src/lib/format-classifier.test.ts` covering:
  - YouTube combined (itag 18, 22) → `hasAudio: true`
  - YouTube video-only (itag 137) → `hasAudio: false`
  - YouTube audio-only (itag 140) → `hasAudio: false` (proxy will transcode)
  - Instagram single-format → `hasAudio: true`
  - URL with no `expire`/`oe` → `expiresAt: undefined`

### Phase 2 — Wire classifier into fetcher (1 hr)

- [ ] In `src/lib/video-fetcher.ts` `mapYouTubeFormats`, attach classifier output
      onto each `VideoFormat`. Pass through the raw format URL when present.
- [ ] In `mapInstagramFormats` and the scraper-success branch, attach the scraped
      `videoUrl` as `directUrl`, set `hasAudio: true`.
- [ ] Verify `next build` and existing fetch tests still pass.

### Phase 3 — Frontend fast-path (2-3 hr)

- [ ] Extract `handleDownload` in `src/app/page.tsx` into a small module:
  - `downloadDirect(url, filename, onProgress)` — fetch + ReadableStream + Blob.
  - `downloadViaProxy(srcUrl, formatId, onProgress)` — current SSE logic, mostly
    moved verbatim.
- [ ] Add the routing branch. If `directUrl && hasAudio`, call `downloadDirect`.
      On any failure (CORS, 4xx, network), fall back to `downloadViaProxy` once,
      logging which path succeeded.
- [ ] Library write happens after either path returns the filename + bytes count.
- [ ] Manual test matrix:
  - [ ] IG reel (public)
  - [ ] IG post with private/expired URL → falls back to proxy
  - [ ] YouTube short (combined) → fast path
  - [ ] YouTube 1080p (split) → proxy path
  - [ ] YouTube MP3 (audio-only) → proxy path
  - [ ] Cancel mid-download (both paths)

### Phase 4 — UX polish (optional, 1 hr)

- [ ] Show a subtle "instant" or "fast" pill on quality options that have
      `directUrl && hasAudio`. Just informational; users don't need to choose.
- [ ] If `expiresAt` is set and the user has the picker open longer than the TTL,
      silently re-fetch metadata before kicking off the download.
- [ ] Add a single-line console log per download: `path=direct|proxy
      bytes=… ms=…` — useful for tuning, never user-visible.

### Phase 5 — Tests and cleanup (1 hr)

- [ ] Update `src/app/api/fetch/route.test.ts` to assert the new fields appear on
      formats where expected.
- [ ] Decide on `src/components/features/LibraryGrid.tsx` mock data (currently
      duplicates the real `LibraryItem` shape). Out of scope unless it breaks.
- [ ] Update `.kiro/specs/video-downloader-site/design.md` with the new API
      contract and the dual-path flow diagram.

---

## Risks and unknowns

- **YouTube extractor breakage**: yt-dlp gets broken by upstream changes
  every few weeks. This refactor doesn't fix that — it just reduces the cost
  per successful extract. Plan: pin yt-dlp version, cron `pip install --upgrade yt-dlp`.
- **CORS coverage on googlevideo**: needs a few hours of real-traffic
  observation before we trust it. Build the fallback first; turn the fast path
  on with a feature flag (`NEXT_PUBLIC_FAST_YT=1`) for the first deploy.
- **PoToken / signature deprecation**: if YouTube fully kills unauthenticated
  extraction (rumored, not happened), the proxy path also breaks. Out of scope;
  same risk as today.
- **Memory ceiling on Blob path**: noted above. If users complain, switch the
  fast path to anchor-click for files >500 MB based on `fileSize`.

---

## Deployment implications

This refactor by itself does not change *where* we can deploy — yt-dlp + ffmpeg +
long-running process is still required for the proxy path. But it does change *how
much it costs*:

- $4-5/mo Hetzner CX22 was already plenty for the personal-traffic case.
- After this refactor, the same box comfortably handles a 10-100x traffic bump
  before we need to think about scale, because most of that traffic is Instagram
  redirects that cost essentially zero.
- If we ever want to split deployment (e.g. put the metadata API on Cloudflare
  Workers and keep the proxy on a VPS), this refactor is the prerequisite.
  That's a future-day decision, not part of this plan.

---

## Out of scope (explicitly)

- Replacing yt-dlp with a hand-rolled extractor.
- Browser-side ffmpeg.wasm merging for 1080p YouTube. (Discussed, rejected.)
- A real job queue for proxy downloads (BullMQ + Redis). Worth doing only after
  we see actual concurrency problems.
- Rewriting `download-manager.ts` to power the SSE route. Tempting, separate PR.
- TikTok / Vimeo / Twitter platform support.
- Captcha / bot mitigation on the API. Cloudflare in front when we go public.

---

## Definition of done

1. A public IG reel downloads with zero outbound bytes from our server (verified
   by checking nginx/access logs or `node` net counters).
2. A public YouTube short at 360p downloads with zero outbound bytes.
3. A public YouTube 1080p video still downloads correctly via the existing proxy.
4. All existing tests pass, new classifier tests pass.
5. `design.md` reflects the dual-path flow.
6. A bad/expired direct URL silently degrades to the proxy path without surfacing
   an error to the user.
