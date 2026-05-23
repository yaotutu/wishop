import { describe, expect, it, vi } from 'vitest';
import type { ScheduledJob } from '../../../shared/types';
import { scheduledJobsClient } from './client';

describe('scheduledJobsClient', () => {
  it('uses window.wishop scheduled jobs APIs', async () => {
    const job = { id: 'job-1' } as ScheduledJob;
    const list = vi.fn().mockResolvedValue([job]);
    const add = vi.fn().mockResolvedValue(job);
    const update = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
    const electronAPI = {
      scheduledJobs: { list: vi.fn(), add: vi.fn(), update: vi.fn(), remove: vi.fn() },
    };

    vi.stubGlobal('window', {
      wishop: { scheduledJobs: { list, add, update, remove } },
      electronAPI,
    });

    const input = {
      name: 'test',
      enabled: true,
      module: 'system',
      jobType: 'listing.submitDrafts',
      scope: 'global',
      excludedAccountIds: [],
      cronExpression: '0 9 * * *',
      staggerMinutes: 0,
      dailyLimit: 0,
      payload: {},
    } satisfies Parameters<typeof scheduledJobsClient.add>[0];

    await expect(scheduledJobsClient.list()).resolves.toEqual([job]);
    await expect(scheduledJobsClient.add(input)).resolves.toBe(job);
    await scheduledJobsClient.update('job-1', { enabled: false });
    await scheduledJobsClient.remove('job-1');

    expect(list).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(input);
    expect(update).toHaveBeenCalledWith('job-1', { enabled: false });
    expect(remove).toHaveBeenCalledWith('job-1');
    expect(electronAPI.scheduledJobs.list).not.toHaveBeenCalled();
  });
});
