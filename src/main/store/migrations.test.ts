import { describe, expect, it } from 'vitest';
import { migrateStoreIfNeeded, type MigrationStore } from './migrations';
import type { Config, FullAccount, LogEntry, TaskConfig } from '../../shared/types';

function makeStore(initial: {
  accounts?: FullAccount[] | any[];
  activeAccountId?: string;
  config?: Config;
  scheduler?: any;
  taskConfig?: TaskConfig;
  logs?: LogEntry[];
}): MigrationStore & { data: typeof initial } {
  const data = { accounts: [], activeAccountId: '', ...initial };
  return {
    data,
    get: ((key: keyof typeof data) => data[key]) as MigrationStore['get'],
    set: ((key: keyof typeof data, value: unknown) => {
      (data as Record<string, unknown>)[key] = value;
    }) as MigrationStore['set'],
    delete: (key) => {
      delete (data as Record<string, unknown>)[key];
    },
  };
}

describe('store migrations', () => {
  it('normalizes existing accounts with missing collection fields', () => {
    const store = makeStore({
      accounts: [{
        id: 'account-1',
        name: '店铺',
        config: { appId: 'app', appSecret: 'secret' },
        taskConfig: { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true },
        logs: [],
        createdAt: 1,
      }],
    });

    migrateStoreIfNeeded(store);

    expect(store.data.accounts[0]).toMatchObject({
      schedulers: [],
      violationWords: [],
      productSources: [],
      orderAssociations: [],
      realAddressCaches: [],
    });
  });

  it('migrates legacy single-account config into an account and clears legacy keys', () => {
    const store = makeStore({
      accounts: [],
      config: { appId: 'legacy-app', appSecret: 'legacy-secret' },
      scheduler: {
        enabled: true,
        cronExpression: '0 9 * * *',
        dailyLimit: 2,
        lastRunDate: '2026-01-01',
        todayListedCount: 1,
      },
      taskConfig: { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true },
      logs: [{
        id: 'log-1',
        timestamp: 1,
        runId: 'run',
        productId: '',
        productTitle: '',
        action: 'check',
        status: 'success',
      }],
    });

    migrateStoreIfNeeded(store);

    expect(store.data.accounts).toHaveLength(1);
    expect(store.data.accounts[0]).toMatchObject({
      name: '默认店铺',
      config: { appId: 'legacy-app', appSecret: 'legacy-secret' },
      logs: [{ id: 'log-1' }],
    });
    expect(store.data.activeAccountId).toBe(store.data.accounts[0].id);
    expect(store.data.config).toBeUndefined();
    expect(store.data.scheduler).toBeUndefined();
    expect(store.data.taskConfig).toBeUndefined();
    expect(store.data.logs).toBeUndefined();
  });
});
