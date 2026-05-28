import { ipcMain } from 'electron';
import type { AppSettingsPatch } from '../../../shared/settings';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from '../../../shared/settings';
import { readStore, writeStore } from '../../store';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async () => normalizeAppSettings(readStore().appSettings || DEFAULT_APP_SETTINGS));
  ipcMain.handle('settings:update', async (_, patch: AppSettingsPatch) => {
    const next = normalizeAppSettings({ ...readStore().appSettings, ...patch });
    writeStore({ appSettings: next });
    return next;
  });
}
