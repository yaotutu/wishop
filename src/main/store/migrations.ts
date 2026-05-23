import { v4 as uuidv4 } from 'uuid';
import type { Config, FullAccount, LogEntry, TaskConfig } from '../../shared/types';

interface LegacyScheduler {
  enabled: boolean;
  cronExpression: string;
  dailyLimit: number;
  lastRunDate: string;
  todayListedCount: number;
}

export interface MigrationStore {
  get: {
    (key: 'accounts'): FullAccount[];
    (key: 'config'): Config | undefined;
    (key: 'scheduler'): LegacyScheduler | undefined;
    (key: 'taskConfig'): TaskConfig | undefined;
    (key: 'logs'): LogEntry[] | undefined;
  };
  set: {
    (key: 'accounts', value: FullAccount[]): void;
    (key: 'activeAccountId', value: string): void;
  };
  delete: (key: 'config' | 'scheduler' | 'taskConfig' | 'logs') => void;
}

export interface MigrationDeps {
  info?: (message: string) => void;
}

const DEFAULT_TASK_CONFIG: TaskConfig = {
  listUnreviewed: true,
  listUnreviewedQuantity: 2,
  autoDeleteFailed: true,
};

export function migrateStoreIfNeeded(store: MigrationStore, deps: MigrationDeps = {}): void {
  const rawAccounts = store.get('accounts') as any[];

  if (rawAccounts && rawAccounts.length > 0) {
    let changed = false;
    for (const account of rawAccounts) {
      if ('scheduler' in account && !('schedulers' in account)) {
        const oldScheduler = account.scheduler;
        account.schedulers = oldScheduler ? [{
          id: uuidv4(),
          name: '默认任务',
          enabled: oldScheduler.enabled,
          cronExpression: oldScheduler.cronExpression,
          dailyLimit: oldScheduler.dailyLimit,
          taskConfig: account.taskConfig || DEFAULT_TASK_CONFIG,
          lastRunDate: oldScheduler.lastRunDate,
          todayListedCount: oldScheduler.todayListedCount,
        }] : [];
        delete account.scheduler;
        changed = true;
      }
      for (const [key, value] of [
        ['schedulers', []],
        ['violationWords', []],
        ['productSources', []],
        ['orderAssociations', []],
        ['realAddressCaches', []],
      ] as const) {
        if (!(key in account)) {
          account[key] = value;
          changed = true;
        }
      }
    }
    if (changed) store.set('accounts', rawAccounts as FullAccount[]);
    return;
  }

  const oldConfig = store.get('config');
  if (!oldConfig || (!oldConfig.appId && !oldConfig.appSecret)) return;

  const oldScheduler = store.get('scheduler');
  const oldTaskConfig = store.get('taskConfig') || DEFAULT_TASK_CONFIG;
  const account: FullAccount = {
    id: uuidv4(),
    name: '默认店铺',
    config: oldConfig,
    schedulers: oldScheduler ? [{
      id: uuidv4(),
      name: '默认任务',
      enabled: oldScheduler.enabled,
      cronExpression: oldScheduler.cronExpression,
      dailyLimit: oldScheduler.dailyLimit,
      taskConfig: oldTaskConfig,
      lastRunDate: oldScheduler.lastRunDate,
      todayListedCount: oldScheduler.todayListedCount,
    }] : [],
    taskConfig: oldTaskConfig,
    violationWords: [],
    productSources: [],
    orderAssociations: [],
    realAddressCaches: [],
    logs: store.get('logs') || [],
    createdAt: Date.now(),
  };

  store.set('accounts', [account]);
  store.set('activeAccountId', account.id);
  store.delete('config');
  store.delete('scheduler');
  store.delete('taskConfig');
  store.delete('logs');
  deps.info?.('已迁移单账号数据到多账号格式');
}
