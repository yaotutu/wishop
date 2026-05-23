import { describe, expect, it } from 'vitest';
import { createAccountRepository } from './account-repository';
import type { FullAccount } from '../../../shared/types';

function makeAccount(id = 'account-1'): FullAccount {
  return {
    id,
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

describe('account repository', () => {
  it('adds an account and selects it when there is no active account', () => {
    let accounts: FullAccount[] = [];
    let activeAccountId = '';
    const repo = createAccountRepository({
      getAccounts: () => accounts,
      setAccounts: next => { accounts = next; },
      getActiveAccountId: () => activeAccountId,
      setActiveAccountId: next => { activeAccountId = next; },
      createId: () => 'account-1',
      now: () => 100,
    });

    const account = repo.addAccount('新店铺', { appId: 'app', appSecret: 'secret' });

    expect(account.id).toBe('account-1');
    expect(accounts).toHaveLength(1);
    expect(activeAccountId).toBe('account-1');
  });

  it('falls back to environment config values when account config is blank', () => {
    let accounts = [makeAccount()];
    accounts[0].config = { appId: '', appSecret: '' };
    const repo = createAccountRepository({
      getAccounts: () => accounts,
      setAccounts: next => { accounts = next; },
      getActiveAccountId: () => 'account-1',
      setActiveAccountId: () => undefined,
      createId: () => 'id',
      now: () => 1,
      env: { WECHAT_APP_ID: 'env-app', WECHAT_APP_SECRET: 'env-secret' },
    });

    expect(repo.getConfig('account-1')).toEqual({ appId: 'env-app', appSecret: 'env-secret' });
  });
});
