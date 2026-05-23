import { describe, expect, it, vi } from 'vitest';
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

  it('upserts global singleton jobs instead of adding duplicate schedules', () => {
    let jobs = [makeJob('global-job', 'global')];
    const repo = createScheduledJobRepository({
      getJobs: () => jobs,
      setJobs: next => { jobs = next; },
      createId: () => 'new-id',
      now: () => 300,
    });

    const updated = repo.upsertScheduledJobSingleton('global:listing.submitDrafts', {
      name: '全账号商品提审',
      enabled: false,
      module: 'listing',
      jobType: 'listing.submitDrafts',
      scope: 'global',
      cronExpression: '0 12 * * *',
      staggerMinutes: 15,
      dailyLimit: 20,
      payload: {},
    });

    expect(updated.id).toBe('global-job');
    expect(updated.createdAt).toBe(1);
    expect(updated.updatedAt).toBe(300);
    expect(updated.singletonKey).toBe('global:listing.submitDrafts');
    expect(updated.cronExpression).toBe('0 12 * * *');
    expect(updated.stats).toEqual({ lastRunDate: '', todayRunCount: 0 });
    expect(updated.accountStats).toEqual({ 'account-1': { lastRunDate: '2026-01-01', todayRunCount: 1 } });
    expect(jobs).toHaveLength(1);
  });

  it('does not rewrite an unchanged singleton job', () => {
    const existing = {
      ...makeJob('global-job', 'global'),
      name: '全账号商品提审',
      singletonKey: 'global:listing.submitDrafts',
      staggerMinutes: 15,
      dailyLimit: 20,
    };
    let jobs = [existing];
    const setJobs = vi.fn((next: ScheduledJob[]) => { jobs = next; });
    const repo = createScheduledJobRepository({
      getJobs: () => jobs,
      setJobs,
      createId: () => 'new-id',
      now: () => 300,
    });

    const result = repo.upsertScheduledJobSingleton('global:listing.submitDrafts', {
      name: '全账号商品提审',
      enabled: true,
      module: 'listing',
      jobType: 'listing.submitDrafts',
      scope: 'global',
      cronExpression: '0 9 * * *',
      staggerMinutes: 15,
      dailyLimit: 20,
      payload: {},
      singletonKey: 'global:listing.submitDrafts',
    });

    expect(result).toBe(existing);
    expect(setJobs).not.toHaveBeenCalled();
    expect(jobs[0].updatedAt).toBe(1);
  });

  it('normalizes duplicate global singleton jobs from legacy data', () => {
    let jobs = [
      {
        ...makeJob('old-global-job', 'global'),
        updatedAt: 100,
        accountStats: {
          'account-1': { lastRunDate: '2026-05-23', todayRunCount: 1, lastRunAt: 100 },
        },
      },
      makeJob('account-job'),
      {
        ...makeJob('new-global-job', 'global'),
        cronExpression: '0 10 * * *',
        updatedAt: 200,
        accountStats: {
          'account-2': { lastRunDate: '2026-05-23', todayRunCount: 1, lastRunAt: 200 },
        },
      },
    ];
    const repo = createScheduledJobRepository({
      getJobs: () => jobs,
      setJobs: next => { jobs = next; },
      createId: () => 'new-id',
      now: () => 300,
    });

    const normalized = repo.normalizeScheduledJobSingletons();
    const globalJobs = normalized.filter(job => job.scope === 'global');

    expect(globalJobs).toHaveLength(1);
    expect(globalJobs[0]).toMatchObject({
      id: 'new-global-job',
      singletonKey: 'global:listing.submitDrafts',
      cronExpression: '0 10 * * *',
    });
    expect(globalJobs[0].accountStats).toEqual({
      'account-1': { lastRunDate: '2026-05-23', todayRunCount: 1, lastRunAt: 100 },
      'account-2': { lastRunDate: '2026-05-23', todayRunCount: 1, lastRunAt: 200 },
    });
    expect(jobs.map(job => job.id)).toEqual(['account-job', 'new-global-job']);
  });
});
