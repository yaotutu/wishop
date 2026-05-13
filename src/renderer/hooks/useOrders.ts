import { useState, useCallback } from 'react';
import type { Order, OrderStatus, OrderSearchParams, OrderAddressInfo } from '../../shared/types';
import { useIpcFetch } from './useIpcFetch';

export function useOrders(accountId: string) {
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: orders, loading, setData: setOrders } = useIpcFetch<Order[]>(
    accountId,
    useCallback(async () => {
      const result = await window.electronAPI.orders.list(accountId);
      setHasMore(result.hasMore);
      return result.orders;
    }, [accountId]),
    [],
    { autoFetch: false },
  );

  const fetchOrders = useCallback(async (status?: OrderStatus, append = false) => {
    if (!accountId) return;
    setError(null);
    try {
      const result = await window.electronAPI.orders.list(accountId, status);
      if (append) {
        setOrders(prev => [...prev, ...result.orders]);
      } else {
        setOrders(result.orders);
      }
      setHasMore(result.hasMore);
    } catch (err: any) {
      setError(err.message || '获取订单列表失败');
    }
  }, [accountId, setOrders]);

  const fetchOrderDetail = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      return await window.electronAPI.orders.detail(accountId, orderId);
    } catch (err: any) {
      setError(err.message || '获取订单详情失败');
      return null;
    }
  }, [accountId]);

  const searchOrders = useCallback(async (params: OrderSearchParams) => {
    if (!accountId) return;
    setError(null);
    try {
      const result = await window.electronAPI.orders.search(accountId, params);
      setOrders(result.orders);
      setHasMore(result.hasMore);
    } catch (err: any) {
      setError(err.message || '搜索订单失败');
    }
  }, [accountId, setOrders]);

  const decodeAddress = useCallback(async (orderId: string): Promise<OrderAddressInfo | null> => {
    try {
      return await window.electronAPI.orders.decodeAddress(accountId, orderId);
    } catch (err: any) {
      setError(err.message || '解密收货信息失败');
      return null;
    }
  }, [accountId]);

  return { orders, hasMore, loading, error, fetchOrders, fetchOrderDetail, searchOrders, decodeAddress };
}
