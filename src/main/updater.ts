import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import { createLogger } from './utils/logger';

const logger = createLogger('Updater', 'system');

export function initUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    logger.info(`发现新版本: ${info.version}`);
    if (!win.isDestroyed()) {
      win.webContents.send('update:available', { version: info.version });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (!win.isDestroyed()) {
      win.webContents.send('update:progress', { percent: Math.round(progress.percent) });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`新版本已下载: ${info.version}`);
    if (!win.isDestroyed()) {
      win.webContents.send('update:downloaded', { version: info.version });
    }
  });

  autoUpdater.on('error', (error) => {
    logger.error('自动更新错误:', error);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      logger.error('检查更新失败:', error);
    });
  }, 3000);
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
