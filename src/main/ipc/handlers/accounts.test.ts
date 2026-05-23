import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  loggerError: vi.fn(),
  getAccounts: vi.fn(() => []),
  addAccount: vi.fn(),
  removeAccount: vi.fn(),
  updateAccount: vi.fn(),
  getActiveAccountId: vi.fn(() => ''),
  setActiveAccountId: vi.fn(),
  getScheduledJobs: vi.fn(),
  removeScheduledJobsForAccount: vi.fn(),
  stopScheduledJob: vi.fn(),
  removeClient: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: mocks.handle,
  },
}));

vi.mock('../../store', () => ({
  getAccounts: mocks.getAccounts,
  addAccount: mocks.addAccount,
  removeAccount: mocks.removeAccount,
  updateAccount: mocks.updateAccount,
  getActiveAccountId: mocks.getActiveAccountId,
  setActiveAccountId: mocks.setActiveAccountId,
  getScheduledJobs: mocks.getScheduledJobs,
  removeScheduledJobsForAccount: mocks.removeScheduledJobsForAccount,
}));

vi.mock('../../scheduler/scheduled-job-runner', () => ({
  stopScheduledJob: mocks.stopScheduledJob,
}));

vi.mock('../../wxshop/client-registry', () => ({
  removeClient: mocks.removeClient,
}));

vi.mock('../../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: mocks.loggerError,
  })),
}));

const { registerAccountHandlers } = await import('./accounts');

describe('account ipc handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops account-scoped scheduled jobs when removing an account', () => {
    mocks.getScheduledJobs.mockReturnValue([
      { id: 'job-1', scope: 'account', accountId: 'account-1' },
      { id: 'job-2', scope: 'account', accountId: 'account-2' },
      { id: 'job-3', scope: 'global' },
    ]);
    const draftPaginationMap = new Map<string, unknown>([['account-1', {}]]);

    registerAccountHandlers({ draftPaginationMap });
    const removeHandler = mocks.handle.mock.calls.find(call => call[0] === 'accounts:remove')?.[1];
    removeHandler?.({}, 'account-1');

    expect(mocks.stopScheduledJob).toHaveBeenCalledTimes(1);
    expect(mocks.stopScheduledJob).toHaveBeenCalledWith('job-1');
    expect(mocks.removeScheduledJobsForAccount).toHaveBeenCalledWith('account-1');
    expect(draftPaginationMap.has('account-1')).toBe(false);
  });

  it('logs account handler failures and rejects with the original error message', async () => {
    mocks.removeAccount.mockImplementation(() => {
      throw new Error('删除店铺失败');
    });
    const draftPaginationMap = new Map<string, unknown>([['account-1', {}]]);

    registerAccountHandlers({ draftPaginationMap });
    const removeHandler = mocks.handle.mock.calls.find(call => call[0] === 'accounts:remove')?.[1];

    await expect(removeHandler?.({}, 'account-1')).rejects.toThrow('删除店铺失败');
    expect(mocks.loggerError).toHaveBeenCalledWith('accounts:remove 失败:', expect.any(Error));
  });
});
