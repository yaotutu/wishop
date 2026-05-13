import { useCallback } from 'react';
import type { QuotaResult } from '../../shared/types';
import { useIpcFetch } from './useIpcFetch';

export function useQuota(accountId: string) {
  const { data: quota, loading, fetch: fetchQuota } = useIpcFetch<QuotaResult>(
    accountId,
    useCallback(async () => {
      try {
        return await window.electronAPI.quota.get(accountId);
      } catch {
        return { quota: 0, total: 0 };
      }
    }, [accountId]),
    { quota: 0, total: 0 },
    { autoFetch: false },
  );

  return { quota, loading, fetchQuota };
}
