import { ipcMain } from 'electron';
import type { Order, OrderAddressInfo, OrderListFilters, OrderScope, OrderSearchParams, OrderSearchSource } from '../../../shared/types';
import { orderDomainService } from '../../orders/order-domain';
import { getClient } from '../../wxshop/client-registry';

export function registerOrderHandlers(): void {
  ipcMain.handle('orders:list', async (_, scope: OrderScope, filters?: OrderListFilters) => {
    return orderDomainService.list(scope, filters);
  });

  ipcMain.handle('orders:detail', async (_, accountId: string, orderId: string, options?: { refresh?: boolean }): Promise<Order> => {
    return orderDomainService.detail(accountId, orderId, options);
  });

  ipcMain.handle('orders:search', async (_, scope: OrderScope, params: OrderSearchParams, source: OrderSearchSource) => {
    return orderDomainService.search(scope, params, source);
  });

  ipcMain.handle('orders:refresh', async (_, scope: OrderScope) => {
    return orderDomainService.refresh(scope);
  });

  ipcMain.handle('orders:syncState', async (_, scope: OrderScope) => {
    return orderDomainService.syncState(scope);
  });

  ipcMain.handle('orders:decodeAddress', async (_, accountId: string, orderId: string): Promise<OrderAddressInfo> => {
    return getClient(accountId).decodeOrderSensitiveInfo(orderId);
  });

  ipcMain.handle('orders:listDeliveryCompanies', async (_, accountId: string) => {
    const companies = await getClient(accountId).getDeliveryCompanyList(false);
    return companies.map(company => ({
      deliveryId: company.delivery_id,
      deliveryName: company.delivery_name,
    }));
  });
}
