import { ipcMain } from 'electron';
import { getClient } from '../../wxshop/client-registry';
import type { Order, OrderListParams, OrderSearchParams, OrderStatus, OrderAddressInfo } from '../../../shared/types';

interface OrderPaginationState {
  nextKey: string;
  hasMore: boolean;
  currentStatus?: OrderStatus;
  timeRange?: { start_time: number; end_time: number };
}

function makeTimeRange(): { start_time: number; end_time: number } {
  const now = Math.floor(Date.now() / 1000);
  return { start_time: now - 7 * 24 * 3600, end_time: now };
}

export function registerOrderHandlers(context: { orderPaginationMap: Map<string, OrderPaginationState> }): void {
  ipcMain.handle('orders:list', async (_, accountId: string, status?: OrderStatus, pageSize?: number): Promise<{ orders: Order[]; hasMore: boolean }> => {
    const existing = context.orderPaginationMap.get(accountId);
    const isReset = !existing || existing.currentStatus !== status;
    const pag: OrderPaginationState = isReset
      ? { nextKey: '', hasMore: true, currentStatus: status, timeRange: makeTimeRange() }
      : existing;
    if (isReset) context.orderPaginationMap.set(accountId, pag);

    if (!pag.hasMore) {
      return { orders: [], hasMore: false };
    }

    const api = getClient(accountId);

    const params: OrderListParams = {
      page_size: pageSize || 10,
      next_key: pag.nextKey || undefined,
      status,
      update_time_range: pag.timeRange,
    };
    const listResult = await api.getOrderList(params);

    const orders: Order[] = [];
    for (const orderId of listResult.order_id_list) {
      try {
        const order = await api.getOrderDetail(orderId);
        orders.push(order);
      } catch (error) {
        console.error(`[Orders] 获取订单 ${orderId} 详情失败:`, error);
      }
    }

    pag.nextKey = listResult.next_key;
    pag.hasMore = listResult.has_more;

    return { orders, hasMore: pag.hasMore };
  });

  ipcMain.handle('orders:detail', async (_, accountId: string, orderId: string): Promise<Order> => {
    const api = getClient(accountId);
    return api.getOrderDetail(orderId);
  });

  ipcMain.handle('orders:search', async (_, accountId: string, searchParams: OrderSearchParams): Promise<{ orders: Order[]; hasMore: boolean }> => {
    const api = getClient(accountId);
    const listResult = await api.searchOrders(searchParams);

    const orders: Order[] = [];
    for (const orderId of listResult.order_id_list) {
      try {
        const order = await api.getOrderDetail(orderId);
        orders.push(order);
      } catch (error) {
        console.error(`[Orders] 获取订单 ${orderId} 详情失败:`, error);
      }
    }

    return { orders, hasMore: listResult.has_more };
  });

  ipcMain.handle('orders:decodeAddress', async (_, accountId: string, orderId: string): Promise<OrderAddressInfo> => {
    const api = getClient(accountId);
    return api.decodeOrderSensitiveInfo(orderId);
  });
}
