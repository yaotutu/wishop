import { EventEmitter } from 'events';
import type { Config, LogEntry, TaskConfig, AddLogFn, FullAccount, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule, ProductSourceBinding, ProductSourceItem, OrderAssociation, OrderAddressInfo, OrderRealAddressCache, LicenseState, ScheduledJob, ScheduledJobRunStats, ListingRulesConfig, ListingSettings } from '../../shared/types';
import type { GlobalLogEntry, GlobalLogInput } from '../../shared/global-log';
import type { NotificationEntry, NotificationPreference } from '../../shared/notification';
import type { AppSettings, AppSettingsPatch } from '../../shared/settings';
import type { CredentialMeta } from '../../shared/credentials';
import type { SyncModuleKey, SyncModuleSetting, SyncSettings } from '../../shared/sync';
import store, {
  accountRepository,
  appSettingsRepository,
  globalEventRepository,
  licenseRepository,
  listingRepository,
  orderRepository,
  scheduledJobRepository,
  syncCredentialRepository,
  violationRepository,
} from './container';
export type { StoreSchema } from './container';

export type { Config, LogEntry, TaskConfig, AddLogFn, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule, ListingRulesConfig, ListingSettings };
export type Account = FullAccount;

export const logEmitter = new EventEmitter();

export function createScopedAddLog(accountId: string): AddLogFn {
  return (log: Omit<LogEntry, 'id' | 'timestamp'>) => addLog(accountId, log);
}

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

// --- Global scheduled jobs ---

export function getScheduledJobs(): ScheduledJob[] {
  return scheduledJobRepository.getScheduledJobs();
}

export function normalizeScheduledJobSingletons(): ScheduledJob[] {
  return scheduledJobRepository.normalizeScheduledJobSingletons();
}

export function addScheduledJob(input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): ScheduledJob {
  return scheduledJobRepository.addScheduledJob(input);
}

export function upsertScheduledJobSingleton(
  singletonKey: string,
  input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>,
): ScheduledJob {
  return scheduledJobRepository.upsertScheduledJobSingleton(singletonKey, input);
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

// --- Listing task config and inheritance ---

export function getListingSettings(accountId: string): ListingSettings {
  return listingRepository.getListingSettings(accountId);
}

export function getGlobalTaskConfig(): TaskConfig {
  return listingRepository.getGlobalTaskConfig();
}

export function setGlobalTaskConfig(taskConfig: TaskConfig): void {
  listingRepository.setGlobalTaskConfig(taskConfig);
}

export function getTaskConfig(accountId: string): TaskConfig {
  return listingRepository.getTaskConfig(accountId);
}

export function setTaskConfig(accountId: string, taskConfig: TaskConfig): void {
  listingRepository.setTaskConfig(accountId, taskConfig);
}

export function setAccountTaskConfigEnabled(accountId: string, enabled: boolean): void {
  listingRepository.setAccountTaskConfigEnabled(accountId, enabled);
}

export function getEffectiveTaskConfig(accountId: string): TaskConfig {
  return listingRepository.getEffectiveTaskConfig(accountId);
}

export function setAccountGlobalScheduledEnabled(accountId: string, enabled: boolean): void {
  listingRepository.setAccountGlobalScheduledEnabled(accountId, enabled);
}

export function isAccountGlobalScheduledEnabled(accountId: string): boolean {
  return listingRepository.isAccountGlobalScheduledEnabled(accountId);
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

export function getAccountRules(accountId: string): ListingRulesConfig {
  return listingRepository.getAccountRules(accountId);
}

export function setAccountRules(accountId: string, rules: ListingRulesConfig): void {
  listingRepository.setAccountRules(accountId, rules);
}

export function setAccountRulesEnabled(accountId: string, enabled: boolean): void {
  listingRepository.setAccountRulesEnabled(accountId, enabled);
}

export function getEffectiveBlacklistRules(accountId: string): BlacklistRule[] {
  return listingRepository.getEffectiveBlacklistRules(accountId);
}

export function getEffectiveSkipKeywords(accountId: string): string[] {
  return listingRepository.getEffectiveSkipKeywords(accountId);
}

export function getEffectiveStatusRules(accountId: string): StatusRule[] {
  return listingRepository.getEffectiveStatusRules(accountId);
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
