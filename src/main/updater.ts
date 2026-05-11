import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

export function initUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log(`[Updater] 发现新版本: ${info.version}`);
    win.webContents.send('update:available', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] 下载进度: ${progress.percent.toFixed(1)}%`);
    win.webContents.send('update:progress', { percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[Updater] 新版本已下载: ${info.version}`);
    win.webContents.send('update:downloaded', { version: info.version });
  });

  autoUpdater.on('error', (error) => {
    console.error('[Updater] 错误:', error?.message);
  });

  // 启动后延迟 3 秒检查更新
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[Updater] 检查更新失败:', err.message);
    });
  }, 3000);
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
