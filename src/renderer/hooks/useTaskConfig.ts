import { useState, useEffect, useCallback } from 'react';
import type { TaskConfig, TaskCycleResult } from '../../shared/types';

export function useTaskConfig(accountId: string) {
  const [taskConfig, setTaskConfigState] = useState<TaskConfig>({
    deleteFailed: false,
    deleteFailedConfirm: false,
    listUnreviewed: true,
    listUnreviewedQuantity: 2,
  });
  const [loading, setLoading] = useState(false);

  const fetchTaskConfig = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.taskConfig.get(accountId);
      setTaskConfigState(data);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const saveTaskConfig = useCallback(async (config: TaskConfig) => {
    if (!accountId) return;
    await window.electronAPI.taskConfig.set(accountId, config);
    setTaskConfigState(config);
  }, [accountId]);

  const runTask = useCallback(async (config: TaskConfig): Promise<TaskCycleResult> => {
    return window.electronAPI.task.run(accountId, config);
  }, [accountId]);

  useEffect(() => { fetchTaskConfig(); }, [accountId]);

  return { taskConfig, loading, fetchTaskConfig, saveTaskConfig, runTask };
}
