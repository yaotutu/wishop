import { ipcMain } from 'electron';
import { getProductSources, removeProductSource, setProductSources } from '../../store';
import type { ProductSourceBinding, ProductSourceItem } from '../../../shared/types';

export function registerProductSourceHandlers(): void {
  ipcMain.handle('productSources:list', (_, accountId: string): ProductSourceBinding[] => {
    return getProductSources(accountId);
  });

  ipcMain.handle('productSources:set', (_, accountId: string, productId: string, sources: ProductSourceItem[]): ProductSourceBinding => {
    return setProductSources(accountId, productId, sources);
  });

  ipcMain.handle('productSources:remove', (_, accountId: string, productId: string, sourceId: string): ProductSourceBinding => {
    return removeProductSource(accountId, productId, sourceId);
  });
}
