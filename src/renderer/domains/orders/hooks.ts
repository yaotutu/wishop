import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Order,
  OrderAddressInfo,
  OrderAssociation,
  OrderRealAddressCache,
  OrderSearchParams,
  OrderStatus,
  OrderTimeScope,
  ProductSourceBinding,
  ProductSourceItem,
} from '../../../shared/orders';
import { isCredentialError } from '../../../shared/errors';
import { useCredentialError } from '../../contexts/CredentialErrorContext';
import { ordersClient } from './client';

function mapProductSources(bindings: ProductSourceBinding[] = []): Record<string, ProductSourceItem[]> {
  return Object.fromEntries(bindings.map(binding => [binding.productId, binding.sources]));
}

function mapAssociations(associations: OrderAssociation[] = []): Record<string, OrderAssociation> {
  return Object.fromEntries(associations.map(association => [association.orderId, association]));
}

function mapAddressCaches(caches: OrderRealAddressCache[] = []): Record<string, OrderRealAddressCache> {
  return Object.fromEntries(caches.map(cache => [cache.orderId, cache]));
}

export function useOrders(accountId: string) {
  const queryClient = useQueryClient();
  const { reportCredentialError } = useCredentialError();
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef<OrderStatus | undefined>(undefined);
  const timeScopeRef = useRef<OrderTimeScope>('all');
  const fetchIdRef = useRef(0);
  const queryKey = ['orders', accountId, 'list'];

  const query = useQuery({
    queryKey,
    enabled: false,
    initialData: [] as Order[],
    queryFn: async () => {
      const result = await ordersClient.list(accountId, statusRef.current, 50, true, timeScopeRef.current);
      setHasMore(result.hasMore);
      return result.orders;
    },
  });

  const handleError = useCallback((err: unknown, fallback: string) => {
    if (isCredentialError(err)) reportCredentialError(err);
    setError(err instanceof Error ? err.message : fallback);
  }, [reportCredentialError]);

  const fetchOrders = useCallback(async (
    status?: OrderStatus,
    append = false,
    timeScope: OrderTimeScope = timeScopeRef.current,
  ) => {
    if (!accountId) return;
    const fetchId = ++fetchIdRef.current;
    setError(null);
    statusRef.current = status;
    timeScopeRef.current = timeScope;

    try {
      if (!append) {
        await query.refetch();
        return;
      }
      const result = await ordersClient.list(accountId, status, 50, false, timeScope);
      if (fetchIdRef.current !== fetchId) return;
      queryClient.setQueryData<Order[]>(queryKey, previous => [...(previous || []), ...result.orders]);
      setHasMore(result.hasMore);
    } catch (err: unknown) {
      if (fetchIdRef.current !== fetchId) return;
      handleError(err, '获取订单列表失败');
    }
  }, [accountId, handleError, query, queryClient, queryKey]);

  const fetchOrderDetail = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      return await ordersClient.detail(accountId, orderId);
    } catch (err: unknown) {
      handleError(err, '获取订单详情失败');
      return null;
    }
  }, [accountId, handleError]);

  const searchOrders = useCallback(async (params: OrderSearchParams) => {
    if (!accountId) return;
    const fetchId = ++fetchIdRef.current;
    setError(null);
    try {
      const result = await ordersClient.search(accountId, params);
      if (fetchIdRef.current !== fetchId) return;
      queryClient.setQueryData<Order[]>(queryKey, result.orders);
      setHasMore(result.hasMore);
    } catch (err: unknown) {
      if (fetchIdRef.current !== fetchId) return;
      handleError(err, '搜索订单失败');
    }
  }, [accountId, handleError, queryClient, queryKey]);

  const decodeAddress = useCallback(async (orderId: string): Promise<OrderAddressInfo | null> => {
    try {
      return await ordersClient.decodeAddress(accountId, orderId);
    } catch (err: unknown) {
      handleError(err, '解密收货信息失败');
      return null;
    }
  }, [accountId, handleError]);

  return {
    orders: query.data || [],
    hasMore,
    loading: query.isFetching,
    error,
    clearError: () => setError(null),
    fetchOrders,
    fetchOrderDetail,
    searchOrders,
    decodeAddress,
  };
}

export function useProductSources(accountId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['orders', accountId, 'productSources'],
    enabled: !!accountId,
    queryFn: () => ordersClient.productSources.list(accountId),
  });
  const saveMutation = useMutation({
    mutationFn: ({ productId, sources }: { productId: string; sources: ProductSourceItem[] }) =>
      ordersClient.productSources.save(accountId, productId, sources),
    onSuccess: (binding) => {
      queryClient.setQueryData<ProductSourceBinding[]>(['orders', accountId, 'productSources'], previous => {
        const current = previous || [];
        return binding.sources.length > 0
          ? [...current.filter(item => item.productId !== binding.productId), binding]
          : current.filter(item => item.productId !== binding.productId);
      });
    },
  });

  return {
    productSources: useMemo(() => mapProductSources(query.data), [query.data]),
    loading: query.isLoading,
    fetchProductSources: () => query.refetch(),
    saveProductSources: (productId: string, sources: ProductSourceItem[]) => saveMutation.mutateAsync({ productId, sources }),
  };
}

export function useOrderAssociations(accountId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['orders', accountId, 'associations'],
    enabled: !!accountId,
    queryFn: () => ordersClient.associations.list(accountId),
  });
  const saveMutation = useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'> }) =>
      ordersClient.associations.save(accountId, orderId, input),
    onSuccess: (association) => {
      queryClient.setQueryData<OrderAssociation[]>(['orders', accountId, 'associations'], previous => {
        const current = previous || [];
        return association.internalRemark || association.linkedOrders.length > 0
          ? [...current.filter(item => item.orderId !== association.orderId), association]
          : current.filter(item => item.orderId !== association.orderId);
      });
    },
  });

  return {
    orderAssociations: useMemo(() => mapAssociations(query.data), [query.data]),
    fetchAssociations: () => query.refetch(),
    saveAssociation: (orderId: string, input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>) =>
      saveMutation.mutateAsync({ orderId, input }),
  };
}

export function useRealAddressCaches(accountId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['orders', accountId, 'realAddressCaches'],
    enabled: !!accountId,
    queryFn: () => ordersClient.realAddresses.list(accountId),
  });
  const fetchAddressMutation = useMutation({
    mutationFn: ({ orderId, refresh }: { orderId: string; refresh: boolean }) =>
      ordersClient.realAddresses.fetch(accountId, orderId, refresh),
    onSuccess: (cache) => {
      queryClient.setQueryData<OrderRealAddressCache[]>(['orders', accountId, 'realAddressCaches'], previous => {
        const current = previous || [];
        return [...current.filter(item => item.orderId !== cache.orderId), cache];
      });
    },
  });

  return {
    realAddressCaches: useMemo(() => mapAddressCaches(query.data), [query.data]),
    fetchCaches: () => query.refetch(),
    fetchRealAddress: (orderId: string, refresh = false) => fetchAddressMutation.mutateAsync({ orderId, refresh }),
  };
}
