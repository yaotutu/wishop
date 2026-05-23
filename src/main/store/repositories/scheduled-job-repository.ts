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

function normalizeList(values?: string[]): string[] {
  return values || [];
}

function payloadEquals(left: unknown, right: unknown): boolean {
  return JSON.stringify(left || {}) === JSON.stringify(right || {});
}

function singletonInputMatches(
  existing: ScheduledJob,
  singletonKey: string,
  input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>,
): boolean {
  return (
    existing.singletonKey === singletonKey
    && existing.name === input.name
    && existing.enabled === input.enabled
    && existing.module === input.module
    && existing.jobType === input.jobType
    && existing.scope === input.scope
    && existing.accountId === input.accountId
    && existing.cronExpression === input.cronExpression
    && (existing.staggerMinutes || 0) === (input.staggerMinutes || 0)
    && (existing.dailyLimit || 0) === (input.dailyLimit || 0)
    && normalizeList(existing.excludedAccountIds).join('\n') === normalizeList(input.excludedAccountIds).join('\n')
    && payloadEquals(existing.payload, input.payload)
  );
}

function globalSingletonKey(job: ScheduledJob): string | undefined {
  if (job.scope !== 'global') return undefined;
  return job.singletonKey || `global:${job.jobType}`;
}

function statsTimestamp(stats: ScheduledJobRunStats): number {
  return Math.max(stats.lastFinishedAt || 0, stats.lastRunAt || 0);
}

function chooseStats(left: ScheduledJobRunStats, right: ScheduledJobRunStats): ScheduledJobRunStats {
  return statsTimestamp(right) > statsTimestamp(left) ? right : left;
}

function chooseSingletonJob(left: ScheduledJob, right: ScheduledJob): ScheduledJob {
  if (Boolean(right.singletonKey) !== Boolean(left.singletonKey)) {
    return right.singletonKey ? right : left;
  }
  const leftTimestamp = left.updatedAt || left.createdAt || 0;
  const rightTimestamp = right.updatedAt || right.createdAt || 0;
  return rightTimestamp > leftTimestamp ? right : left;
}

function mergeAccountStats(jobs: ScheduledJob[]): ScheduledJob['accountStats'] {
  const merged: ScheduledJob['accountStats'] = {};
  for (const job of jobs) {
    for (const [accountId, stats] of Object.entries(job.accountStats || {})) {
      merged[accountId] = merged[accountId] ? chooseStats(merged[accountId], stats) : stats;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function createScheduledJobRepository(deps: ScheduledJobRepositoryDeps) {
  function createScheduledJob(
    input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>,
  ): ScheduledJob {
    const timestamp = deps.now();
    return {
      ...input,
      id: deps.createId(),
      stats: { ...EMPTY_SCHEDULED_JOB_STATS },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  return {
    getScheduledJobs(): ScheduledJob[] {
      return deps.getJobs();
    },

    normalizeScheduledJobSingletons(): ScheduledJob[] {
      const jobs = deps.getJobs();
      const groups = new Map<string, ScheduledJob[]>();
      for (const job of jobs) {
        const key = globalSingletonKey(job);
        if (!key) continue;
        groups.set(key, [...(groups.get(key) || []), job]);
      }

      const replacements = new Map<string, ScheduledJob>();
      const removedIds = new Set<string>();
      for (const [singletonKey, group] of groups) {
        const keeper = group.reduce(chooseSingletonJob);
        const needsRewrite = group.length > 1 || keeper.singletonKey !== singletonKey;
        if (!needsRewrite) continue;

        replacements.set(keeper.id, {
          ...keeper,
          singletonKey,
          stats: group.map(job => job.stats).reduce(chooseStats, keeper.stats),
          accountStats: mergeAccountStats(group),
        });
        for (const job of group) {
          if (job.id !== keeper.id) removedIds.add(job.id);
        }
      }

      if (replacements.size === 0 && removedIds.size === 0) return jobs;

      const normalized = jobs
        .filter(job => !removedIds.has(job.id))
        .map(job => replacements.get(job.id) || job);
      deps.setJobs(normalized);
      return normalized;
    },

    addScheduledJob(input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): ScheduledJob {
      const job = createScheduledJob(input);
      deps.setJobs([...deps.getJobs(), job]);
      return job;
    },

    upsertScheduledJobSingleton(
      singletonKey: string,
      input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>,
    ): ScheduledJob {
      const jobs = deps.getJobs();
      const existing = jobs.find(job =>
        job.singletonKey === singletonKey
        || (!job.singletonKey && job.scope === input.scope && job.jobType === input.jobType)
      );

      if (!existing) {
        const job = createScheduledJob({ ...input, singletonKey });
        deps.setJobs([...jobs, job]);
        return job;
      }

      const hasDuplicates = jobs.some(job => (
        job.id !== existing.id
        && (
          job.singletonKey === singletonKey
          || (!job.singletonKey && job.scope === input.scope && job.jobType === input.jobType)
        )
      ));
      if (!hasDuplicates && singletonInputMatches(existing, singletonKey, input)) {
        return existing;
      }

      const updated: ScheduledJob = {
        ...existing,
        ...input,
        id: existing.id,
        singletonKey,
        stats: existing.stats,
        accountStats: existing.accountStats,
        createdAt: existing.createdAt,
        updatedAt: deps.now(),
      };
      deps.setJobs([
        updated,
        ...jobs.filter(job => (
          job.id !== existing.id
          && job.singletonKey !== singletonKey
          && !(job.scope === input.scope && job.jobType === input.jobType)
        )),
      ]);
      return updated;
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
