import dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerHandlers } from './ipc/handler';
import { startAllTasks, stopAllTasks } from './scheduler/listing-scheduler';
import { cleanOldLogs } from './store';
import { initUpdater, quitAndInstall, checkForUpdates } from './updater';
import { closeBrowserWindow, flushBrowserSession } from './browser/browser-window';
import { log } from './utils/logger';

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

  ipcMain.handle('update:check', async () => {
    await checkForUpdates();
  });

  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });
}

app.whenReady().then(() => {
  // 初始化 electron-log
  log.initialize();
  log.transports.file.resolvePathFn = (vars) => path.join(vars.userData, 'logs', 'main.log');
  log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB

  log.transports.console.format = ({ data, message }) => {
    const prefix = message.scope ? `[${message.scope}] ` : '';
    return [`${prefix}`, ...data];
  };

  log.transports.file.format = ({ data, level, message }) => {
    const ts = message.date.toISOString().slice(0, 19);
    const scope = message.scope ? `[${message.scope}] ` : '';
    const text = data.map(d => typeof d === 'string' ? d : JSON.stringify(d)).join(' ');
    return [`[${ts}] [${level}] ${scope}${text}`];
  };

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
  closeBrowserWindow();
});

app.on('will-quit', async (e) => {
  e.preventDefault();
  try {
    await flushBrowserSession();
  } catch {}
  app.exit(0);
});
