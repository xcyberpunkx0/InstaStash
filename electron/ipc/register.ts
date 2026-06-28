// Wires every IPC channel to its implementation. Most handlers reuse the
// existing src/lib logic verbatim — we're just calling it over IPC instead of
// HTTP.
import { ipcMain, dialog, shell, type BrowserWindow } from 'electron';
import { platformDetector, isDetectSuccess } from '@/lib/platform-detector';
import { VideoFetcher, VideoFetchError } from '@/lib/video-fetcher';
import { getSettings, setSettings } from '../settings';
import { startDownload, cancelDownload } from './download';
import { Channels, type DetectResult, type FetchResult, type DownloadInput, type Settings } from '@/shared/ipc';

const SUPPORTED = ['instagram.com/reel/…', 'youtube.com/watch?v=…', 'youtu.be/…'];

export function registerIpc(win: BrowserWindow): void {
  ipcMain.handle(Channels.detect, async (_e, url: string): Promise<DetectResult> => {
    const detection = platformDetector.detect(typeof url === 'string' ? url.trim() : '');
    if (isDetectSuccess(detection)) {
      return {
        ok: true,
        data: {
          platform: detection.platform,
          contentType: detection.contentType,
          videoId: detection.videoId,
          normalizedUrl: detection.normalizedUrl,
        },
      };
    }
    return {
      ok: false,
      error: {
        error: 'Only Instagram and YouTube video URLs are supported.',
        code: 'UNSUPPORTED_PLATFORM',
        supportedPlatforms: SUPPORTED,
      },
    };
  });

  ipcMain.handle(Channels.fetchMetadata, async (_e, url: string): Promise<FetchResult> => {
    const trimmed = typeof url === 'string' ? url.trim() : '';
    const detection = platformDetector.detect(trimmed);
    if (!isDetectSuccess(detection)) {
      return { ok: false, error: { error: 'Unsupported URL.', code: 'NETWORK_ERROR' } };
    }
    try {
      const meta = await new VideoFetcher().fetchMetadata(detection.normalizedUrl, detection.platform);
      return { ok: true, data: meta };
    } catch (err) {
      if (err instanceof VideoFetchError) {
        return { ok: false, error: { error: err.message, code: err.code, retryAfter: err.retryAfter } };
      }
      return { ok: false, error: { error: 'Unexpected error fetching video.', code: 'NETWORK_ERROR' } };
    }
  });

  ipcMain.handle(Channels.download, (_e, input: DownloadInput) => startDownload(win.webContents, input));
  ipcMain.on(Channels.cancel, (_e, jobId: string) => cancelDownload(jobId));

  ipcMain.handle(Channels.chooseFolder, async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  ipcMain.on(Channels.revealFile, (_e, filePath: string) => {
    if (typeof filePath === 'string' && filePath) shell.showItemInFolder(filePath);
  });

  ipcMain.handle(Channels.getSettings, () => getSettings());
  ipcMain.handle(Channels.setSettings, (_e, patch: Partial<Settings>) => setSettings(patch));
}
