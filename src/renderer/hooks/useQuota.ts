import { useState, useCallback } from 'react';
import type { QuotaResult } from '../../shared/types';

export function useQuota(accountId: string) {
  const [quota, setQuota] = useState<QuotaResult>({ quota: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchQuota = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.quota.get(accountId);
      setQuota(data);
    } catch {
      setQuota({ quota: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  return { quota, loading, fetchQuota };
}
