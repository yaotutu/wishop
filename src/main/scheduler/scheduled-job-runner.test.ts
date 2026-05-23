import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduledJob } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  cronHandler: undefined as (() => void) | undefined,
  cronTaskStop: vi.fn(),
  runTaskCycle: vi.fn(),
  batchScan: vi.fn(),
  getScheduledJobs: vi.fn(),
  getViolationWords: vi.fn(),
  updateScheduledJobStats: vi.fn(),
  getClient: vi.fn(),
}));

vi.mock('node-cron', () => ({
  validate: vi.fn(() => true),
  schedule: vi.fn((_expression: string, handler: () => void) => {
    mocks.cronHandler = handler;
    return { stop: mocks.cronTaskStop };
  }),
}));

vi.mock('../modules/task-cycle', () => ({
  runTaskCycle: mocks.runTaskCycle,
}));

vi.mock('../modules/violation-detect', () => ({
  batchScan: mocks.batchScan,
}));

vi.mock('../store', () => ({
  createScopedAddLog: vi.fn(() => vi.fn()),
  getAccounts: vi.fn(() => [{ id: 'account-1' }]),
  getAppSettings: vi.fn(() => ({
    shipmentCheck: {
      enabled: false,
      orderLookbackDays: 7,
      maxChecksPerAccountPerWindow: 5,
      minTaskSpacingSeconds: 0,
    },
  })),
  getBlacklistRules: vi.fn(() => []),
  getConfig: vi.fn(() => ({ appId: 'app-1', appSecret: 'secret-1' })),
  getOrderAssociations: vi.fn(() => []),
  getScheduledJobs: mocks.getScheduledJobs,
  getSkipKeywords: vi.fn(() => []),
  getStatusRules: vi.fn(() => []),
  getViolationWords: mocks.getViolationWords,
  updateScheduledJobAccountStats: vi.fn(),
  updateScheduledJobStats: mocks.updateScheduledJobStats,
}));

vi.mock('../wxshop/client-registry', () => ({
  getClient: mocks.getClient,
}));

mocks.getClient.mockImplementation(() => ({
    getAuditQuota: vi.fn(async () => ({ quota: 10 })),
  }));

vi.mock('../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../services/taobao-automation-service', () => ({
  runPurchaseLookupAutomation: vi.fn(),
}));

const { startScheduledJob, stopScheduledJob } = await import('./scheduled-job-runner');

function createScheduledJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: 'job-1',
    name: 'job',
    enabled: true,
    module: 'listing',
    jobType: 'listing.submitDrafts',
    scope: 'account',
    accountId: 'account-1',
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

describe('scheduled job runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cronHandler = undefined;
    mocks.getViolationWords.mockReturnValue(['禁词']);
    mocks.runTaskCycle.mockResolvedValue({ scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: false });
    mocks.batchScan.mockResolvedValue({ scanned: 0, violations: [], errors: 0, stopped: false });
  });

  it('passes the job abort signal to listing jobs', async () => {
    const job = createScheduledJob({ id: 'listing-job' });
    mocks.getScheduledJobs.mockReturnValue([job]);
    mocks.runTaskCycle.mockImplementation(async (_api, _addLog, _taskConfig, _runId, signal?: AbortSignal) => {
      await new Promise<void>(resolve => signal?.addEventListener('abort', () => resolve(), { once: true }));
      return { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: true };
    });

    startScheduledJob(job);
    mocks.cronHandler?.();

    await waitFor(() => expect(mocks.runTaskCycle).toHaveBeenCalled());
    expect(mocks.getClient).toHaveBeenCalledWith('account-1', { appId: 'app-1', appSecret: 'secret-1' });
    const signal = mocks.runTaskCycle.mock.calls[0][4] as AbortSignal | undefined;

    expect(signal).toBeDefined();

    stopScheduledJob(job.id);
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it('passes the job abort signal to violation scan jobs', async () => {
    const job = createScheduledJob({
      id: 'violation-job',
      module: 'violation',
      jobType: 'violation.scanProducts',
    });
    mocks.getScheduledJobs.mockReturnValue([job]);
    mocks.batchScan.mockImplementation(async (_api, _addLog, _words, _runId, signal?: AbortSignal) => {
      await new Promise<void>(resolve => signal?.addEventListener('abort', () => resolve(), { once: true }));
      return { scanned: 0, violations: [], errors: 0, stopped: true };
    });

    startScheduledJob(job);
    mocks.cronHandler?.();

    await waitFor(() => expect(mocks.batchScan).toHaveBeenCalled());
    const signal = mocks.batchScan.mock.calls[0][4] as AbortSignal | undefined;

    expect(signal).toBeDefined();

    stopScheduledJob(job.id);
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });
});
