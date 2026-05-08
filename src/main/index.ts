import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerHandlers } from './ipc/handler';
import { startScheduler, stopScheduler } from './scheduler/listing-scheduler';
import { cleanOldLogs, getScheduler } from './store';

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

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  cleanOldLogs();
  registerHandlers();

  const scheduler = getScheduler();
  if (scheduler.enabled) {
    startScheduler();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopScheduler();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
