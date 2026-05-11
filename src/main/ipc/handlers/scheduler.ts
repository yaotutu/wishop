import { ipcMain } from 'electron';
import { getSchedulers, addScheduler, updateScheduler, removeScheduler } from '../../store';
import type { ScheduledTask } from '../../../shared/types';
import { startTask, stopTask } from '../../scheduler/listing-scheduler';

export function registerSchedulerHandlers(): void {
  ipcMain.handle('scheduler:list', (_, accountId: string): ScheduledTask[] => {
    return getSchedulers(accountId);
  });

  ipcMain.handle('scheduler:add', (_, accountId: string, task: Omit<ScheduledTask, 'id' | 'lastRunDate' | 'todayListedCount'>): ScheduledTask => {
    const newTask = addScheduler(accountId, task);
    if (newTask.enabled) {
      startTask(accountId, newTask);
    }
    return newTask;
  });

  ipcMain.handle('scheduler:update', (_, accountId: string, taskId: string, patch: Partial<ScheduledTask>): void => {
    updateScheduler(accountId, taskId, patch);
    if (patch.enabled === true) {
      const tasks = getSchedulers(accountId);
      const task = tasks.find(t => t.id === taskId);
      if (task) startTask(accountId, task);
    } else if (patch.enabled === false) {
      stopTask(accountId, taskId);
    }
  });

  ipcMain.handle('scheduler:remove', (_, accountId: string, taskId: string): void => {
    stopTask(accountId, taskId);
    removeScheduler(accountId, taskId);
  });
}
