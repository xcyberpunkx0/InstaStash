// Electron entry point: creates the window, loads the UI (next dev server in
// development, the static export in production), and registers IPC + the media
// protocol.
import { app, BrowserWindow, Menu, protocol } from 'electron';
import path from 'node:path';
import { MEDIA_SCHEME_SPEC, handleMediaProtocol } from './media-protocol';
import { APP_SCHEME_SPEC, APP_URL, handleAppProtocol } from './app-protocol';
import { registerIpc } from './ipc/register';
import { TITLEBAR_HEIGHT } from '@/shared/ipc';

const isDev = !!process.env.ELECTRON_DEV;
const DEV_URL = `http://localhost:${process.env.ELECTRON_DEV_PORT || 3000}`;

// Privileged scheme registration must happen before the app is ready, and
// registerSchemesAsPrivileged may only be called once.
protocol.registerSchemesAsPrivileged([MEDIA_SCHEME_SPEC, APP_SCHEME_SPEC]);

// Drop the default File/Edit/View menu bar in production on Windows/Linux,
// where it renders inside the window. macOS keeps its system menu bar — it
// also provides the standard clipboard shortcuts. Dev keeps the menu for the
// reload/devtools accelerators.
if (!isDev && process.platform !== 'darwin') {
  Menu.setApplicationMenu(null);
}

function createWindow(): void {
  const win = new BrowserWindow({
    // Always open wider than 1280px, and never let it shrink below that.
    width: 1360,
    height: 860,
    minWidth: 1281,
    minHeight: 720,
    // Matches the default Aurora theme's canvas so the first paint doesn't flash.
    backgroundColor: '#FAFBFC',
    show: false,
    // Frameless with native window controls overlaid on the web content, so
    // the title bar area is painted by the UI and merges with the theme
    // (WhatsApp-desktop style). The renderer draws a matching drag strip and
    // re-tints the controls via IPC when the theme changes.
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#FAFBFC',
      symbolColor: '#0F1117',
      height: TITLEBAR_HEIGHT,
    },
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
    // Static export produced by `next build` (output: 'export'), served over
    // the app scheme so its root-absolute /_next/* asset URLs resolve.
    win.loadURL(APP_URL);
  }
}

// Ties taskbar grouping/pinning and notifications to the installed shortcut.
if (process.platform === 'win32') app.setAppUserModelId('com.instastash.app');

app.whenReady().then(() => {
  handleMediaProtocol();
  handleAppProtocol();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
