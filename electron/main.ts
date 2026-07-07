// Electron entry point: creates the window, loads the UI (next dev server in
// development, the static export in production), and registers IPC + the media
// protocol.
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerMediaScheme, handleMediaProtocol } from './media-protocol';
import { registerIpc } from './ipc/register';

const isDev = !!process.env.ELECTRON_DEV;
const DEV_URL = `http://localhost:${process.env.ELECTRON_DEV_PORT || 3000}`;

// Privileged scheme registration must happen before the app is ready.
registerMediaScheme();

function createWindow(): void {
  const win = new BrowserWindow({
    // Always open wider than 1280px, and never let it shrink below that.
    width: 1360,
    height: 860,
    minWidth: 1281,
    minHeight: 720,
    backgroundColor: '#EFE9E1',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  registerIpc(win);

  if (isDev) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Static export produced by `next build` (output: 'export') → out/index.html
    win.loadFile(path.join(app.getAppPath(), 'out', 'index.html'));
  }
}

app.whenReady().then(() => {
  handleMediaProtocol();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
