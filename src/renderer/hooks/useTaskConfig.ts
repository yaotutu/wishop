import { useCallback } from 'react';
import type { TaskConfig, TaskCycleResult } from '../../shared/types';
import { useIpcFetch } from './useIpcFetch';

export function useTaskConfig(accountId: string) {
  const { data: taskConfig, loading, fetch: fetchTaskConfig, setData: setTaskConfigState } = useIpcFetch<TaskConfig>(
    accountId,
    useCallback(async () => window.electronAPI.taskConfig.get(accountId), [accountId]),
    { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true },
  );

  const saveTaskConfig = useCallback(async (config: TaskConfig) => {
    if (!accountId) return;
    await window.electronAPI.taskConfig.set(accountId, config);
    setTaskConfigState(config);
  }, [accountId, setTaskConfigState]);

  const runTask = useCallback(async (config: TaskConfig): Promise<TaskCycleResult> => {
    return window.electronAPI.task.run(accountId, config);
  }, [accountId]);

  return { taskConfig, loading, fetchTaskConfig, saveTaskConfig, runTask };
}
