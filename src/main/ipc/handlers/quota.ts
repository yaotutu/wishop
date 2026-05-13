import { ipcMain } from 'electron';
import { getClient } from '../../wxshop/client-registry';

export function registerQuotaHandlers(): void {
  ipcMain.handle('quota:get', async (_, accountId: string) => {
    const api = getClient(accountId);
    return api.getAuditQuota();
  });
}
