import type { ScheduledJob } from '../../../shared/types';

export type ScheduledJobInput = Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>;

export const scheduledJobsClient = {
  list(): Promise<ScheduledJob[]> {
    return window.wishop.scheduledJobs.list();
  },
  add(job: ScheduledJobInput): Promise<ScheduledJob> {
    return window.wishop.scheduledJobs.add(job);
  },
  update(jobId: string, patch: Partial<ScheduledJob>): Promise<void> {
    return window.wishop.scheduledJobs.update(jobId, patch);
  },
  remove(jobId: string): Promise<void> {
    return window.wishop.scheduledJobs.remove(jobId);
  },
};
