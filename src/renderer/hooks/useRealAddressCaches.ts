import { useCallback, useEffect, useState } from 'react';
import type { OrderRealAddressCache } from '../../shared/types';

export function useRealAddressCaches(accountId: string) {
  const [caches, setCaches] = useState<Record<string, OrderRealAddressCache>>({});

  const fetchCaches = useCallback(async () => {
    if (!accountId) return;
    const result = await window.electronAPI.orderRealAddresses.list(accountId);
    setCaches(Object.fromEntries(result.map((cache: OrderRealAddressCache) => [cache.orderId, cache])));
  }, [accountId]);

  const fetchRealAddress = useCallback(async (orderId: string, refresh = false) => {
    const cache = refresh
      ? await window.electronAPI.orderRealAddresses.refresh(accountId, orderId)
      : await window.electronAPI.orderRealAddresses.fetch(accountId, orderId);
    setCaches(prev => ({ ...prev, [cache.orderId]: cache }));
    return cache;
  }, [accountId]);

  useEffect(() => {
    void fetchCaches();
  }, [fetchCaches]);

  return { realAddressCaches: caches, fetchCaches, fetchRealAddress };
}
