import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';
import { createLogger } from './utils/logger';

const logger = createLogger('Updater', 'system');
let updaterInitialized = false;
let targetWindow: BrowserWindow | null = null;

function sendToWindow(channel: string, payload?: unknown): void {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  if (payload === undefined) {
    targetWindow.webContents.send(channel);
    return;
  }
  targetWindow.webContents.send(channel, payload);
}

export function initUpdater(win: BrowserWindow): void {
  targetWindow = win;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  if (updaterInitialized) return;
  updaterInitialized = true;

  autoUpdater.on('update-available', (info) => {
    logger.info(`发现新版本: ${info.version}`);
    sendToWindow('update:available', { version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    logger.info('当前已是最新版本');
    sendToWindow('update:not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToWindow('update:progress', { percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`新版本已下载: ${info.version}`);
    sendToWindow('update:downloaded', { version: info.version });
  });

  autoUpdater.on('error', (error) => {
    logger.error('自动更新错误:', error);
    sendToWindow('update:error', error?.message || String(error));
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      logger.error('检查更新失败:', error);
    });
  }, 3000);
}

export async function checkForUpdates(): Promise<void> {
  await autoUpdater.checkForUpdates();
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
