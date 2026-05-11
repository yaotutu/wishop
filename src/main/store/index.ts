import Store from 'electron-store';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export const logEmitter = new EventEmitter();

export interface Config {
  appId: string;
  appSecret: string;
}

export interface SchedulerConfig {
  enabled: boolean;
  cronExpression: string;
  dailyLimit: number;
  lastRunDate: string;
  todayListedCount: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  runId: string;
  productId: string;
  productTitle: string;
  action: 'list' | 'delete' | 'check';
  status: 'success' | 'failed';
  errorCode?: number;
  errorMsg?: string;
}

export interface TaskConfig {
  deleteFailed: boolean;
  deleteFailedConfirm: boolean;
  listUnreviewed: boolean;
  listUnreviewedQuantity: number;
}

export interface Account {
  id: string;
  name: string;
  config: Config;
  scheduler: SchedulerConfig;
  taskConfig: TaskConfig;
  logs: LogEntry[];
  createdAt: number;
}

export type AddLogFn = (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;

export interface StoreSchema {
  accounts: Account[];
  activeAccountId: string;
  // 旧版字段，仅用于迁移
  config?: Config;
  scheduler?: SchedulerConfig;
  taskConfig?: TaskConfig;
  logs?: LogEntry[];
}

const defaultScheduler: SchedulerConfig = {
  enabled: false,
  cronExpression: '0 9 * * *',
  dailyLimit: 100,
  lastRunDate: '',
  todayListedCount: 0,
};

const store = new Store<StoreSchema>({
  defaults: {
    accounts: [],
    activeAccountId: '',
  },
});

// --- Migration ---

function migrateIfNeeded(): void {
  const accounts = store.get('accounts');
  if (accounts && accounts.length > 0) return;

  const oldConfig = store.get('config');
  if (!oldConfig || (!oldConfig.appId && !oldConfig.appSecret)) return;

  const account: Account = {
    id: uuidv4(),
    name: '默认店铺',
    config: oldConfig,
    scheduler: store.get('scheduler') || { ...defaultScheduler },
    taskConfig: store.get('taskConfig') || { deleteFailed: false, deleteFailedConfirm: false, listUnreviewed: true, listUnreviewedQuantity: 2 },
    logs: store.get('logs') || [],
    createdAt: Date.now(),
  };

  store.set('accounts', [account]);
  store.set('activeAccountId', account.id);
  store.delete('config');
  store.delete('scheduler');
  store.delete('taskConfig');
  store.delete('logs');
  console.log('[Store] 已迁移单账号数据到多账号格式');
}

migrateIfNeeded();

// --- Account management ---

export function getAccounts(): Account[] {
  return store.get('accounts');
}

export function getAccount(accountId: string): Account | undefined {
  return store.get('accounts').find(a => a.id === accountId);
}

export function addAccount(name: string, config: Config): Account {
  const accounts = store.get('accounts');
  const account: Account = {
    id: uuidv4(),
    name,
    config,
    scheduler: { ...defaultScheduler },
    taskConfig: { deleteFailed: false, deleteFailedConfirm: false, listUnreviewed: true, listUnreviewedQuantity: 2 },
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

export function updateAccount(accountId: string, patch: Partial<Pick<Account, 'name' | 'config'>>): void {
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

// --- Per-account scheduler ---

export function getScheduler(accountId: string): SchedulerConfig {
  const account = getAccount(accountId);
  return account?.scheduler || { ...defaultScheduler };
}

export function setScheduler(accountId: string, scheduler: SchedulerConfig): void {
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return;
  accounts[idx].scheduler = scheduler;
  store.set('accounts', accounts);
}

// --- Per-account taskConfig ---

export function getTaskConfig(accountId: string): TaskConfig {
  const account = getAccount(accountId);
  return account?.taskConfig || { deleteFailed: false, deleteFailedConfirm: false, listUnreviewed: true, listUnreviewedQuantity: 2 };
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

export default store;
