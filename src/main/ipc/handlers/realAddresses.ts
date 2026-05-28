import { ipcMain } from 'electron';
import { getRealAddressCache, getRealAddressCaches, setRealAddressCache } from '../../store';
import { getClient } from '../../wxshop/client-registry';

export function registerRealAddressHandlers(): void {
  ipcMain.handle('orderRealAddresses:list', async (_, accountId: string) => getRealAddressCaches(accountId));
  ipcMain.handle('orderRealAddresses:get', async (_, accountId: string, orderId: string) => getRealAddressCache(accountId, orderId));
  ipcMain.handle('orderRealAddresses:fetch', async (_, accountId: string, orderId: string) => {
    const cached = getRealAddressCache(accountId, orderId);
    if (cached) return cached;
    const address = await getClient(accountId).decodeOrderSensitiveInfo(orderId);
    return setRealAddressCache(accountId, orderId, address);
  });
  ipcMain.handle('orderRealAddresses:refresh', async (_, accountId: string, orderId: string) => {
    const address = await getClient(accountId).decodeOrderSensitiveInfo(orderId);
    return setRealAddressCache(accountId, orderId, address);
  });
}
