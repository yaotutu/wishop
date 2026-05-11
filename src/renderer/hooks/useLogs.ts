import { useState, useCallback } from 'react';
import type { LogEntry } from '../../shared/types';

export function useLogs(accountId: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.logs.get(accountId);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const clearLogs = useCallback(async () => {
    if (!accountId) return;
    await window.electronAPI.logs.clear(accountId);
    setLogs([]);
  }, [accountId]);

  return { logs, loading, fetchLogs, clearLogs };
}
