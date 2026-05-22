import { ipcMain } from 'electron';
import { addScheduledJob, getScheduledJobs, removeScheduledJob, updateScheduledJob } from '../../store';
import type { ScheduledJob } from '../../../shared/types';
import { startScheduledJob, stopScheduledJob } from '../../scheduler/scheduled-job-runner';

export function registerScheduledJobHandlers(): void {
  ipcMain.handle('scheduledJobs:list', (): ScheduledJob[] => {
    return getScheduledJobs();
  });

  ipcMain.handle(
    'scheduledJobs:add',
    (_, job: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): ScheduledJob => {
      const next = addScheduledJob(job);
      startScheduledJob(next);
      return next;
    },
  );

  ipcMain.handle('scheduledJobs:update', (_, jobId: string, patch: Partial<ScheduledJob>): void => {
    updateScheduledJob(jobId, patch);
    const next = getScheduledJobs().find(job => job.id === jobId);
    if (next) startScheduledJob(next);
  });

  ipcMain.handle('scheduledJobs:remove', (_, jobId: string): void => {
    removeScheduledJob(jobId);
    stopScheduledJob(jobId);
  });
}
