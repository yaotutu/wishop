import { describe, expect, it } from 'vitest';
import { createListingRepository } from './listing-repository';
import type { FullAccount } from '../../../shared/types';

function makeAccount(): FullAccount {
  return {
    id: 'account-1',
    name: '店铺',
    config: { appId: 'app', appSecret: 'secret' },
    taskConfig: { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true },
    logs: [],
    violationWords: [],
    productSources: [],
    orderAssociations: [],
    realAddressCaches: [],
    createdAt: 1,
  };
}

describe('listing repository', () => {
  it('adds logs with generated metadata and filters old logs', () => {
    let accounts = [makeAccount()];
    const repo = createListingRepository({
      getAccounts: () => accounts,
      setAccounts: next => { accounts = next; },
      getGlobal: () => undefined,
      setGlobal: () => undefined,
      now: () => 10 * 24 * 60 * 60 * 1000,
      createId: () => 'log-id',
    });

    accounts[0].logs.push({
      id: 'old',
      timestamp: 1,
      runId: 'old',
      productId: '',
      productTitle: '',
      action: 'check',
      status: 'success',
    });

    repo.addLog('account-1', {
      runId: 'run-1',
      productId: 'product-1',
      productTitle: '商品',
      action: 'list',
      status: 'success',
    });

    expect(accounts[0].logs).toEqual([{
      id: 'log-id',
      timestamp: 10 * 24 * 60 * 60 * 1000,
      runId: 'run-1',
      productId: 'product-1',
      productTitle: '商品',
      action: 'list',
      status: 'success',
    }]);
  });

  it('stores only non-default blacklist rules but reads merged defaults', () => {
    const stored: Record<string, unknown> = {};
    const repo = createListingRepository({
      getAccounts: () => [makeAccount()],
      setAccounts: () => undefined,
      getGlobal: key => stored[key],
      setGlobal: (key, value) => { stored[key] = value; },
      now: () => 1,
      createId: () => 'id',
    });

    repo.setBlacklistRules([
      { code: 1002002, description: '默认' },
      { code: 999, description: '自定义' },
    ]);

    expect(stored.blacklistRules).toEqual([{ code: 999, description: '自定义' }]);
    expect(repo.getBlacklistRules().some(rule => rule.code === 1002002)).toBe(true);
    expect(repo.getBlacklistRules().some(rule => rule.code === 999)).toBe(true);
  });

  it('merges stored status rules with defaults', () => {
    const stored: Record<string, unknown> = {
      statusRules: [{ editStatus: 99, label: '自定义', action: 'skip' }],
    };
    const repo = createListingRepository({
      getAccounts: () => [makeAccount()],
      setAccounts: () => undefined,
      getGlobal: key => stored[key],
      setGlobal: (key, value) => { stored[key] = value; },
      now: () => 1,
      createId: () => 'id',
    });

    expect(repo.getStatusRules().some(rule => rule.editStatus === 72)).toBe(true);
    expect(repo.getStatusRules().some(rule => rule.editStatus === 99)).toBe(true);
  });

  it('uses global task config until an account enables its own task config', () => {
    let accounts = [makeAccount()];
    const stored: Record<string, unknown> = {
      globalTaskConfig: { listUnreviewed: true, listUnreviewedQuantity: 8, autoDeleteFailed: false },
    };
    const repo = createListingRepository({
      getAccounts: () => accounts,
      setAccounts: next => { accounts = next; },
      getGlobal: key => stored[key],
      setGlobal: (key, value) => { stored[key] = value; },
      now: () => 1,
      createId: () => 'id',
    }) as any;

    expect(repo.getEffectiveTaskConfig('account-1')).toEqual({
      listUnreviewed: true,
      listUnreviewedQuantity: 8,
      autoDeleteFailed: false,
    });

    repo.setAccountTaskConfigEnabled('account-1', true);

    expect(repo.getEffectiveTaskConfig('account-1')).toEqual({
      listUnreviewed: true,
      listUnreviewedQuantity: 2,
      autoDeleteFailed: true,
    });
    expect((accounts[0] as any).listingSettings.useAccountTaskConfig).toBe(true);
  });

  it('uses either global rules or account rules, never both', () => {
    let accounts = [makeAccount()];
    const stored: Record<string, unknown> = {
      blacklistRules: [{ code: 9001, description: '全局错误' }],
      skipKeywords: ['全局保留'],
      statusRules: [{ editStatus: 72, label: '全局未审核', action: 'submit' }],
    };
    const repo = createListingRepository({
      getAccounts: () => accounts,
      setAccounts: next => { accounts = next; },
      getGlobal: key => stored[key],
      setGlobal: (key, value) => { stored[key] = value; },
      now: () => 1,
      createId: () => 'id',
    }) as any;

    expect(repo.getEffectiveRules('account-1')).toMatchObject({
      source: 'global',
      skipKeywords: ['全局保留'],
    });

    repo.setAccountRulesEnabled('account-1', true);
    repo.setAccountRules('account-1', {
      blacklistRules: [{ code: 9002, description: '账号错误' }],
      skipKeywords: ['账号保留'],
      statusRules: [{ editStatus: 72, label: '账号未审核', action: 'skip' }],
    });

    expect(repo.getEffectiveRules('account-1')).toMatchObject({
      source: 'account',
      blacklistRules: [{ code: 9002, description: '账号错误' }],
      skipKeywords: ['账号保留'],
      statusRules: [{ editStatus: 72, label: '账号未审核', action: 'skip' }],
    });

    repo.setAccountRulesEnabled('account-1', false);

    expect(repo.getEffectiveRules('account-1')).toMatchObject({
      source: 'global',
      skipKeywords: ['全局保留'],
    });
    expect((accounts[0] as any).listingRules.skipKeywords).toEqual(['账号保留']);
  });
});
