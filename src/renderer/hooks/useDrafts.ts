import { useState, useCallback } from 'react';
import type { DraftProduct } from '../../shared/types';

export function useDrafts(accountId: string) {
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = useCallback(async (reset = true) => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { products, hasMore: more } = await window.electronAPI.drafts.fetch(accountId, reset);
      if (reset) {
        setDrafts(products);
      } else {
        setDrafts(prev => [...prev, ...products]);
      }
      setHasMore(more);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const listProduct = useCallback(async (productId: string) => {
    return window.electronAPI.drafts.list(accountId, productId);
  }, [accountId]);

  return { drafts, hasMore, loading, fetchDrafts, listProduct };
}
