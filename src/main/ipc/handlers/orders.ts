import { ipcMain } from 'electron';
import { getClient } from '../../wxshop/client-registry';
import type { Order, OrderListParams, OrderSearchParams, OrderStatus, OrderAddressInfo } from '../../../shared/types';
import { createLogger } from '../../utils/logger';

interface OrderPaginationState {
  nextKey: string;
  hasMore: boolean;
}

function makeTimeRange(): { start_time: number; end_time: number } {
  const now = Math.floor(Date.now() / 1000);
  return { start_time: now - 7 * 24 * 3600, end_time: now };
}

export function registerOrderHandlers(context: { orderPaginationMap: Map<string, OrderPaginationState> }): void {
  ipcMain.handle('orders:list', async (_, accountId: string, status?: OrderStatus, pageSize?: number): Promise<{ orders: Order[]; hasMore: boolean }> => {
    const logger = createLogger('Orders', accountId);
    const paginationKey = `${accountId}:${status ?? 'all'}`;
    let pag = context.orderPaginationMap.get(paginationKey);
    if (!pag) {
      pag = { nextKey: '', hasMore: true };
      context.orderPaginationMap.set(paginationKey, pag);
    }

    if (!pag.hasMore) {
      return { orders: [], hasMore: false };
    }

    const api = getClient(accountId);
    const timeRange = makeTimeRange();

    const params: OrderListParams = {
      page_size: pageSize || 10,
      next_key: pag.nextKey || undefined,
      status,
      update_time_range: timeRange,
    };
    const listResult = await api.getOrderList(params);

    const detailPromises = listResult.order_id_list.map(orderId =>
      api.getOrderDetail(orderId).catch(error => {
        logger.error(`获取订单 ${orderId} 详情失败:`, error);
        return null;
      })
    );
    const settled = await Promise.allSettled(detailPromises);
    const orders = settled
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter((o): o is Order => o !== null);

    pag.nextKey = listResult.next_key;
    pag.hasMore = listResult.has_more;

    return { orders, hasMore: pag.hasMore };
  });

  ipcMain.handle('orders:detail', async (_, accountId: string, orderId: string): Promise<Order> => {
    const api = getClient(accountId);
    return api.getOrderDetail(orderId);
  });

  ipcMain.handle('orders:search', async (_, accountId: string, searchParams: OrderSearchParams): Promise<{ orders: Order[]; hasMore: boolean }> => {
    const logger = createLogger('Orders', accountId);
    const api = getClient(accountId);
    const listResult = await api.searchOrders(searchParams);

    const detailPromises = listResult.order_id_list.map(orderId =>
      api.getOrderDetail(orderId).catch(error => {
        logger.error(`获取订单 ${orderId} 详情失败:`, error);
        return null;
      })
    );
    const settled = await Promise.allSettled(detailPromises);
    const orders = settled
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter((o): o is Order => o !== null);

    return { orders, hasMore: listResult.has_more };
  });

  ipcMain.handle('orders:decodeAddress', async (_, accountId: string, orderId: string): Promise<OrderAddressInfo> => {
    const api = getClient(accountId);
    return api.decodeOrderSensitiveInfo(orderId);
  });
}
