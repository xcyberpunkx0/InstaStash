// Exposes a minimal, typed `window.instastash` to the renderer. Nothing else
// from Node leaks in (contextIsolation on, nodeIntegration off).
import { contextBridge, ipcRenderer } from 'electron';
import {
  Channels,
  type InstaStashAPI,
  type DownloadInput,
  type Settings,
  type TitleBarColors,
  type ProgressEvent,
  type DoneEvent,
  type ErrorEvent,
} from '../src/shared/ipc';

/** Subscribe to a main→renderer event channel; returns an unsubscribe fn. */
function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: unknown, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: InstaStashAPI = {
  detect: (url) => ipcRenderer.invoke(Channels.detect, url),
  fetchMetadata: (url) => ipcRenderer.invoke(Channels.fetchMetadata, url),
  download: (input: DownloadInput) => ipcRenderer.invoke(Channels.download, input),
  cancel: (jobId) => ipcRenderer.send(Channels.cancel, jobId),

  onProgress: (cb) => subscribe<ProgressEvent>(Channels.progress, cb),
  onDone: (cb) => subscribe<DoneEvent>(Channels.done, cb),
  onError: (cb) => subscribe<ErrorEvent>(Channels.error, cb),

  chooseFolder: () => ipcRenderer.invoke(Channels.chooseFolder),
  revealFile: (filePath) => ipcRenderer.send(Channels.revealFile, filePath),
  getSettings: () => ipcRenderer.invoke(Channels.getSettings),
  setSettings: (patch: Partial<Settings>) => ipcRenderer.invoke(Channels.setSettings, patch),
  setTitleBarColors: (colors: TitleBarColors) => ipcRenderer.send(Channels.setTitleBarColors, colors),
};

contextBridge.exposeInMainWorld('instastash', api);
