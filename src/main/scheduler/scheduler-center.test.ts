import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduledJob } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  cronHandler: undefined as (() => void) | undefined,
  cronTaskStop: vi.fn(),
  executor: vi.fn(),
  getAccounts: vi.fn(),
  getScheduledJobs: vi.fn(),
  normalizeScheduledJobSingletons: vi.fn(),
  updateScheduledJobAccountStats: vi.fn(),
  updateScheduledJobStats: vi.fn(),
  jobRunnerRun: vi.fn(async (_id: string, run: (context: { signal: AbortSignal }) => Promise<void>) => {
    const controller = new AbortController();
    await run({ signal: controller.signal });
  }),
  jobRunnerStop: vi.fn(),
}));

vi.mock('node-cron', () => ({
  validate: vi.fn(() => true),
  schedule: vi.fn((_expression: string, handler: () => void) => {
    mocks.cronHandler = handler;
    return { stop: mocks.cronTaskStop };
  }),
}));

vi.mock('../store', () => ({
  getAccounts: mocks.getAccounts,
  getScheduledJobs: mocks.getScheduledJobs,
  normalizeScheduledJobSingletons: mocks.normalizeScheduledJobSingletons,
  updateScheduledJobAccountStats: mocks.updateScheduledJobAccountStats,
  updateScheduledJobStats: mocks.updateScheduledJobStats,
}));

vi.mock('../jobs/job-runner', () => ({
  jobRunner: {
    run: mocks.jobRunnerRun,
    stop: mocks.jobRunnerStop,
  },
}));

vi.mock('../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const {
  registerScheduledJobDefinition,
  resetScheduledJobDefinitionsForTests,
  startScheduledJob,
  stopAllScheduledJobs,
} = await import('./scheduler-center');

function createScheduledJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: 'job-1',
    name: 'job',
    enabled: true,
    module: 'listing',
    jobType: 'listing.submitDrafts',
    scope: 'global',
    cronExpression: '* * * * *',
    payload: {},
    stats: { lastRunDate: '', todayRunCount: 0 },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

async function waitFor(assertion: () => void): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      assertion();
      return;
    } catch (error) {
      if (attempt === 19) throw error;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

describe('scheduler center', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cronHandler = undefined;
    resetScheduledJobDefinitionsForTests();
    mocks.executor.mockResolvedValue({ listed: 1, status: 'completed' });
    mocks.getAccounts.mockReturnValue([{ id: 'account-1' }, { id: 'account-2' }]);
    mocks.normalizeScheduledJobSingletons.mockReturnValue([]);
  });

  it('runs global jobs through the registered executor for each target account', async () => {
    const job = createScheduledJob();
    mocks.getScheduledJobs.mockReturnValue([job]);
    registerScheduledJobDefinition({
      module: 'listing',
      jobType: 'listing.submitDrafts',
      executor: mocks.executor,
    });

    startScheduledJob(job);
    mocks.cronHandler?.();

    await waitFor(() => expect(mocks.executor).toHaveBeenCalledTimes(2));
    expect(mocks.executor.mock.calls.map(([context]) => context.accountId)).toEqual(['account-1', 'account-2']);
    expect(mocks.updateScheduledJobAccountStats).toHaveBeenCalledWith(
      'job-1',
      'account-1',
      expect.objectContaining({ lastStatus: 'running' }),
    );
    expect(mocks.updateScheduledJobAccountStats).toHaveBeenCalledWith(
      'job-1',
      'account-2',
      expect.objectContaining({ lastStatus: 'completed' }),
    );

    stopAllScheduledJobs();
  });
});
