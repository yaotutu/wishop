import { describe, expect, it, vi } from 'vitest';
import type { ListingRulesConfig, ListingSettings, TaskConfig } from '../../../shared/types';
import { listingClient } from './client';

describe('listingClient', () => {
  it('uses window.wishop listing settings APIs', async () => {
    const taskConfig: TaskConfig = { listUnreviewed: true, listUnreviewedQuantity: 3, autoDeleteFailed: false };
    const rules: ListingRulesConfig = {
      blacklistRules: [{ code: 9001, description: '停止' }],
      skipKeywords: ['保留'],
      statusRules: [{ editStatus: 72, label: '未审核', action: 'submit' }],
    };
    const settings = {
      globalTaskConfig: taskConfig,
      accountTaskConfig: taskConfig,
      effectiveTaskConfig: taskConfig,
      taskConfigSource: 'global',
      useAccountTaskConfig: false,
      globalScheduledEnabled: true,
      globalRules: rules,
      accountRules: rules,
      effectiveRules: { ...rules, source: 'global' },
      useAccountRules: false,
    } satisfies ListingSettings;
    const get = vi.fn().mockResolvedValue(settings);
    const setGlobalTaskConfig = vi.fn().mockResolvedValue(undefined);
    const setAccountTaskConfigEnabled = vi.fn().mockResolvedValue(undefined);
    const setGlobalScheduledEnabled = vi.fn().mockResolvedValue(undefined);
    const setAccountRulesEnabled = vi.fn().mockResolvedValue(undefined);
    const setAccountRules = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('window', {
      wishop: {
        listingSettings: {
          get,
          setGlobalTaskConfig,
          setAccountTaskConfigEnabled,
          setGlobalScheduledEnabled,
          setAccountRulesEnabled,
          setAccountRules,
        },
      },
    });

    await expect((listingClient as any).settings.get('account-1')).resolves.toEqual(settings);
    await (listingClient as any).settings.saveGlobalTaskConfig(taskConfig);
    await (listingClient as any).settings.setAccountTaskConfigEnabled('account-1', true);
    await (listingClient as any).settings.setGlobalScheduledEnabled('account-1', false);
    await (listingClient as any).settings.setAccountRulesEnabled('account-1', true);
    await (listingClient as any).settings.saveAccountRules('account-1', rules);

    expect(get).toHaveBeenCalledWith('account-1');
    expect(setGlobalTaskConfig).toHaveBeenCalledWith(taskConfig);
    expect(setAccountTaskConfigEnabled).toHaveBeenCalledWith('account-1', true);
    expect(setGlobalScheduledEnabled).toHaveBeenCalledWith('account-1', false);
    expect(setAccountRulesEnabled).toHaveBeenCalledWith('account-1', true);
    expect(setAccountRules).toHaveBeenCalledWith('account-1', rules);
  });
});
