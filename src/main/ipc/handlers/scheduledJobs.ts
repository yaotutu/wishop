import { ipcMain } from 'electron';
import { addScheduledJob, getScheduledJobs, removeScheduledJob, updateScheduledJob } from '../../store';
import type { ScheduledJob } from '../../../shared/types';

export function registerScheduledJobHandlers(): void {
  ipcMain.handle('scheduledJobs:list', (): ScheduledJob[] => {
    return getScheduledJobs();
  });

  ipcMain.handle(
    'scheduledJobs:add',
    (_, job: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): ScheduledJob => {
      return addScheduledJob(job);
    },
  );

  ipcMain.handle('scheduledJobs:update', (_, jobId: string, patch: Partial<ScheduledJob>): void => {
    updateScheduledJob(jobId, patch);
  });

  ipcMain.handle('scheduledJobs:remove', (_, jobId: string): void => {
    removeScheduledJob(jobId);
  });
}
