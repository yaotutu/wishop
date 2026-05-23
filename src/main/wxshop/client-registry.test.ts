import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  createWxShopClient: vi.fn((config: Config) => ({ config })),
}));

vi.mock('./client', () => ({
  createWxShopClient: mocks.createWxShopClient,
}));

const { clearAll, getClient, removeClient } = await import('./client-registry');

describe('client registry', () => {
  beforeEach(() => {
    clearAll();
    vi.clearAllMocks();
  });

  it('creates clients from injected config and reuses them per account', () => {
    const config = { appId: 'app-1', appSecret: 'secret-1' };

    const first = getClient('account-1', config);
    const second = getClient('account-1', { appId: 'ignored', appSecret: 'ignored' });

    expect(first).toBe(second);
    expect(first.config).toEqual(config);
    expect(mocks.createWxShopClient).toHaveBeenCalledTimes(1);
    expect(mocks.createWxShopClient).toHaveBeenCalledWith(config);
  });

  it('creates a new client after removal', () => {
    const first = getClient('account-1', { appId: 'app-1', appSecret: 'secret-1' });

    removeClient('account-1');
    const second = getClient('account-1', { appId: 'app-2', appSecret: 'secret-2' });

    expect(second).not.toBe(first);
    expect(second.config).toEqual({ appId: 'app-2', appSecret: 'secret-2' });
    expect(mocks.createWxShopClient).toHaveBeenCalledTimes(2);
  });
});
