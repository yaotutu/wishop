import { useCallback, useEffect, useState } from 'react';
import type { GlobalLogEntry } from '../../shared/global-log';

export function useGlobalLogs() {
  const [logs, setLogs] = useState<GlobalLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await window.electronAPI.globalLogs.list());
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLogs = useCallback(async () => {
    await window.electronAPI.globalLogs.clear();
    setLogs([]);
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, fetchLogs, clearLogs };
}
