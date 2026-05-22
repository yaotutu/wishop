import { ipcMain } from 'electron';
import { getClient } from '../../wxshop/client-registry';
import { getRealAddressCache, getRealAddressCaches, setRealAddressCache } from '../../store';
import type { OrderRealAddressCache } from '../../../shared/types';

export function registerRealAddressHandlers(): void {
  ipcMain.handle('orderRealAddresses:list', (_, accountId: string): OrderRealAddressCache[] => {
    return getRealAddressCaches(accountId);
  });

  ipcMain.handle('orderRealAddresses:get', (_, accountId: string, orderId: string): OrderRealAddressCache | null => {
    return getRealAddressCache(accountId, orderId);
  });

  ipcMain.handle('orderRealAddresses:fetch', async (_, accountId: string, orderId: string): Promise<OrderRealAddressCache> => {
    const existing = getRealAddressCache(accountId, orderId);
    if (existing) return existing;
    const address = await getClient(accountId).decodeOrderSensitiveInfo(orderId);
    return setRealAddressCache(accountId, orderId, address);
  });

  ipcMain.handle('orderRealAddresses:refresh', async (_, accountId: string, orderId: string): Promise<OrderRealAddressCache> => {
    const address = await getClient(accountId).decodeOrderSensitiveInfo(orderId);
    return setRealAddressCache(accountId, orderId, address);
  });
}
