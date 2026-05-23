import { ipcMain } from 'electron';
import { syncModuleKeySchema, syncModuleSettingSchema, type SyncModuleKey, type SyncSettings } from '../../../shared/sync';
import { getSyncSettings, updateSyncModuleSetting } from '../../store';

export function registerSyncHandlers(): void {
  ipcMain.handle('sync:getSettings', (): SyncSettings => {
    return getSyncSettings();
  });

  ipcMain.handle('sync:updateModuleSetting', (_, module: SyncModuleKey, patch: unknown): SyncSettings => {
    const parsedModule = syncModuleKeySchema.parse(module);
    const parsedPatch = syncModuleSettingSchema.partial().parse(patch);
    return updateSyncModuleSetting(parsedModule, parsedPatch);
  });

  ipcMain.handle('sync:getStatus', () => {
    return {
      connected: false,
      message: '未连接云服务',
      settings: getSyncSettings(),
    };
  });
}

