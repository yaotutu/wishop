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
});
