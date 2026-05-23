import { describe, expect, it } from 'vitest';
import {
  authorizeCredentialForCloud,
  createCredentialMeta,
  credentialMetaSchema,
} from './credentials';

describe('credential domain contract', () => {
  it('creates local credential metadata without cloud authorization by default', () => {
    const meta = createCredentialMeta({
      accountId: 'account-1',
      platform: 'wechat-shop',
      scope: ['api'],
    });

    expect(meta.authorizedForCloud).toBe(false);
    expect(meta.lastUploadedAt).toBeUndefined();
    expect(credentialMetaSchema.parse(meta)).toEqual(meta);
  });

  it('marks a credential as cloud-authorized without pretending it was uploaded', () => {
    const meta = createCredentialMeta({
      accountId: 'account-1',
      platform: 'wechat-shop',
      scope: ['api'],
    });

    const authorized = authorizeCredentialForCloud(meta, 1234);

    expect(authorized.authorizedForCloud).toBe(true);
    expect(authorized.updatedAt).toBe(1234);
    expect(authorized.lastUploadedAt).toBeUndefined();
    expect(authorized.revokedAt).toBeUndefined();
  });
});
