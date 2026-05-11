import { useState, useCallback } from 'react';
import type { ScheduledTask, TaskConfig } from '../../shared/types';

const defaultTaskConfig: TaskConfig = {
  deleteFailed: false,
  deleteFailedConfirm: false,
  listUnreviewed: true,
  listUnreviewedQuantity: 2,
};

export function useSchedulers(accountId: string) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.scheduler.list(accountId);
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const addTask = useCallback(async (task: { name: string; enabled: boolean; cronExpression: string; dailyLimit: number; taskConfig: TaskConfig }): Promise<ScheduledTask> => {
    const newTask = await window.electronAPI.scheduler.add(accountId, task);
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, [accountId]);

  const updateTask = useCallback(async (taskId: string, patch: Partial<ScheduledTask>) => {
    await window.electronAPI.scheduler.update(accountId, taskId, patch);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
  }, [accountId]);

  const removeTask = useCallback(async (taskId: string) => {
    await window.electronAPI.scheduler.remove(accountId, taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, [accountId]);

  return { tasks, loading, fetchTasks, addTask, updateTask, removeTask, defaultTaskConfig };
}
