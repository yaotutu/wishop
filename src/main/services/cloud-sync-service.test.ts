import { describe, expect, it } from 'vitest';
import { createNoopCloudRuntime } from './cloud-sync-service';

describe('cloud sync runtime', () => {
  it('reports cloud services as unavailable until a real transport is installed', async () => {
    const runtime = createNoopCloudRuntime();

    await expect(runtime.credentials.upload({
      credentialId: 'cred-1',
      accountId: 'account-1',
      platform: 'wechat-shop',
      scope: ['api'],
      authorizedForCloud: true,
      updatedAt: 1,
    })).rejects.toThrow('未连接云服务');

    await expect(runtime.tasks.getCapabilities()).resolves.toMatchObject({
      connected: false,
      credentialUploadSupported: false,
    });
  });
});
