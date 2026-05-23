import { ipcMain } from 'electron';
import { getScheduledJobs, normalizeScheduledJobSingletons } from '../../store';
import type { ScheduledJob } from '../../../shared/types';
import {
  reconcileDefaultScheduledJobs,
  removeScheduledJobAndStop,
  updateScheduledJobAndReschedule,
  upsertScheduledJob,
} from '../../scheduler/scheduled-job-runner';

export function registerScheduledJobHandlers(): void {
  ipcMain.handle('scheduledJobs:list', (): ScheduledJob[] => {
    reconcileDefaultScheduledJobs({ start: false });
    normalizeScheduledJobSingletons();
    return getScheduledJobs();
  });

  ipcMain.handle(
    'scheduledJobs:add',
    (_, job: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): ScheduledJob => {
      return upsertScheduledJob(job);
    },
  );

  ipcMain.handle(
    'scheduledJobs:upsert',
    (_, job: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): ScheduledJob => {
      return upsertScheduledJob(job);
    },
  );

  ipcMain.handle('scheduledJobs:update', (_, jobId: string, patch: Partial<ScheduledJob>): void => {
    updateScheduledJobAndReschedule(jobId, patch);
  });

  ipcMain.handle('scheduledJobs:remove', (_, jobId: string): void => {
    removeScheduledJobAndStop(jobId);
  });
}
