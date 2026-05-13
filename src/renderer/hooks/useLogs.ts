import { useCallback } from 'react';
import type { LogEntry } from '../../shared/types';
import { useIpcFetch } from './useIpcFetch';

export function useLogs(accountId: string) {
  const { data: logs, loading, fetch: fetchLogs, setData: setLogs } = useIpcFetch<LogEntry[]>(
    accountId,
    useCallback(async () => window.electronAPI.logs.get(accountId), [accountId]),
    [],
  );

  const clearLogs = useCallback(async () => {
    if (!accountId) return;
    await window.electronAPI.logs.clear(accountId);
    setLogs([]);
  }, [accountId, setLogs]);

  return { logs, loading, fetchLogs, clearLogs };
}
