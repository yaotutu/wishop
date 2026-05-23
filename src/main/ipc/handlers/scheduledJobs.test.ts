import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduledJob } from '../../../shared/types';

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  getScheduledJobs: vi.fn(),
  normalizeScheduledJobSingletons: vi.fn(),
  reconcileDefaultScheduledJobs: vi.fn(),
  upsertScheduledJob: vi.fn(),
  updateScheduledJobAndReschedule: vi.fn(),
  removeScheduledJobAndStop: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: mocks.handle,
  },
}));

vi.mock('../../store', () => ({
  getScheduledJobs: mocks.getScheduledJobs,
  normalizeScheduledJobSingletons: mocks.normalizeScheduledJobSingletons,
}));

vi.mock('../../scheduler/scheduled-job-runner', () => ({
  reconcileDefaultScheduledJobs: mocks.reconcileDefaultScheduledJobs,
  upsertScheduledJob: mocks.upsertScheduledJob,
  updateScheduledJobAndReschedule: mocks.updateScheduledJobAndReschedule,
  removeScheduledJobAndStop: mocks.removeScheduledJobAndStop,
}));

const { registerScheduledJobHandlers } = await import('./scheduledJobs');

function makeJob(): ScheduledJob {
  return {
    id: 'job-1',
    name: '商品提审 - 全账号',
    enabled: true,
    module: 'listing',
    jobType: 'listing.submitDrafts',
    scope: 'global',
    cronExpression: '0 9 * * *',
    payload: {},
    stats: { lastRunDate: '', todayRunCount: 0 },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('scheduled job IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScheduledJobs.mockReturnValue([makeJob()]);
    mocks.normalizeScheduledJobSingletons.mockReturnValue([makeJob()]);
    mocks.reconcileDefaultScheduledJobs.mockReturnValue([]);
    mocks.upsertScheduledJob.mockReturnValue(makeJob());
  });

  it('reconciles default jobs before listing scheduled jobs', () => {
    const calls: string[] = [];
    mocks.reconcileDefaultScheduledJobs.mockImplementation(() => {
      calls.push('reconcile');
      return [];
    });
    mocks.normalizeScheduledJobSingletons.mockImplementation(() => {
      calls.push('normalize');
      return [makeJob()];
    });
    mocks.getScheduledJobs.mockImplementation(() => {
      calls.push('list');
      return [makeJob()];
    });

    registerScheduledJobHandlers();
    const listHandler = mocks.handle.mock.calls.find(([channel]) => channel === 'scheduledJobs:list')?.[1];

    expect(listHandler).toBeTypeOf('function');
    expect(listHandler()).toEqual([expect.objectContaining({ id: 'job-1' })]);
    expect(calls).toEqual(['reconcile', 'normalize', 'list']);
    expect(mocks.reconcileDefaultScheduledJobs).toHaveBeenCalledWith({ start: false });
  });

  it('creates global jobs through the scheduler center upsert path', async () => {
    registerScheduledJobHandlers();
    const addHandler = mocks.handle.mock.calls.find(([channel]) => channel === 'scheduledJobs:add')?.[1];

    expect(addHandler).toBeTypeOf('function');

    const input = {
      name: '商品提审 - 全账号',
      enabled: true,
      module: 'listing',
      jobType: 'listing.submitDrafts',
      scope: 'global',
      cronExpression: '0 9 * * *',
      payload: {},
    } satisfies Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>;

    expect(addHandler({}, input)).toEqual(expect.objectContaining({ id: 'job-1' }));
    expect(mocks.upsertScheduledJob).toHaveBeenCalledWith(input);
  });
});
