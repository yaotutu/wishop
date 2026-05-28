import { ipcMain } from 'electron';
import type { OrderAssociation } from '../../../shared/types';
import { getOrderAssociations, setOrderAssociation } from '../../store';

export function registerOrderAssociationHandlers(): void {
  ipcMain.handle('orderAssociations:list', async (_, accountId: string) => getOrderAssociations(accountId));
  ipcMain.handle(
    'orderAssociations:set',
    async (_, accountId: string, orderId: string, input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>) =>
      setOrderAssociation(accountId, orderId, input),
  );
}
