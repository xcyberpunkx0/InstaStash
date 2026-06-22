// Resolves the yt-dlp and ffmpeg binary paths for both dev and packaged builds.
//
//   dev       → rely on yt-dlp on PATH; ffmpeg from the ffmpeg-static package.
//   packaged  → use binaries shipped under resources/bin (via electron-builder
//               extraResources) and the unpacked ffmpeg-static.
import { app } from 'electron';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';

const isDev = !app.isPackaged;

/** Absolute path (or bare command on PATH) for the yt-dlp binary. */
export function getYtDlpPath(): string {
  if (isDev) return 'yt-dlp';
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp_macos';
  return path.join(process.resourcesPath, 'bin', name);
}

/** Absolute path for the ffmpeg binary yt-dlp should use for merging. */
export function getFfmpegPath(): string {
  const fromStatic = (ffmpegStatic as unknown as string) ?? '';
  if (isDev) return fromStatic || 'ffmpeg';
  // In a packaged app the asar-unpacked copy lives beside app.asar.
  return fromStatic.replace('app.asar', 'app.asar.unpacked') || 'ffmpeg';
}
