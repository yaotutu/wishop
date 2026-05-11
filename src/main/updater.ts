import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

export function initUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log(`[Updater] 发现新版本: ${info.version}`);
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
    console.log(`[Updater] 新版本已下载: ${info.version}`);
    if (!win.isDestroyed()) {
      win.webContents.send('update:downloaded', { version: info.version });
    }
  });

  // 网络错误静默忽略，不影响使用
  autoUpdater.on('error', () => {});

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 3000);
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
