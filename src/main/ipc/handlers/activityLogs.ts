import { BrowserWindow, ipcMain } from 'electron';
import { activityLogEmitter, clearActivityLogs, listActivityLogs } from '../../activity-logs/activity-log-service';

export function registerActivityLogHandlers(): void {
  ipcMain.handle('activityLogs:list', async () => listActivityLogs());
  ipcMain.handle('activityLogs:clear', async () => clearActivityLogs());

  activityLogEmitter.on('activityLog:added', (log) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('activityLog:added', log);
    }
  });
}
