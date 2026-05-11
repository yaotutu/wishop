import { ipcMain } from 'electron';
import { getConfig, setConfig } from '../../store';
import type { Config } from '../../../shared/types';
import { createWeChatClient } from '../../wechat/client';

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', (_, accountId: string): Config => {
    return getConfig(accountId);
  });

  ipcMain.handle('config:set', async (_, accountId: string, config: Config): Promise<{ success: boolean; error?: string }> => {
    setConfig(accountId, config);
    try {
      const api = createWeChatClient(config);
      await api.getAccessToken();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
