import { ipcMain } from 'electron';
import { cloudRuntime } from '../../services/cloud-sync-service';

export function registerCloudTaskHandlers(): void {
  ipcMain.handle('cloudTasks:getCapabilities', () => {
    return cloudRuntime.tasks.getCapabilities();
  });

  ipcMain.handle('cloudTasks:getStatus', () => {
    return cloudRuntime.tasks.getStatus();
  });
}

