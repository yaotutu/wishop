import { describe, expect, it } from 'vitest';
import { createSyncCredentialRepository } from './sync-credential-repository';
import type { CredentialMeta } from '../../../shared/credentials';
import type { SyncSettings } from '../../../shared/sync';

describe('sync credential repository', () => {
  it('enables sync automatically when cloud execution is enabled', () => {
    let settings: SyncSettings | undefined;
    const repo = createSyncCredentialRepository({
      getSyncSettings: () => settings,
      setSyncSettings: next => { settings = next; },
      getCredentialMetas: () => [],
      setCredentialMetas: () => undefined,
      now: () => 123,
    });

    const next = repo.updateSyncModuleSetting('orders', { cloudExecutionEnabled: true });

    expect(next.modules.orders).toMatchObject({
      cloudExecutionEnabled: true,
      syncEnabled: true,
      mode: 'cloudExecutionEnabled',
    });
    expect(next.updatedAt).toBe(123);
  });

  it('filters credential metadata by account and updates cloud authorization', () => {
    let metas: CredentialMeta[] = [];
    const repo = createSyncCredentialRepository({
      getSyncSettings: () => undefined,
      setSyncSettings: () => undefined,
      getCredentialMetas: () => metas,
      setCredentialMetas: next => { metas = next; },
      now: () => 1,
    });

    const local = repo.saveLocalCredentialMeta({
      accountId: 'account-1',
      platform: 'wechat-shop',
      scope: ['api'],
    });

    expect(repo.getCredentialMetas('account-1')).toHaveLength(1);
    expect(repo.getCredentialMetas('other')).toEqual([]);

    const authorized = repo.authorizeCredentialMetaForCloud(local.credentialId);
    expect(authorized.authorizedForCloud).toBe(true);
    expect(repo.revokeCredentialMetaCloudAuthorization(local.credentialId).authorizedForCloud).toBe(false);
  });
});
