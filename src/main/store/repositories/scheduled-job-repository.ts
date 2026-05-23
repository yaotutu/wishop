import type { ScheduledJob, ScheduledJobRunStats } from '../../../shared/types';

const EMPTY_SCHEDULED_JOB_STATS: ScheduledJobRunStats = {
  lastRunDate: '',
  todayRunCount: 0,
};

export interface ScheduledJobRepositoryDeps {
  getJobs: () => ScheduledJob[];
  setJobs: (jobs: ScheduledJob[]) => void;
  createId: () => string;
  now: () => number;
}

export function createScheduledJobRepository(deps: ScheduledJobRepositoryDeps) {
  return {
    getScheduledJobs(): ScheduledJob[] {
      return deps.getJobs();
    },

    addScheduledJob(input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): ScheduledJob {
      const timestamp = deps.now();
      const job: ScheduledJob = {
        ...input,
        id: deps.createId(),
        stats: { ...EMPTY_SCHEDULED_JOB_STATS },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      deps.setJobs([...deps.getJobs(), job]);
      return job;
    },

    updateScheduledJob(jobId: string, patch: Partial<ScheduledJob>): void {
      deps.setJobs(deps.getJobs().map(job => (
        job.id === jobId ? { ...job, ...patch, updatedAt: deps.now() } : job
      )));
    },

    removeScheduledJob(jobId: string): void {
      deps.setJobs(deps.getJobs().filter(job => job.id !== jobId));
    },

    removeScheduledJobsForAccount(accountId: string): void {
      deps.setJobs(deps.getJobs()
        .filter(job => job.scope !== 'account' || job.accountId !== accountId)
        .map(job => {
          if (job.scope !== 'global' || !job.accountStats?.[accountId]) return job;
          const { [accountId]: _removed, ...accountStats } = job.accountStats;
          return { ...job, accountStats, updatedAt: deps.now() };
        }));
    },

    updateScheduledJobStats(jobId: string, patch: Partial<ScheduledJobRunStats>): void {
      deps.setJobs(deps.getJobs().map(job => (
        job.id === jobId
          ? { ...job, stats: { ...job.stats, ...patch }, updatedAt: deps.now() }
          : job
      )));
    },

    updateScheduledJobAccountStats(jobId: string, accountId: string, patch: Partial<ScheduledJobRunStats>): void {
      deps.setJobs(deps.getJobs().map(job => {
        if (job.id !== jobId) return job;
        const prev = job.accountStats?.[accountId] || EMPTY_SCHEDULED_JOB_STATS;
        return {
          ...job,
          accountStats: {
            ...(job.accountStats || {}),
            [accountId]: { ...prev, ...patch },
          },
          updatedAt: deps.now(),
        };
      }));
    },
  };
}
