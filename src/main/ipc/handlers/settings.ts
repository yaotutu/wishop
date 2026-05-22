import { ipcMain } from 'electron';
import type { AppSettings, AppSettingsPatch } from '../../../shared/settings';
import { getAppSettings, updateAppSettings } from '../../store';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (): AppSettings => {
    return getAppSettings();
  });

  ipcMain.handle('settings:update', (_, patch: AppSettingsPatch): AppSettings => {
    return updateAppSettings(patch);
  });
}
