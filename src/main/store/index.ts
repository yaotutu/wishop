import Store from 'electron-store';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { Config, ScheduledTask, LogEntry, TaskConfig, AddLogFn, FullAccount, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule, StoredOrderSnapshot, OrderSyncAccountState, ScheduledJob, ProductSourceBinding, OrderAssociation, OrderRealAddressCache, LicenseState } from '../../shared/types';
import type { ActivityLogEntry } from '../../shared/activity-log';
import type { NotificationEntry, NotificationPreference } from '../../shared/notification';
import type { AppSettings } from '../../shared/settings';
import { createLogger } from '../utils/logger';

export type { Config, ScheduledTask, LogEntry, TaskConfig, AddLogFn, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule };
export type Account = FullAccount;

export const logEmitter = new EventEmitter();

export function createScopedAddLog(accountId: string): AddLogFn {
  return (log: Omit<LogEntry, 'id' | 'timestamp'>) => addLog(accountId, log);
}

export interface StoreSchema {
  accounts: FullAccount[];
  activeAccountId: string;
  wxAccessTokens?: Record<string, StoredWxAccessToken>;
  orderSnapshots?: StoredOrderSnapshot[];
  orderSyncStates?: Record<string, OrderSyncAccountState>;
  scheduledJobs?: ScheduledJob[];
  activityLogs?: ActivityLogEntry[];
  notifications?: NotificationEntry[];
  notificationPreference?: NotificationPreference;
  appSettings?: AppSettings;
  licenseState?: LicenseState;
  config?: Config;
  scheduler?: { enabled: boolean; cronExpression: string; dailyLimit: number; lastRunDate: string; todayListedCount: number };
  taskConfig?: TaskConfig;
  logs?: LogEntry[];
  skipKeywords?: string[];
  blacklistRules?: BlacklistRule[];
  statusRules?: StatusRule[];
}

export interface StoredWxAccessToken {
  accountId: string;
  appId: string;
  accessToken: string;
  expiresAt: number;
  updatedAt: number;
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
      if (!('listingLogs' in account)) {
        account.listingLogs = account.logs || [];
        changed = true;
      }
      if (!('violationLogs' in account)) {
        account.violationLogs = [];
        changed = true;
      }
      if (!('productSources' in account)) {
        account.productSources = [];
        changed = true;
      }
      if (!('orderAssociations' in account)) {
        account.orderAssociations = [];
        changed = true;
      }
      if (!('realAddressCaches' in account)) {
        account.realAddressCaches = [];
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
    listingLogs: store.get('logs') || [],
    violationLogs: [],
    productSources: [],
    orderAssociations: [],
    realAddressCaches: [],
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
    listingLogs: [],
    violationLogs: [],
    productSources: [],
    orderAssociations: [],
    realAddressCaches: [],
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
  { code: 1002002, description: '本店铺近1天内提审次数超过限制，请1天后再试' },
  { code: 10020066, description: '本店铺近1小时内提审次数超过限制，请1小时后再试' },
  { code: 10020111, description: '本店铺近1天内提审次数超过限制，请1天后再试' },
  { code: 6600148, description: '今日提审次数已用尽，请明日再试' },
  { code: 10020208, description: '本店铺的上架功能被封禁，请登录微信小店后台管理页查看详情' },
  { code: 10020246, description: '0元保证金试运营商品数超出限制，上架中与审核中商品总数不得超过100个' },
  { code: 10020247, description: '由于未在限定时间内完成升级，该店铺已被限制商品新增能力' },
];

export function getDefaultBlacklistCodes(): number[] {
  return DEFAULT_BLACKLIST.map(r => r.code);
}

export function getBlacklistRules(): BlacklistRule[] {
  const stored = store.get('blacklistRules');
  if (!stored) return DEFAULT_BLACKLIST;
  const codeSet = new Set(stored.map(r => r.code));
  return [...stored, ...DEFAULT_BLACKLIST.filter(r => !codeSet.has(r.code))];
}

export function setBlacklistRules(rules: BlacklistRule[]): void {
  const defaultCodes = new Set(DEFAULT_BLACKLIST.map(r => r.code));
  store.set('blacklistRules', rules.filter(r => !defaultCodes.has(r.code)));
}

// --- Skip keywords (keywords in error message that should skip deletion) ---

export function getSkipKeywords(): string[] {
  return store.get('skipKeywords') || [];
}

export function setSkipKeywords(keywords: string[]): void {
  store.set('skipKeywords', keywords);
}

// --- Global status rules (editStatus → action mapping) ---
// 控制任务执行时，不同 editStatus 状态码对应的处理方式
// 默认规则匹配原始硬编码逻辑，用户可通过 UI 自定义

const DEFAULT_STATUS_RULES: StatusRule[] = [
  { editStatus: 72, label: '未审核',   action: 'submit' },
  { editStatus: 1,  label: '编辑中',   action: 'submit' },
  { editStatus: 3,  label: '审核失败', action: 'delete' },
  { editStatus: 2,  label: '审核中',   action: 'skip' },
  { editStatus: 4,  label: '成功',     action: 'skip' },
  { editStatus: 7,  label: '上传中',   action: 'skip' },
  { editStatus: 8,  label: '上传失败', action: 'skip' },
];

export function getStatusRules(): StatusRule[] {
  const stored = store.get('statusRules');
  if (!stored) return DEFAULT_STATUS_RULES;
  const statusSet = new Set(stored.map(r => r.editStatus));
  return [...stored, ...DEFAULT_STATUS_RULES.filter(r => !statusSet.has(r.editStatus))];
}

export function setStatusRules(rules: StatusRule[]): void {
  store.set('statusRules', rules);
}

export function getDefaultStatusRules(): StatusRule[] {
  return DEFAULT_STATUS_RULES;
}

// --- Desktop key-value helpers for migrated services ---

export function readStore(): StoreSchema {
  return store.store as StoreSchema;
}

export function writeStore(patch: Partial<StoreSchema>): void {
  for (const [key, value] of Object.entries(patch)) {
    store.set(key as keyof StoreSchema, value as never);
  }
}

// --- Per-account product sources ---

export function getProductSources(accountId: string): ProductSourceBinding[] {
  return getAccount(accountId)?.productSources || [];
}

export function setProductSources(accountId: string, productId: string, sources: ProductSourceBinding['sources']): ProductSourceBinding {
  const now = Date.now();
  const binding: ProductSourceBinding = { productId, sources };
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return binding;
  accounts[idx].productSources = accounts[idx].productSources || [];
  const existingIdx = accounts[idx].productSources.findIndex(item => item.productId === productId);
  const normalized = {
    productId,
    sources: sources.map(item => ({
      ...item,
      createdAt: item.createdAt || now,
      updatedAt: now,
    })),
  };
  if (existingIdx >= 0) accounts[idx].productSources[existingIdx] = normalized;
  else accounts[idx].productSources.push(normalized);
  store.set('accounts', accounts);
  return normalized;
}

export function removeProductSource(accountId: string, productId: string, sourceId: string): ProductSourceBinding {
  const current = getProductSources(accountId).find(item => item.productId === productId);
  return setProductSources(accountId, productId, (current?.sources || []).filter(item => item.id !== sourceId));
}

// --- Per-account order associations ---

export function getOrderAssociations(accountId: string): OrderAssociation[] {
  return getAccount(accountId)?.orderAssociations || [];
}

export function setOrderAssociation(
  accountId: string,
  orderId: string,
  input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>,
): OrderAssociation {
  const now = Date.now();
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  const previous = idx >= 0 ? accounts[idx].orderAssociations?.find(item => item.orderId === orderId) : undefined;
  const association: OrderAssociation = {
    orderId,
    internalRemark: input.internalRemark,
    linkedOrders: input.linkedOrders,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };
  if (idx === -1) return association;
  accounts[idx].orderAssociations = accounts[idx].orderAssociations || [];
  const existingIdx = accounts[idx].orderAssociations.findIndex(item => item.orderId === orderId);
  if (existingIdx >= 0) accounts[idx].orderAssociations[existingIdx] = association;
  else accounts[idx].orderAssociations.push(association);
  store.set('accounts', accounts);
  return association;
}

// --- Per-account real address cache ---

export function getRealAddressCaches(accountId: string): OrderRealAddressCache[] {
  return getAccount(accountId)?.realAddressCaches || [];
}

export function getRealAddressCache(accountId: string, orderId: string): OrderRealAddressCache | null {
  return getRealAddressCaches(accountId).find(item => item.orderId === orderId) || null;
}

export function setRealAddressCache(accountId: string, orderId: string, address: OrderRealAddressCache['address']): OrderRealAddressCache {
  const now = Date.now();
  const previous = getRealAddressCache(accountId, orderId);
  const cache: OrderRealAddressCache = {
    orderId,
    address,
    fetchedAt: previous?.fetchedAt || now,
    updatedAt: now,
  };
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return cache;
  accounts[idx].realAddressCaches = accounts[idx].realAddressCaches || [];
  const existingIdx = accounts[idx].realAddressCaches.findIndex(item => item.orderId === orderId);
  if (existingIdx >= 0) accounts[idx].realAddressCaches[existingIdx] = cache;
  else accounts[idx].realAddressCaches.push(cache);
  store.set('accounts', accounts);
  return cache;
}

export default store;
