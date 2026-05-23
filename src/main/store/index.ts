import Store from 'electron-store';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { Config, ScheduledTask, LogEntry, TaskConfig, AddLogFn, FullAccount, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule, ProductSourceBinding, ProductSourceItem, OrderAssociation, OrderAddressInfo, OrderRealAddressCache, LicenseState, ScheduledJob, ScheduledJobRunStats } from '../../shared/types';
import { createLogger } from '../utils/logger';
import type { GlobalLogEntry, GlobalLogInput } from '../../shared/global-log';
import type { NotificationEntry, NotificationPreference } from '../../shared/notification';
import type { AppSettings, AppSettingsPatch } from '../../shared/settings';
import { DEFAULT_APP_SETTINGS } from '../../shared/settings';
import type { CredentialMeta } from '../../shared/credentials';
import type { SyncModuleKey, SyncModuleSetting, SyncSettings } from '../../shared/sync';
import { DEFAULT_SYNC_SETTINGS } from '../../shared/sync';
import { createAccountRepository } from './repositories/account-repository';
import { createOrderRepository } from './repositories/order-repository';
import { createListingRepository } from './repositories/listing-repository';
import { createViolationRepository } from './repositories/violation-repository';
import { createScheduledJobRepository } from './repositories/scheduled-job-repository';
import { createLicenseRepository } from './repositories/license-repository';
import { createGlobalEventRepository } from './repositories/global-event-repository';
import { createAppSettingsRepository } from './repositories/app-settings-repository';
import { createSyncCredentialRepository } from './repositories/sync-credential-repository';
import { migrateStoreIfNeeded } from './migrations';

export type { Config, ScheduledTask, LogEntry, TaskConfig, AddLogFn, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule };
export type Account = FullAccount;

export const logEmitter = new EventEmitter();
let logCounter = 0;

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
  appSettings?: AppSettings;
  syncSettings?: SyncSettings;
  credentialMetas?: CredentialMeta[];
}

const store = new Store<StoreSchema>({
  defaults: {
    accounts: [],
    activeAccountId: '',
    appSettings: DEFAULT_APP_SETTINGS,
    syncSettings: DEFAULT_SYNC_SETTINGS,
    credentialMetas: [],
  },
});

const accountRepository = createAccountRepository({
  getAccounts: () => store.get('accounts'),
  setAccounts: accounts => store.set('accounts', accounts),
  getActiveAccountId: () => store.get('activeAccountId'),
  setActiveAccountId: accountId => store.set('activeAccountId', accountId),
  createId: () => uuidv4(),
  now: () => Date.now(),
  env: process.env,
});

const orderRepository = createOrderRepository({
  getAccounts: () => store.get('accounts'),
  setAccounts: accounts => store.set('accounts', accounts),
  now: () => Date.now(),
  createId: () => uuidv4(),
});

const listingRepository = createListingRepository({
  getAccounts: () => store.get('accounts'),
  setAccounts: accounts => store.set('accounts', accounts),
  getGlobal: <T,>(key: string) => store.get(key as keyof StoreSchema) as T | undefined,
  setGlobal: (key, value) => store.set(key as keyof StoreSchema, value as never),
  now: () => Date.now(),
  createId: () => `${Date.now()}-${++logCounter}`,
});

const violationRepository = createViolationRepository({
  getAccounts: () => store.get('accounts'),
  setAccounts: accounts => store.set('accounts', accounts),
});

const scheduledJobRepository = createScheduledJobRepository({
  getJobs: () => store.get('scheduledJobs') || [],
  setJobs: jobs => store.set('scheduledJobs', jobs),
  createId: () => uuidv4(),
  now: () => Date.now(),
});

const licenseRepository = createLicenseRepository({
  getLicenseState: () => store.get('licenseState'),
  setLicenseState: state => store.set('licenseState', state),
  createId: () => uuidv4(),
});

const globalEventRepository = createGlobalEventRepository({
  getGlobalLogs: () => store.get('globalLogs') || [],
  setGlobalLogs: logs => store.set('globalLogs', logs),
  getNotifications: () => store.get('notifications') || [],
  setNotifications: notifications => store.set('notifications', notifications),
  getNotificationPreference: () => store.get('notificationPreference'),
  setNotificationPreference: preference => store.set('notificationPreference', preference),
  createId: () => uuidv4(),
  now: () => Date.now(),
});

const appSettingsRepository = createAppSettingsRepository({
  getSettings: () => store.get('appSettings'),
  setSettings: settings => store.set('appSettings', settings),
});

const syncCredentialRepository = createSyncCredentialRepository({
  getSyncSettings: () => store.get('syncSettings'),
  setSyncSettings: settings => store.set('syncSettings', settings),
  getCredentialMetas: () => store.get('credentialMetas') || [],
  setCredentialMetas: metas => store.set('credentialMetas', metas),
  now: () => Date.now(),
});

migrateStoreIfNeeded(store, { info: message => createLogger('Store', 'system').info(message) });

// --- Account management ---

export function getAccounts(): FullAccount[] {
  return accountRepository.getAccounts();
}

export function getAccount(accountId: string): FullAccount | undefined {
  return accountRepository.getAccount(accountId);
}

export function addAccount(name: string, config: Config): FullAccount {
  return accountRepository.addAccount(name, config);
}

export function removeAccount(accountId: string): void {
  accountRepository.removeAccount(accountId);
}

export function updateAccount(accountId: string, patch: Partial<Pick<FullAccount, 'name' | 'config'>>): void {
  accountRepository.updateAccount(accountId, patch);
}

export function getActiveAccountId(): string {
  return store.get('activeAccountId');
}

export function setActiveAccountId(accountId: string): void {
  store.set('activeAccountId', accountId);
}

// --- Per-account config ---

export function getConfig(accountId: string): Config {
  return accountRepository.getConfig(accountId);
}

export function setConfig(accountId: string, config: Config): void {
  accountRepository.setConfig(accountId, config);
}

// --- Per-account schedulers ---

export function getSchedulers(accountId: string): ScheduledTask[] {
  return accountRepository.getSchedulers(accountId);
}

export function addScheduler(accountId: string, task: Omit<ScheduledTask, 'id' | 'lastRunDate' | 'todayListedCount'>): ScheduledTask {
  return accountRepository.addScheduler(accountId, task);
}

export function updateScheduler(accountId: string, taskId: string, patch: Partial<ScheduledTask>): void {
  accountRepository.updateScheduler(accountId, taskId, patch);
}

export function removeScheduler(accountId: string, taskId: string): void {
  accountRepository.removeScheduler(accountId, taskId);
}

// --- Global scheduled jobs ---

export function getScheduledJobs(): ScheduledJob[] {
  return scheduledJobRepository.getScheduledJobs();
}

export function addScheduledJob(input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): ScheduledJob {
  return scheduledJobRepository.addScheduledJob(input);
}

export function updateScheduledJob(jobId: string, patch: Partial<ScheduledJob>): void {
  scheduledJobRepository.updateScheduledJob(jobId, patch);
}

export function removeScheduledJob(jobId: string): void {
  scheduledJobRepository.removeScheduledJob(jobId);
}

export function removeScheduledJobsForAccount(accountId: string): void {
  scheduledJobRepository.removeScheduledJobsForAccount(accountId);
}

export function updateScheduledJobStats(jobId: string, patch: Partial<ScheduledJobRunStats>): void {
  scheduledJobRepository.updateScheduledJobStats(jobId, patch);
}

export function updateScheduledJobAccountStats(jobId: string, accountId: string, patch: Partial<ScheduledJobRunStats>): void {
  scheduledJobRepository.updateScheduledJobAccountStats(jobId, accountId, patch);
}

// --- Per-account taskConfig ---

export function getTaskConfig(accountId: string): TaskConfig {
  return listingRepository.getTaskConfig(accountId);
}

export function setTaskConfig(accountId: string, taskConfig: TaskConfig): void {
  listingRepository.setTaskConfig(accountId, taskConfig);
}

// --- Per-account logs ---

export function getLogs(accountId: string): LogEntry[] {
  return listingRepository.getLogs(accountId);
}

export function addLog(accountId: string, log: Omit<LogEntry, 'id' | 'timestamp'>): void {
  const entry = listingRepository.addLog(accountId, log);
  if (entry) logEmitter.emit(`log-added:${accountId}`, entry);
}

export function clearLogs(accountId: string): void {
  listingRepository.clearLogs(accountId);
}

export function cleanOldLogs(): void {
  listingRepository.cleanOldLogs();
}

// --- Per-account violation words ---

export function getViolationWords(accountId: string): string[] {
  return violationRepository.getViolationWords(accountId);
}

export function setViolationWords(accountId: string, words: string[]): void {
  violationRepository.setViolationWords(accountId, words);
}

// --- Per-account product sources ---

export function getProductSources(accountId: string): ProductSourceBinding[] {
  return orderRepository.getProductSources(accountId);
}

export function setProductSources(accountId: string, productId: string, sources: ProductSourceItem[]): ProductSourceBinding {
  return orderRepository.setProductSources(accountId, productId, sources);
}

export function removeProductSource(accountId: string, productId: string, sourceId: string): ProductSourceBinding {
  return orderRepository.removeProductSource(accountId, productId, sourceId);
}

// --- Per-account order associations ---

export function getOrderAssociations(accountId: string): OrderAssociation[] {
  return orderRepository.getOrderAssociations(accountId);
}

export function setOrderAssociation(
  accountId: string,
  orderId: string,
  input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>,
): OrderAssociation {
  return orderRepository.setOrderAssociation(accountId, orderId, input);
}

// --- Per-account real address cache ---

export function getRealAddressCaches(accountId: string): OrderRealAddressCache[] {
  return orderRepository.getRealAddressCaches(accountId);
}

export function getRealAddressCache(accountId: string, orderId: string): OrderRealAddressCache | null {
  return orderRepository.getRealAddressCache(accountId, orderId);
}

export function setRealAddressCache(accountId: string, orderId: string, address: OrderAddressInfo): OrderRealAddressCache {
  return orderRepository.setRealAddressCache(accountId, orderId, address);
}

// --- Global blacklist rules ---

export function getDefaultBlacklistCodes(): number[] {
  return listingRepository.getDefaultBlacklistCodes();
}

export function getBlacklistRules(): BlacklistRule[] {
  return listingRepository.getBlacklistRules();
}

export function setBlacklistRules(rules: BlacklistRule[]): void {
  listingRepository.setBlacklistRules(rules);
}

// --- Skip keywords (keywords in error message that should skip deletion) ---

export function getSkipKeywords(): string[] {
  return listingRepository.getSkipKeywords();
}

export function setSkipKeywords(keywords: string[]): void {
  listingRepository.setSkipKeywords(keywords);
}

// --- Global status rules (editStatus → action mapping) ---
// 控制任务执行时，不同 editStatus 状态码对应的处理方式
// 默认规则匹配原始硬编码逻辑，用户可通过 UI 自定义

export function getStatusRules(): StatusRule[] {
  return listingRepository.getStatusRules();
}

export function setStatusRules(rules: StatusRule[]): void {
  listingRepository.setStatusRules(rules);
}

export function getDefaultStatusRules(): StatusRule[] {
  return listingRepository.getDefaultStatusRules();
}

// --- License state ---

export function getLicenseState(): LicenseState {
  return licenseRepository.getLicenseState();
}

export function setLicenseState(patch: Partial<LicenseState>): LicenseState {
  return licenseRepository.setLicenseState(patch);
}

// --- Global logs ---

export function getGlobalLogs(): GlobalLogEntry[] {
  return globalEventRepository.getGlobalLogs();
}

export function addGlobalLog(input: GlobalLogInput): GlobalLogEntry {
  return globalEventRepository.addGlobalLog(input);
}

export function clearGlobalLogs(): void {
  globalEventRepository.clearGlobalLogs();
}

// --- Notifications ---

export function getNotificationPreference(): NotificationPreference {
  return globalEventRepository.getNotificationPreference();
}

export function updateNotificationPreference(patch: Partial<NotificationPreference>): NotificationPreference {
  return globalEventRepository.updateNotificationPreference(patch);
}

export function getNotifications(): NotificationEntry[] {
  return globalEventRepository.getNotifications();
}

export function markNotificationRead(notificationId: string): NotificationEntry[] {
  return globalEventRepository.markNotificationRead(notificationId);
}

export function markAllNotificationsRead(): NotificationEntry[] {
  return globalEventRepository.markAllNotificationsRead();
}

export function clearNotifications(): void {
  globalEventRepository.clearNotifications();
}

// --- App settings ---

export function getAppSettings(): AppSettings {
  return appSettingsRepository.getAppSettings();
}

export function updateAppSettings(patch: AppSettingsPatch): AppSettings {
  return appSettingsRepository.updateAppSettings(patch);
}

// --- Sync settings ---

export function getSyncSettings(): SyncSettings {
  return syncCredentialRepository.getSyncSettings();
}

export function updateSyncModuleSetting(module: SyncModuleKey, patch: Partial<SyncModuleSetting>): SyncSettings {
  return syncCredentialRepository.updateSyncModuleSetting(module, patch);
}

// --- Credential metadata ---

export function getCredentialMetas(accountId?: string): CredentialMeta[] {
  return syncCredentialRepository.getCredentialMetas(accountId);
}

export function saveLocalCredentialMeta(input: {
  accountId: string;
  platform: CredentialMeta['platform'];
  scope: CredentialMeta['scope'];
}): CredentialMeta {
  return syncCredentialRepository.saveLocalCredentialMeta(input);
}

export function authorizeCredentialMetaForCloud(credentialId: string): CredentialMeta {
  return syncCredentialRepository.authorizeCredentialMetaForCloud(credentialId);
}

export function revokeCredentialMetaCloudAuthorization(credentialId: string): CredentialMeta {
  return syncCredentialRepository.revokeCredentialMetaCloudAuthorization(credentialId);
}

export default store;
