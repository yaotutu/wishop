import Store from 'electron-store';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { Config, ScheduledTask, LogEntry, TaskConfig, AddLogFn, FullAccount, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule, ProductSourceBinding, ProductSourceItem, OrderAssociation, LinkedPlatformOrder, OrderAddressInfo, OrderRealAddressCache, LicenseState, ScheduledJob, ScheduledJobRunStats } from '../../shared/types';
import { createLogger } from '../utils/logger';
import type { GlobalLogEntry, GlobalLogInput } from '../../shared/global-log';
import type { NotificationEntry, NotificationPreference } from '../../shared/notification';
import { DEFAULT_NOTIFICATION_PREFERENCE } from '../../shared/notification';

export type { Config, ScheduledTask, LogEntry, TaskConfig, AddLogFn, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule };
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
  skipKeywords?: string[];
  blacklistRules?: BlacklistRule[];
  statusRules?: StatusRule[];
  licenseState?: LicenseState;
  scheduledJobs?: ScheduledJob[];
  globalLogs?: GlobalLogEntry[];
  notifications?: NotificationEntry[];
  notificationPreference?: NotificationPreference;
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
    productSources: [],
    orderAssociations: [],
    realAddressCaches: [],
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

// --- Global scheduled jobs ---

const EMPTY_SCHEDULED_JOB_STATS: ScheduledJobRunStats = {
  lastRunDate: '',
  todayRunCount: 0,
};

export function getScheduledJobs(): ScheduledJob[] {
  return store.get('scheduledJobs') || [];
}

export function addScheduledJob(input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): ScheduledJob {
  const timestamp = Date.now();
  const job: ScheduledJob = {
    ...input,
    id: uuidv4(),
    stats: { ...EMPTY_SCHEDULED_JOB_STATS },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.set('scheduledJobs', [...getScheduledJobs(), job]);
  return job;
}

export function updateScheduledJob(jobId: string, patch: Partial<ScheduledJob>): void {
  store.set('scheduledJobs', getScheduledJobs().map(job => (
    job.id === jobId ? { ...job, ...patch, updatedAt: Date.now() } : job
  )));
}

export function removeScheduledJob(jobId: string): void {
  store.set('scheduledJobs', getScheduledJobs().filter(job => job.id !== jobId));
}

export function removeScheduledJobsForAccount(accountId: string): void {
  store.set('scheduledJobs', getScheduledJobs()
    .filter(job => job.scope !== 'account' || job.accountId !== accountId)
    .map(job => {
      if (job.scope !== 'global' || !job.accountStats?.[accountId]) return job;
      const { [accountId]: _removed, ...accountStats } = job.accountStats;
      return { ...job, accountStats, updatedAt: Date.now() };
    }));
}

export function updateScheduledJobStats(jobId: string, patch: Partial<ScheduledJobRunStats>): void {
  store.set('scheduledJobs', getScheduledJobs().map(job => (
    job.id === jobId
      ? { ...job, stats: { ...job.stats, ...patch }, updatedAt: Date.now() }
      : job
  )));
}

export function updateScheduledJobAccountStats(jobId: string, accountId: string, patch: Partial<ScheduledJobRunStats>): void {
  store.set('scheduledJobs', getScheduledJobs().map(job => {
    if (job.id !== jobId) return job;
    const prev = job.accountStats?.[accountId] || EMPTY_SCHEDULED_JOB_STATS;
    return {
      ...job,
      accountStats: {
        ...(job.accountStats || {}),
        [accountId]: { ...prev, ...patch },
      },
      updatedAt: Date.now(),
    };
  }));
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

// --- Per-account product sources ---

export function getProductSources(accountId: string): ProductSourceBinding[] {
  return getAccount(accountId)?.productSources || [];
}

export function setProductSources(accountId: string, productId: string, sources: ProductSourceItem[]): ProductSourceBinding {
  const now = Date.now();
  const normalizedSources: ProductSourceItem[] = sources
    .map(source => ({
      id: source.id || uuidv4(),
      url: source.url.trim(),
      quantity: Number.isFinite(source.quantity) && source.quantity > 0 ? source.quantity : 1,
      remark: source.remark.trim(),
      createdAt: source.createdAt || now,
      updatedAt: now,
    }))
    .filter(source => source.url);
  const binding: ProductSourceBinding = { productId, sources: normalizedSources };

  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return binding;
  const existing = accounts[idx].productSources || [];
  accounts[idx].productSources = normalizedSources.length > 0
    ? [...existing.filter(item => item.productId !== productId), binding]
    : existing.filter(item => item.productId !== productId);
  store.set('accounts', accounts);
  return binding;
}

export function removeProductSource(accountId: string, productId: string, sourceId: string): ProductSourceBinding {
  const sources = getProductSources(accountId)
    .find(item => item.productId === productId)
    ?.sources
    .filter(source => source.id !== sourceId) || [];
  return setProductSources(accountId, productId, sources);
}

// --- Per-account order associations ---

function normalizeLinkedOrder(order: Partial<LinkedPlatformOrder>, now: number): LinkedPlatformOrder {
  return {
    id: order.id || uuidv4(),
    platform: order.platform || 'taobao',
    platformOrderId: order.platformOrderId?.trim() || '',
    platformOrderStatus: order.platformOrderStatus?.trim() || '',
    logisticsStatus: order.logisticsStatus?.trim() || '',
    logisticsCompany: order.logisticsCompany?.trim() || '',
    trackingNumber: order.trackingNumber?.trim() || '',
    remark: order.remark?.trim() || '',
    createdAt: order.createdAt || now,
    updatedAt: now,
  };
}

export function getOrderAssociations(accountId: string): OrderAssociation[] {
  return getAccount(accountId)?.orderAssociations || [];
}

export function setOrderAssociation(
  accountId: string,
  orderId: string,
  input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>,
): OrderAssociation {
  const now = Date.now();
  const existing = getOrderAssociations(accountId).find(item => item.orderId === orderId);
  const linkedOrders = input.linkedOrders
    .map(order => normalizeLinkedOrder(order, now))
    .filter(order => order.platformOrderId || order.platformOrderStatus || order.logisticsStatus || order.logisticsCompany || order.trackingNumber || order.remark);
  const association: OrderAssociation = {
    orderId,
    internalRemark: input.internalRemark.trim(),
    linkedOrders,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return association;
  const associations = accounts[idx].orderAssociations || [];
  const hasContent = association.internalRemark || association.linkedOrders.length > 0;
  accounts[idx].orderAssociations = hasContent
    ? [...associations.filter(item => item.orderId !== orderId), association]
    : associations.filter(item => item.orderId !== orderId);
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

export function setRealAddressCache(accountId: string, orderId: string, address: OrderAddressInfo): OrderRealAddressCache {
  const now = Date.now();
  const cache: OrderRealAddressCache = {
    orderId,
    address,
    fetchedAt: now,
    updatedAt: now,
  };
  const accounts = store.get('accounts');
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) return cache;
  const caches = accounts[idx].realAddressCaches || [];
  accounts[idx].realAddressCaches = [...caches.filter(item => item.orderId !== orderId), cache];
  store.set('accounts', accounts);
  return cache;
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

// --- License state ---

function createDefaultLicenseState(): LicenseState {
  const stored = store.get('licenseState');
  return {
    enforcementEnabled: false,
    status: 'inactive',
    plan: 'none',
    deviceId: stored?.deviceId || uuidv4(),
  };
}

export function getLicenseState(): LicenseState {
  const stored = store.get('licenseState');
  return {
    ...createDefaultLicenseState(),
    ...stored,
    enforcementEnabled: stored?.enforcementEnabled === true,
  };
}

export function setLicenseState(patch: Partial<LicenseState>): LicenseState {
  const next = { ...getLicenseState(), ...patch };
  store.set('licenseState', next);
  return next;
}

// --- Global logs ---

export function getGlobalLogs(): GlobalLogEntry[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return (store.get('globalLogs') || []).filter(log => log.timestamp > sevenDaysAgo);
}

export function addGlobalLog(input: GlobalLogInput): GlobalLogEntry {
  const entry: GlobalLogEntry = {
    ...input,
    id: uuidv4(),
    timestamp: Date.now(),
  };
  store.set('globalLogs', [entry, ...getGlobalLogs()].slice(0, 1000));
  maybeCreateNotification(entry);
  return entry;
}

export function clearGlobalLogs(): void {
  store.set('globalLogs', []);
}

// --- Notifications ---

export function getNotificationPreference(): NotificationPreference {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCE,
    ...(store.get('notificationPreference') || {}),
    levelEnabled: {
      ...DEFAULT_NOTIFICATION_PREFERENCE.levelEnabled,
      ...(store.get('notificationPreference')?.levelEnabled || {}),
    },
    moduleEnabled: {
      ...DEFAULT_NOTIFICATION_PREFERENCE.moduleEnabled,
      ...(store.get('notificationPreference')?.moduleEnabled || {}),
    },
    eventTypeEnabled: {
      ...DEFAULT_NOTIFICATION_PREFERENCE.eventTypeEnabled,
      ...(store.get('notificationPreference')?.eventTypeEnabled || {}),
    },
  };
}

export function updateNotificationPreference(patch: Partial<NotificationPreference>): NotificationPreference {
  const current = getNotificationPreference();
  const next: NotificationPreference = {
    ...current,
    ...patch,
    levelEnabled: { ...current.levelEnabled, ...(patch.levelEnabled || {}) },
    moduleEnabled: { ...current.moduleEnabled, ...(patch.moduleEnabled || {}) },
    eventTypeEnabled: { ...current.eventTypeEnabled, ...(patch.eventTypeEnabled || {}) },
  };
  store.set('notificationPreference', next);
  return next;
}

export function getNotifications(): NotificationEntry[] {
  return store.get('notifications') || [];
}

function shouldNotify(log: GlobalLogEntry): boolean {
  const preference = getNotificationPreference();
  return preference.inAppEnabled
    && preference.levelEnabled[log.level] !== false
    && preference.moduleEnabled[log.module] !== false
    && preference.eventTypeEnabled[log.eventType] !== false;
}

function maybeCreateNotification(log: GlobalLogEntry): void {
  if (!shouldNotify(log)) return;
  const notification: NotificationEntry = {
    id: uuidv4(),
    sourceLogId: log.id,
    timestamp: log.timestamp,
    channel: 'inApp',
    deliveryStatus: 'delivered',
    level: log.level,
    module: log.module,
    eventType: log.eventType,
    title: log.title,
    detail: log.detail,
    errorMessage: log.error?.message,
    accountId: log.accountId,
    accountName: log.accountName,
    taskKind: log.taskKind,
    runId: log.runId,
    metadata: log.metadata,
  };
  store.set('notifications', [notification, ...getNotifications()].slice(0, 500));
}

export function markNotificationRead(notificationId: string): NotificationEntry[] {
  const timestamp = Date.now();
  const next = getNotifications().map(notification => (
    notification.id === notificationId
      ? { ...notification, readAt: notification.readAt || timestamp, deliveryStatus: 'read' as const }
      : notification
  ));
  store.set('notifications', next);
  return next;
}

export function markAllNotificationsRead(): NotificationEntry[] {
  const timestamp = Date.now();
  const next = getNotifications().map(notification => ({
    ...notification,
    readAt: notification.readAt || timestamp,
    deliveryStatus: 'read' as const,
  }));
  store.set('notifications', next);
  return next;
}

export function clearNotifications(): void {
  store.set('notifications', []);
}

export default store;
