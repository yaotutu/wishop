import dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerHandlers } from './ipc/handler';
import { startAllTasks, stopAllTasks } from './scheduler/listing-scheduler';
import { cleanOldLogs } from './store';
import { initUpdater, quitAndInstall } from './updater';
import { flushBrowserSession, setBrowserQuitting } from './browser/browser-window';

dotenv.config();

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
          ],
        },
      });
    });
  }

  mainWindow.maximize();

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  if (app.isPackaged) {
    initUpdater(mainWindow);
  }

  ipcMain.handle('update:install', () => {
    quitAndInstall();
  });

  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });
}

app.whenReady().then(() => {
  cleanOldLogs();
  registerHandlers();
  startAllTasks();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopAllTasks();
});

app.on('before-quit', () => {
  setBrowserQuitting(true);
});

app.on('will-quit', async (e) => {
  e.preventDefault();
  try {
    await flushBrowserSession();
  } catch {}
  app.exit(0);
});
