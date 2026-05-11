import { ipcMain } from 'electron';
import { getConfig } from '../../store';
import { createWeChatClient } from '../../wechat/client';

export function registerQuotaHandlers(): void {
  ipcMain.handle('quota:get', async (_, accountId: string) => {
    const api = createWeChatClient(getConfig(accountId));
    return api.getAuditQuota();
  });
}
