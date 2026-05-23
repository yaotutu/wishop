import { describe, expect, it } from 'vitest';
import { createViolationRepository } from './violation-repository';
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

describe('violation repository', () => {
  it('writes violation words per account', () => {
    let accounts = [makeAccount()];
    const repo = createViolationRepository({
      getAccounts: () => accounts,
      setAccounts: next => { accounts = next; },
    });

    repo.setViolationWords('account-1', ['a', 'b']);

    expect(repo.getViolationWords('account-1')).toEqual(['a', 'b']);
    expect(accounts[0].violationWords).toEqual(['a', 'b']);
  });
});
