import { ipcMain } from 'electron';
import type { ScheduledJob, ScheduledJobInput } from '../../../shared/types';
import { addScheduledJob, listScheduledJobs, removeScheduledJob, runScheduledJobNow, updateScheduledJob } from '../../scheduler/scheduled-jobs';

export function registerScheduledJobHandlers(): void {
  ipcMain.handle('scheduledJobs:list', async () => listScheduledJobs());
  ipcMain.handle('scheduledJobs:add', async (_, job: ScheduledJobInput) => addScheduledJob(job));
  ipcMain.handle('scheduledJobs:update', async (_, jobId: string, patch: Partial<ScheduledJob>) => updateScheduledJob(jobId, patch));
  ipcMain.handle('scheduledJobs:remove', async (_, jobId: string) => removeScheduledJob(jobId));
  ipcMain.handle('scheduledJobs:runNow', async (_, jobId: string) => runScheduledJobNow(jobId));
}
