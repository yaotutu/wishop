import { ipcMain } from 'electron';
import type { ProductSourceItem } from '../../../shared/types';
import { getProductSources, removeProductSource, setProductSources } from '../../store';

export function registerProductSourceHandlers(): void {
  ipcMain.handle('productSources:list', async (_, accountId: string) => getProductSources(accountId));
  ipcMain.handle('productSources:set', async (_, accountId: string, productId: string, sources: ProductSourceItem[]) =>
    setProductSources(accountId, productId, sources));
  ipcMain.handle('productSources:remove', async (_, accountId: string, productId: string, sourceId: string) =>
    removeProductSource(accountId, productId, sourceId));
}
