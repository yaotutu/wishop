import { describe, expect, it } from 'vitest';
import { createScheduledJobRepository } from './scheduled-job-repository';
import type { ScheduledJob } from '../../../shared/types';

function makeJob(id: string, scope: ScheduledJob['scope'] = 'account'): ScheduledJob {
  return {
    id,
    name: '任务',
    enabled: true,
    module: 'listing',
    jobType: 'listing.submitDrafts',
    scope,
    accountId: scope === 'account' ? 'account-1' : undefined,
    cronExpression: '0 9 * * *',
    payload: {},
    stats: { lastRunDate: '', todayRunCount: 0 },
    accountStats: scope === 'global'
      ? { 'account-1': { lastRunDate: '2026-01-01', todayRunCount: 1 } }
      : undefined,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('scheduled job repository', () => {
  it('creates jobs with default stats and timestamps', () => {
    let jobs: ScheduledJob[] = [];
    const repo = createScheduledJobRepository({
      getJobs: () => jobs,
      setJobs: next => { jobs = next; },
      createId: () => 'job-1',
      now: () => 100,
    });

    const job = repo.addScheduledJob({
      name: '全局检测',
      enabled: true,
      module: 'orders',
      jobType: 'orders.checkShipmentStatus',
      scope: 'global',
      cronExpression: '*/30 * * * *',
      payload: {},
    });

    expect(job).toMatchObject({
      id: 'job-1',
      stats: { lastRunDate: '', todayRunCount: 0 },
      createdAt: 100,
      updatedAt: 100,
    });
    expect(jobs).toHaveLength(1);
  });

  it('removes account jobs and account-specific global stats for deleted accounts', () => {
    let jobs = [makeJob('account-job'), makeJob('global-job', 'global')];
    const repo = createScheduledJobRepository({
      getJobs: () => jobs,
      setJobs: next => { jobs = next; },
      createId: () => 'id',
      now: () => 200,
    });

    repo.removeScheduledJobsForAccount('account-1');

    expect(jobs.map(job => job.id)).toEqual(['global-job']);
    expect(jobs[0].accountStats).toEqual({});
    expect(jobs[0].updatedAt).toBe(200);
  });
});
