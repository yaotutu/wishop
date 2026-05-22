import { ipcMain } from 'electron';
import { getOrderAssociations, setOrderAssociation } from '../../store';
import type { OrderAssociation } from '../../../shared/types';

export function registerOrderAssociationHandlers(): void {
  ipcMain.handle('orderAssociations:list', (_, accountId: string): OrderAssociation[] => {
    return getOrderAssociations(accountId);
  });

  ipcMain.handle(
    'orderAssociations:set',
    (_, accountId: string, orderId: string, input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>): OrderAssociation => {
      return setOrderAssociation(accountId, orderId, input);
    },
  );
}
