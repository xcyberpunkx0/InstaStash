// Downloads the yt-dlp binary for the CURRENT platform into
// resources/bin/<platform>/ so electron-builder can bundle it. Run on each OS
// (locally for Windows, on the macOS CI runner for the Mac build).
//
// ffmpeg is NOT fetched here — it comes from the `ffmpeg-static` npm package,
// which already ships the right binary per platform and is asar-unpacked.
import { mkdir, chmod } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

const YTDLP = {
  win32: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
  darwin: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
  linux: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
};

const plat = process.platform;
const url = YTDLP[plat];
if (!url) {
  console.error(`[fetch-binaries] unsupported platform: ${plat}`);
  process.exit(1);
}

const name = path.basename(new URL(url).pathname);
const destDir = path.join('resources', 'bin', plat);
const dest = path.join(destDir, name);

await mkdir(destDir, { recursive: true });
console.log(`[fetch-binaries] downloading ${url}`);

const res = await fetch(url, { redirect: 'follow' });
if (!res.ok || !res.body) {
  console.error(`[fetch-binaries] download failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}

await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
if (plat !== 'win32') await chmod(dest, 0o755);

console.log(`[fetch-binaries] saved ${dest}`);
