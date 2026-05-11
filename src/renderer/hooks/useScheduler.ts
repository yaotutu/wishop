import { useState, useEffect, useCallback } from 'react';
import type { SchedulerConfig } from '../../shared/types';

export function useScheduler(accountId: string) {
  const [scheduler, setScheduler] = useState<SchedulerConfig>({
    enabled: false,
    cronExpression: '0 9 * * *',
    dailyLimit: 100,
    lastRunDate: '',
    todayListedCount: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchScheduler = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.scheduler.get(accountId);
      setScheduler(data);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const saveScheduler = useCallback(async (newScheduler: SchedulerConfig) => {
    await window.electronAPI.scheduler.set(accountId, newScheduler);
    setScheduler(newScheduler);
  }, [accountId]);

  useEffect(() => { fetchScheduler(); }, [accountId]);

  return { scheduler, loading, fetchScheduler, saveScheduler };
}
