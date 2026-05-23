import { app, ipcMain } from 'electron';
import { checkForUpdates, quitAndInstall } from '../../updater';

export function registerAppSystemHandlers(): void {
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
