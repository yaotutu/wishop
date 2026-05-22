import { useCallback, useEffect, useState } from 'react';
import type { ProductSourceBinding, ProductSourceItem } from '../../shared/types';

export function useProductSources(accountId: string) {
  const [bindings, setBindings] = useState<Record<string, ProductSourceItem[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchProductSources = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.productSources.list(accountId);
      setBindings(Object.fromEntries(result.map((binding: ProductSourceBinding) => [binding.productId, binding.sources])));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const saveProductSources = useCallback(async (productId: string, sources: ProductSourceItem[]) => {
    const binding = await window.electronAPI.productSources.set(accountId, productId, sources);
    setBindings(prev => ({ ...prev, [binding.productId]: binding.sources }));
    return binding;
  }, [accountId]);

  useEffect(() => {
    void fetchProductSources();
  }, [fetchProductSources]);

  return { productSources: bindings, loading, fetchProductSources, saveProductSources };
}
