import { useCallback } from 'react';
import type { QuotaResult } from '../../shared/types';
import { useIpcFetch } from './useIpcFetch';
import { isCredentialError } from '../../shared/errors';
import { useCredentialError } from '../contexts/CredentialErrorContext';

export function useQuota(accountId: string) {
  const { reportCredentialError } = useCredentialError();
  const { data: quota, loading, fetch: fetchQuota } = useIpcFetch<QuotaResult>(
    accountId,
    useCallback(async () => {
      try {
        return await window.electronAPI.quota.get(accountId);
      } catch (err: unknown) {
        if (isCredentialError(err)) reportCredentialError(err);
        return { quota: 0, total: 0 };
      }
    }, [accountId, reportCredentialError]),
    { quota: 0, total: 0 },
    { autoFetch: false },
  );

  return { quota, loading, fetchQuota };
}
