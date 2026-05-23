import dotenv from 'dotenv';
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerHandlers } from './ipc/handler';
import { reconcileDefaultScheduledJobs, startAllScheduledJobs, stopAllScheduledJobs } from './scheduler/scheduled-job-runner';
import { registerCoreScheduledJobs } from './scheduler/scheduled-job-definitions';
import { cleanOldLogs } from './store';
import { initUpdater } from './updater';
import { flushBrowserSessionWithTimeout, setBrowserQuitting } from './browser/browser-window';
import { log } from './utils/logger';

dotenv.config();

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
      webviewTag: true,
    },
  });

  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences) => {
    webPreferences.preload = path.join(__dirname, '..', 'preload', 'taobao-browser.js');
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });
  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    webContents.setWindowOpenHandler(({ url }) => {
      if (url) webContents.loadURL(url);
      return { action: 'deny' };
    });
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
  registerCoreScheduledJobs();
  reconcileDefaultScheduledJobs({ start: false });
  registerHandlers();
  createWindow();
  startAllScheduledJobs(() => mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopAllScheduledJobs();
});

app.on('before-quit', () => {
  setBrowserQuitting(true);
});

app.on('will-quit', async (e) => {
  e.preventDefault();
  try {
    const flushed = await flushBrowserSessionWithTimeout('baseline', 3000);
    if (!flushed) {
      log.scope('Browser').warn('刷新淘宝浏览器会话超时，继续退出');
    }
  } catch (error) {
    log.scope('Browser').warn('刷新淘宝浏览器会话失败', error);
  }
  app.exit(0);
});
