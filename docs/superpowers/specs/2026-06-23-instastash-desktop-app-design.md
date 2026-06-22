# InstaStash Desktop App — Design

**Date:** 2026-06-23
**Status:** Approved (Approach A)

## Goal

Convert the existing InstaStash web app (Next.js + React UI, Node backend that
spawns yt-dlp/ffmpeg) into a **cross-platform desktop application** (Windows +
macOS) for use as a portfolio piece and personal tool. Running on the user's own
machine (residential IP) means downloads work **without Instagram cookies**.

## Chosen approach

**Electron**, with the existing Next.js UI shipped as a **static export** in the
renderer, and the existing `src/lib/*` backend logic reused in the **main
process** behind an IPC bridge.

Rejected: Tauri (would require rewriting the Node backend in Rust — too much work
for an overwhelmed solo dev); Electron-embedding-Next-server (ships a needless
HTTP server, keeps CORS cruft).

## Architecture

Three layers:

1. **Renderer (Chromium):** the React UI, unchanged. Loaded from the Next.js
   static export (`out/`). Calls `window.instastash.*` instead of
   `fetch('/api/...')`.
2. **Preload (`electron/preload.ts`):** `contextBridge` exposes a typed, minimal
   `window.instastash` API. `contextIsolation: true`, `nodeIntegration: false`.
3. **Main process (Node):** IPC handlers that reuse `src/lib/*`. Spawns bundled
   yt-dlp + ffmpeg, writes files to disk, emits progress, serves remote
   media via a custom protocol, persists settings.

### What moves where

| Today (web) | Desktop |
|---|---|
| `app/api/detect` | IPC `detect` → reuses `platform-detector.ts` |
| `app/api/fetch` | IPC `fetchMetadata` → reuses `video-fetcher.ts`, `instagram-scraper.ts`, `format-classifier.ts` |
| `app/api/download` | IPC `download` → reuses yt-dlp spawn logic; **saves to folder** + streams progress |
| `app/api/proxy-image`/`proxy-video` | `instastash-media://` protocol in main, reusing `safe-cdn-fetch.ts` |
| `downloader-client.ts` dual path | Collapses; main does smart direct→yt-dlp fallback, writes to disk |

`src/app/api/` is deleted (logic now in `electron/`; static export forbids route
handlers).

## IPC interface (`window.instastash`)

```ts
interface InstaStashAPI {
  detect(url: string): Promise<DetectResponse>;
  fetchMetadata(url: string): Promise<FetchResponse>; // metadata or { error }
  download(input: DownloadInput): Promise<string>;     // resolves jobId
  onProgress(cb: (e: { jobId: string; pct: number; stage: string }) => void): () => void;
  onDone(cb: (e: { jobId: string; filePath: string; bytes: number }) => void): () => void;
  onError(cb: (e: { jobId: string; message: string; code: string }) => void): () => void;
  cancel(jobId: string): void;
  chooseFolder(): Promise<string | null>;       // dialog.showOpenDialog
  revealFile(filePath: string): void;           // shell.showItemInFolder
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<Settings>;
}

interface Settings { downloadDir: string; } // defaults to app.getPath('downloads')
interface DownloadInput { url: string; formatId: string; ext?: string; directUrl?: string; hasAudio?: boolean; }
```

Download is fire-and-forget with event streams (progress/done/error) keyed by
`jobId`, so multiple downloads and cancellation work cleanly.

## Data flow

1. Paste URL → `detect` → platform/validity.
2. Fetch → `fetchMetadata` → metadata + formats (scraper fast-path, yt-dlp
   `--dump-json` fallback). Preview/thumbnail rendered via `instastash-media://`.
3. Pick quality → `download` → main tries direct CDN write, falls back to yt-dlp
   spawn into `settings.downloadDir`; parses `--newline` progress → `progress`
   events; on success → `done` event with saved path → UI offers "Reveal in
   folder".

## Binary bundling

- **yt-dlp:** per-OS standalone binary (`yt-dlp.exe`, `yt-dlp_macos`) fetched into
  `resources/bin/<platform>/` by `scripts/fetch-binaries.mjs` at build time.
- **ffmpeg:** `ffmpeg-static` npm package, included via electron-builder
  `extraResources` + `asarUnpack`.
- **Path resolver (`electron/binaries.ts`):** dev → `node_modules`/system PATH;
  prod → `process.resourcesPath/bin/...`. All spawn calls take an explicit
  binary path (yt-dlp `--ffmpeg-location` set to the bundled ffmpeg).

## Packaging & distribution

- **electron-builder**: Windows NSIS installer (`.exe`), macOS `.dmg`.
- Unsigned for v1 (portfolio); users click past one OS warning.
- **GitHub Actions** matrix (`windows-latest`, `macos-latest`) builds installers
  and attaches them to a GitHub Release — so the macOS build needs no local Mac.
- README gets a demo GIF + download links + "run from source" instructions
  (the open-source repo is the resume centerpiece).

## Error handling

Reuse `classifyFailure` / `mapYtDlpError`. IPC returns/emits structured
`{ message, code, retryAfter? }`; the existing `ErrorMessage`/`ErrorDisplay`
components render it unchanged.

## Testing

- Existing `src/lib/*` vitest unit tests stay (pure logic, unchanged).
- `src/app/api/*.test.ts` (NextRequest handler tests) are rewritten to test the
  extracted handler functions directly.
- New unit tests: binary path resolver, yt-dlp progress parser, settings store.

## Project structure

```
electron/
  main.ts            # app lifecycle, window, protocol, IPC registration
  preload.ts         # contextBridge → window.instastash
  binaries.ts        # resolve yt-dlp/ffmpeg paths (dev vs packaged)
  media-protocol.ts  # instastash-media:// (reuses safe-cdn-fetch)
  settings.ts        # JSON store in app.getPath('userData')
  ipc/
    detect.ts  fetch.ts  download.ts  settings.ts  dialog.ts
src/                 # existing React UI (api/ removed); new renderer bridge client
resources/bin/       # bundled binaries (git-ignored; produced by fetch script)
scripts/fetch-binaries.mjs
electron-builder.yml
.github/workflows/release.yml
```

## Build phases

1. **Scaffold + dev loop:** Electron deps, static-export config, main/preload,
   IPC handlers reusing lib, renderer bridge, swap the 5 fetch seams. Runs in dev.
2. **Binaries + packaging:** fetch-binaries script, ffmpeg-static, path resolver,
   electron-builder config → working installer on Windows.
3. **CI + polish:** GitHub Actions release workflow (Win+Mac), README + demo GIF,
   test cleanup.
```
