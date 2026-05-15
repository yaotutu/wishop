import Store from 'electron-store';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { Config, ScheduledTask, LogEntry, TaskConfig, AddLogFn, FullAccount, ViolationMatch, ViolationScanResult, BlacklistRule } from '../../shared/types';
import { createLogger } from '../utils/logger';

export type { Config, ScheduledTask, LogEntry, TaskConfig, AddLogFn, ViolationMatch, ViolationScanResult, BlacklistRule };
export type Account = FullAccount;

export const logEmitter = new EventEmitter();

export function createScopedAddLog(accountId: string): AddLogFn {
  return (log: Omit<LogEntry, 'id' | 'timestamp'>) => addLog(accountId, log);
}

export interface StoreSchema {
  accounts: FullAccount[];
  activeAccountId: string;
  config?: Config;
  scheduler?: { enabled: boolean; cronExpression: string; dailyLimit: number; lastRunDate: string; todayListedCount: number };
  taskConfig?: TaskConfig;
  logs?: LogEntry[];
  skipCodeRules?: BlacklistRule[];
  blacklistRules?: BlacklistRule[];
}

const store = new Store<StoreSchema>({
  defaults: {
    accounts: [],
    activeAccountId: '',
  },
});

// --- Migration ---

function migrateIfNeeded(): void {
  const rawAccounts: any[] = store.get('accounts') as any[];

  // Migrate old single-account data to multi-account
  if (rawAccounts && rawAccounts.length > 0) {
    let changed = false;
    for (const account of rawAccounts) {
      // Migrate scheduler (single object) → schedulers (array)
      if ('scheduler' in account && !('schedulers' in account)) {
        const oldScheduler = (account as any).scheduler;
        if (oldScheduler) {
          account.schedulers = [{
            id: uuidv4(),
            name: '默认任务',
            enabled: oldScheduler.enabled,
            cronExpression: oldScheduler.cronExpression,
            dailyLimit: oldScheduler.dailyLimit,
            taskConfig: account.taskConfig || { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true },
            lastRunDate: oldScheduler.lastRunDate,
            todayListedCount: oldScheduler.todayListedCount,
          }];
        } else {
          account.schedulers = [];
        }
        delete (account as any).scheduler;
        changed = true;
      }
      // Ensure schedulers field exists
      if (!('schedulers' in account)) {
        account.schedulers = [];
        changed = true;
      }
      // Ensure violationWords field exists
      if (!('violationWords' in account)) {
        account.violationWords = [];
        changed = true;
      }
    }
    if (changed) store.set('accounts', rawAccounts as FullAccount[]);
    return;
  }

  const oldConfig = store.get('config');
  if (!oldConfig || (!oldConfig.appId && !oldConfig.appSecret)) return;

  const oldScheduler = store.get('scheduler');
  const oldTaskConfig = store.get('taskConfig') || { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true };

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
    logs: store.get('logs') || [],
    createdAt: Date.now(),
  };

  store.set('accounts', [account]);
  store.set('activeAccountId', account.id);
  store.delete('config');
  store.delete('scheduler');
  store.delete('taskConfig');
  store.delete('logs');
  const logger = createLogger('Store', 'system');
  logger.info('已迁移单账号数据到多账号格式');
}

migrateIfNeeded();

// --- Account management ---

export function getAccounts(): FullAccount[] {
  return store.get('accounts');
}

export function getAccount(accountId: string): FullAccount | undefined {
  return store.get('accounts').find(a => a.id === accountId);
}

export function addAccount(name: string, config: Config): FullAccount {
  const accounts = store.get('accounts');
  const account: FullAccount = {
    id: uuidv4(),
    name,
    config,
    schedulers: [],
    taskConfig: { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true },
    violationWords: [],
    logs: [],
    createdAt: Date.now(),
  };
  accounts.push(account);
  store.set('accounts', accounts);
  if (!store.get('activeAccountId')) {
    store.set('activeAccountId', account.id);
  }
  return account;
}

export function removeAccount(accountId: string): void {
  const accounts = store.get('accounts').filter(a => a.id !== accountId);
  store.set('accounts', accounts);
  if (store.get('activeAccountId') === accountId) {
    store.set('activeAccountId', accounts.length > 0 ? accounts[0].id : '');
  }
}

export function updateAccount(accountId: string, patch: Partial<Pick<FullAccount, 'name' | 'config'>>): void {
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return;
  if (patch.name !== undefined) accounts[idx].name = patch.name;
  if (patch.config !== undefined) accounts[idx].config = patch.config;
  store.set('accounts', accounts);
}

export function getActiveAccountId(): string {
  return store.get('activeAccountId');
}

export function setActiveAccountId(accountId: string): void {
  store.set('activeAccountId', accountId);
}

// --- Per-account config ---

export function getConfig(accountId: string): Config {
  const account = getAccount(accountId);
  if (!account) return { appId: '', appSecret: '' };
  return {
    appId: account.config.appId || process.env.WECHAT_APP_ID || '',
    appSecret: account.config.appSecret || process.env.WECHAT_APP_SECRET || '',
  };
}

export function setConfig(accountId: string, config: Config): void {
  updateAccount(accountId, { config });
}

// --- Per-account schedulers ---

export function getSchedulers(accountId: string): ScheduledTask[] {
  const account = getAccount(accountId);
  return account?.schedulers || [];
}

export function addScheduler(accountId: string, task: Omit<ScheduledTask, 'id' | 'lastRunDate' | 'todayListedCount'>): ScheduledTask {
  const newTask: ScheduledTask = {
    ...task,
    id: uuidv4(),
    lastRunDate: '',
    todayListedCount: 0,
  };
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return newTask;
  accounts[idx].schedulers.push(newTask);
  store.set('accounts', accounts);
  return newTask;
}

export function updateScheduler(accountId: string, taskId: string, patch: Partial<ScheduledTask>): void {
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return;
  const taskIdx = accounts[idx].schedulers.findIndex(t => t.id === taskId);
  if (taskIdx === -1) return;
  accounts[idx].schedulers[taskIdx] = { ...accounts[idx].schedulers[taskIdx], ...patch };
  store.set('accounts', accounts);
}

export function removeScheduler(accountId: string, taskId: string): void {
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return;
  accounts[idx].schedulers = accounts[idx].schedulers.filter(t => t.id !== taskId);
  store.set('accounts', accounts);
}

// --- Per-account taskConfig ---

export function getTaskConfig(accountId: string): TaskConfig {
  const account = getAccount(accountId);
  return account?.taskConfig || { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true };
}

export function setTaskConfig(accountId: string, taskConfig: TaskConfig): void {
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return;
  accounts[idx].taskConfig = taskConfig;
  store.set('accounts', accounts);
}

// --- Per-account logs ---

let logCounter = 0;

export function getLogs(accountId: string): LogEntry[] {
  const account = getAccount(accountId);
  if (!account) return [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return account.logs.filter(log => log.timestamp > sevenDaysAgo);
}

export function addLog(accountId: string, log: Omit<LogEntry, 'id' | 'timestamp'>): void {
  logCounter++;
  const entry: LogEntry = {
    ...log,
    id: `${Date.now()}-${logCounter}`,
    timestamp: Date.now(),
  };
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return;
  // Clean old logs inline
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  accounts[idx].logs = accounts[idx].logs.filter(l => l.timestamp > sevenDaysAgo);
  accounts[idx].logs.push(entry);
  store.set('accounts', accounts);
  logEmitter.emit(`log-added:${accountId}`, entry);
}

export function clearLogs(accountId: string): void {
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return;
  accounts[idx].logs = [];
  store.set('accounts', accounts);
}

export function cleanOldLogs(): void {
  const accounts = store.get('accounts');
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const account of accounts) {
    const filtered = account.logs.filter(log => log.timestamp > sevenDaysAgo);
    if (filtered.length !== account.logs.length) {
      account.logs = filtered;
      changed = true;
    }
  }
  if (changed) store.set('accounts', accounts);
}

// --- Per-account violation words ---

export function getViolationWords(accountId: string): string[] {
  const account = getAccount(accountId);
  return account?.violationWords || [];
}

export function setViolationWords(accountId: string, words: string[]): void {
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return;
  accounts[idx].violationWords = words;
  store.set('accounts', accounts);
}

// --- Global blacklist rules ---

const DEFAULT_BLACKLIST: BlacklistRule[] = [
  { code: 1002002, description: '账号级错误' },
  { code: 10020066, description: '账号级错误' },
  { code: 10020111, description: '账号级错误' },
  { code: 10020208, description: '操作频率限制' },
  { code: 10020246, description: '账号级错误' },
  { code: 10020247, description: '账号级错误' },
];

export function getBlacklistRules(): BlacklistRule[] {
  return store.get('blacklistRules') || DEFAULT_BLACKLIST;
}

export function setBlacklistRules(rules: BlacklistRule[]): void {
  store.set('blacklistRules', rules);
}

export default store;
