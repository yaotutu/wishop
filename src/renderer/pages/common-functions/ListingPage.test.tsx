/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListingSettings } from '../../../shared/types';

const mocks = vi.hoisted(() => ({
  scheduledJobsList: vi.fn(),
  scheduledJobsAdd: vi.fn(),
  scheduledJobsUpsert: vi.fn(),
  scheduledJobsUpdate: vi.fn(),
  saveGlobalTaskConfig: vi.fn(),
  setAccountTaskConfigEnabled: vi.fn(),
  setAccountRulesEnabled: vi.fn(),
}));

vi.mock('../../domains/scheduled-jobs/client', () => ({
  scheduledJobsClient: {
    list: mocks.scheduledJobsList,
    add: mocks.scheduledJobsAdd,
    upsert: mocks.scheduledJobsUpsert,
    update: mocks.scheduledJobsUpdate,
  },
}));

const defaultRules = {
  blacklistRules: [],
  skipKeywords: [],
  statusRules: [],
};

function createSettings(overrides: Partial<ListingSettings> = {}): ListingSettings {
  const taskConfig = { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true };
  return {
    globalTaskConfig: taskConfig,
    accountTaskConfig: taskConfig,
    effectiveTaskConfig: taskConfig,
    taskConfigSource: 'global',
    useAccountTaskConfig: false,
    globalScheduledEnabled: true,
    globalRules: defaultRules,
    accountRules: defaultRules,
    effectiveRules: { ...defaultRules, source: 'global' },
    useAccountRules: false,
    ...overrides,
  };
}

vi.mock('../../domains/listing/hooks', () => ({
  useTaskConfig: () => ({
    saveTaskConfig: vi.fn(),
    runTask: vi.fn(),
    stopTask: vi.fn(),
    onTaskLog: vi.fn(() => vi.fn()),
  }),
  useListingSettings: () => ({
    settings: createSettings(),
    fetchSettings: vi.fn(),
    saveGlobalTaskConfig: mocks.saveGlobalTaskConfig,
    setAccountTaskConfigEnabled: mocks.setAccountTaskConfigEnabled,
    setGlobalScheduledEnabled: vi.fn(),
    setAccountRulesEnabled: mocks.setAccountRulesEnabled,
    saveAccountRules: vi.fn(),
  }),
  useLogs: () => ({ logs: [], fetchLogs: vi.fn(), clearLogs: vi.fn() }),
  useQuota: () => ({ quota: { quota: 10, total: 10 }, fetchQuota: vi.fn() }),
  useBlacklistRules: () => ({ fetchRules: vi.fn(), saveRules: vi.fn(), defaultCodes: new Set<number>() }),
  useSkipKeywords: () => ({ fetchKeywords: vi.fn(), saveKeywords: vi.fn() }),
  useStatusRules: () => ({ fetchRules: vi.fn(), saveRules: vi.fn(), resetRules: vi.fn() }),
}));

const { default: ListingPage } = await import('./ListingPage');

describe('ListingPage scheduling and inheritance UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const nativeGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => nativeGetComputedStyle(element));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    mocks.scheduledJobsList.mockResolvedValue([]);
    mocks.scheduledJobsUpsert.mockResolvedValue({
      id: 'global-listing-job',
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
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not show global ownership switches on account scope', () => {
    render(<ListingPage accountId="account-1" scope="account" />);

    expect(screen.queryByText('全局任务生效中')).toBeNull();
    expect(screen.queryByText('跟随全局任务配置')).toBeNull();
    expect(screen.queryByText('单独设置此账号')).toBeNull();
    expect(screen.queryByText('使用全局规则')).toBeNull();
    expect(screen.getByRole('button', { name: /定时任务/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /规则修改/ })).toBeTruthy();
    expect(screen.queryByText('扫描商品时')).toBeNull();
  });

  it('opens a modal before creating the global listing scheduled job', async () => {
    render(<ListingPage accountId="account-1" scope="global" />);

    await waitFor(() => expect(mocks.scheduledJobsList).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: /创建全局定时任务/ }));

    expect(screen.getByText('全局商品提审定时任务')).toBeTruthy();
    expect(screen.getByText('任务类型')).toBeTruthy();
    expect(screen.getByText('商品提审')).toBeTruthy();
    expect(screen.getByText('作用范围')).toBeTruthy();
    expect(screen.getByText('全部账号')).toBeTruthy();
    expect(mocks.scheduledJobsUpsert).not.toHaveBeenCalled();

    const okButton = screen.getAllByRole('button', { name: /创建全局定时任务/ }).at(-1);
    expect(okButton).toBeTruthy();
    fireEvent.click(okButton!);

    await waitFor(() => expect(mocks.scheduledJobsUpsert).toHaveBeenCalledWith(expect.objectContaining({
      name: '商品提审 - 全账号',
      enabled: true,
      jobType: 'listing.submitDrafts',
      scope: 'global',
    })));
    expect(mocks.saveGlobalTaskConfig).toHaveBeenCalledWith(expect.objectContaining({
      listUnreviewed: true,
      listUnreviewedQuantity: 2,
      autoDeleteFailed: true,
    }));
  });

  it('renders global scope as read-only and edits task config in the scheduled job modal', async () => {
    mocks.scheduledJobsList.mockResolvedValueOnce([{
      id: 'global-listing-job',
      name: '商品提审 - 全账号',
      enabled: true,
      module: 'listing',
      jobType: 'listing.submitDrafts',
      scope: 'global',
      cronExpression: '0 9 * * *',
      staggerMinutes: 10,
      payload: {},
      stats: { lastRunDate: '', todayRunCount: 0 },
      createdAt: 1,
      updatedAt: 1,
    }]);
    render(<ListingPage accountId="account-1" scope="global" />);

    await waitFor(() => expect(mocks.scheduledJobsList).toHaveBeenCalledOnce());

    expect(screen.getByText('商品提审全局任务')).toBeTruthy();
    expect(screen.getByText('开启，每次 2 条')).toBeTruthy();
    expect(screen.getByText('全局运行规则')).toBeTruthy();
    expect(screen.queryByText('已锁定')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /提交未审核商品/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /修改任务配置/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /编辑全局定时任务/ }));

    expect(screen.getByText('全局商品提审定时任务')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /提交未审核商品/ })).toBeTruthy();
    expect(mocks.saveGlobalTaskConfig).not.toHaveBeenCalled();

    const okButton = screen.getAllByRole('button', { name: /保存全局定时任务/ }).at(-1);
    expect(okButton).toBeTruthy();
    fireEvent.click(okButton!);

    await waitFor(() => expect(mocks.saveGlobalTaskConfig).toHaveBeenCalledWith(expect.objectContaining({
      listUnreviewed: true,
      listUnreviewedQuantity: 2,
      autoDeleteFailed: true,
    })));
  });
});
