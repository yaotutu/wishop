import { ipcMain } from 'electron';
import type { AppSettings, AppSettingsPatch } from '../../../shared/settings';
import { getAppSettings, updateAppSettings } from '../../store';
import { reconcileScheduledJobDefinition } from '../../scheduler/scheduled-job-runner';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (): AppSettings => {
    return getAppSettings();
  });

  ipcMain.handle('settings:update', (_, patch: AppSettingsPatch): AppSettings => {
    const settings = updateAppSettings(patch);
    reconcileScheduledJobDefinition('orders.checkShipmentStatus');
    return settings;
  });
}
