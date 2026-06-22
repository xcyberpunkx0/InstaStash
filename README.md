<div align="center">

# 📔 InstaStash

**A beautiful, hand-crafted desktop app for saving Instagram videos & reels.**

Paste a link → pick a quality → it saves straight to your computer. No ads,
no sign-up, no sketchy websites. Runs entirely on your machine.

[![Build & Release](https://github.com/YOUR_USER/InstaStash/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USER/InstaStash/actions/workflows/release.yml)

<!-- TODO: replace with a real demo GIF — see "Demo" below -->
<img src="docs/demo.gif" alt="InstaStash demo" width="720" />

</div>

---

## ✨ Why it's built as a desktop app

Public Instagram-downloader websites run on datacenter servers, which Instagram
aggressively rate-limits and blocks — so they constantly break or need login
cookies. **InstaStash runs on your own computer**, using your normal home
connection, so it just works without any cookies or accounts. It's also a
cleaner architecture: no server to host, no credentials stored anywhere.

## 🎬 Features

- **One-click downloads** — paste a reel/post URL, pick a quality, done.
- **Saves where you want** — defaults to your Downloads folder; change it in
  settings. "Reveal in folder" when finished.
- **Live progress** — real download progress, not a fake spinner.
- **Handles merged streams** — bundles `yt-dlp` + `ffmpeg`, so separate
  video/audio tracks are merged into a clean MP4 automatically.
- **Lovingly designed** — a warm, hand-drawn "paper notebook" aesthetic with
  multiple themes. Not your average utilitarian downloader.
- **Cross-platform** — Windows and macOS installers.

## 📥 Download

Grab the latest installer from the [**Releases**](https://github.com/YOUR_USER/InstaStash/releases) page:

- **Windows:** `InstaStash-Setup-x.y.z.exe`
- **macOS:** `InstaStash-x.y.z.dmg`

> The apps are unsigned (this is a portfolio project), so your OS may show a
> "unrecognized developer" warning the first time — click **More info → Run
> anyway** (Windows) or right-click → **Open** (macOS).

## 🛠️ Tech stack

| Layer | Tech |
|-------|------|
| UI | **Next.js 16** (React 19) static export, **Tailwind CSS 4**, **Motion**, **rough.js** hand-drawn graphics |
| Desktop shell | **Electron** (contextIsolation, typed IPC bridge — no `nodeIntegration`) |
| Media engine | **yt-dlp** + **ffmpeg** (bundled per-platform) spawned from the main process |
| Packaging | **electron-builder** (NSIS + DMG), **GitHub Actions** matrix CI |
| Quality | **TypeScript** end-to-end, **Vitest** unit + property tests |

### Architecture in one breath

The React UI runs in Electron's renderer and talks to the Node **main process**
over a small typed IPC bridge (`window.instastash`). The main process does the
real work — running yt-dlp into your chosen folder, streaming progress back, and
proxying CDN media through a custom `instastash-media://` protocol (with an SSRF
host allowlist). See [`docs/superpowers/specs`](docs/superpowers/specs) for the
full design.

## 🚀 Run from source

```bash
git clone https://github.com/YOUR_USER/InstaStash.git
cd InstaStash
npm install
npm run dev:desktop      # launches the app with hot-reload
```

> Dev mode relies on `yt-dlp` and `ffmpeg` being on your PATH. Packaged builds
> bundle them, so end users need nothing installed.

## 📦 Build your own installer

```bash
npm run dist             # fetch binaries → build UI → bundle → installer in release/
```

## ✅ Tests

```bash
npm test
```

## ⚖️ Legal

For personal use, downloading content you have the rights to. Respect Instagram's
Terms of Service and creators' copyright. Provided as-is, for educational and
personal purposes.
