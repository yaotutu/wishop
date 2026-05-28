import { contextBridge, ipcRenderer } from 'electron';
import type { ActivityLogEntry } from '../shared/activity-log';
import type { NotificationEntry, NotificationPreference } from '../shared/notification';
import type { AppSettings, AppSettingsPatch } from '../shared/settings';
import type {
  Account,
  BlacklistRule,
  Config,
  DeliveryCompanyOption,
  DraftProduct,
  LocalOrderListResult,
  LicenseActivationInput,
  LicenseState,
  LogEntry,
  Order,
  OrderAddressInfo,
  OrderAssociation,
  OrderListFilters,
  OrderRefreshResult,
  OrderRealAddressCache,
  OrderScope,
  OrderSearchParams,
  OrderSearchSource,
  OrderSyncState,
  ProductSourceBinding,
  ProductSourceItem,
  QuotaResult,
  ScheduledJob,
  ScheduledJobInput,
  ScheduledJobRunNowResult,
  ScheduledJobView,
  ScheduledTask,
  StatusRule,
  TaskConfig,
  TaskCycleResult,
  ViolationMatch,
  ViolationScanResult,
} from '../shared/types';

export type {
  Account,
  BlacklistRule,
  Config,
  DeliveryCompanyOption,
  DraftProduct,
  LocalOrderListResult,
  LicenseActivationInput,
  LicenseState,
  LogEntry,
  NotificationEntry,
  NotificationPreference,
  Order,
  OrderAddressInfo,
  OrderAssociation,
  OrderListFilters,
  OrderRefreshResult,
  OrderRealAddressCache,
  OrderScope,
  OrderSearchParams,
  OrderSearchSource,
  OrderSyncState,
  ProductSourceBinding,
  ProductSourceItem,
  QuotaResult,
  ScheduledJob,
  ScheduledJobInput,
  ScheduledJobRunNowResult,
  ScheduledJobView,
  ScheduledTask,
  StatusRule,
  TaskConfig,
  TaskCycleResult,
  ViolationMatch,
  ViolationScanResult,
};

function onChannel<T>(channel: string, callback: (payload: T) => void) {
  const handler = (_: unknown, payload: T) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const electronAPI = {
  accounts: {
    list: (): Promise<Account[]> => ipcRenderer.invoke('accounts:list'),
    add: (name: string, config: Config): Promise<Account> => ipcRenderer.invoke('accounts:add', name, config),
    remove: (accountId: string): Promise<void> => ipcRenderer.invoke('accounts:remove', accountId),
    update: (accountId: string, patch: Partial<Pick<Account, 'name' | 'config'>>): Promise<void> =>
      ipcRenderer.invoke('accounts:update', accountId, patch),
    getActive: (): Promise<string> => ipcRenderer.invoke('accounts:getActive'),
    setActive: (accountId: string): Promise<void> => ipcRenderer.invoke('accounts:setActive', accountId),
  },
  config: {
    get: (accountId: string): Promise<Config> => ipcRenderer.invoke('config:get', accountId),
    set: (accountId: string, config: Config): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('config:set', accountId, config),
  },
  drafts: {
    fetch: (accountId: string, reset?: boolean): Promise<{ products: DraftProduct[]; hasMore: boolean }> =>
      ipcRenderer.invoke('drafts:fetch', accountId, reset),
    list: (accountId: string, productId: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('drafts:list', accountId, productId),
  },
  orders: {
    list: (
      scope: OrderScope | string,
      filters?: OrderListFilters | number,
      legacyPageSize?: number,
    ): Promise<LocalOrderListResult | { orders: Order[]; hasMore: boolean }> => {
      if (typeof scope === 'string') {
        const status = typeof filters === 'number' ? filters : undefined;
        return ipcRenderer.invoke('orders:list', { type: 'account', accountId: scope }, { status, pageSize: legacyPageSize })
          .then((result: LocalOrderListResult) => ({
            orders: result.orders.map(snapshot => snapshot.order),
            hasMore: result.hasMore,
          }));
      }
      return ipcRenderer.invoke('orders:list', scope, filters);
    },
    detail: (accountId: string, orderId: string, options?: { refresh?: boolean }): Promise<Order> =>
      ipcRenderer.invoke('orders:detail', accountId, orderId, options),
    search: (
      scope: OrderScope | string,
      params: OrderSearchParams,
      source: OrderSearchSource = 'remote',
    ): Promise<LocalOrderListResult | { orders: Order[]; hasMore: boolean }> => {
      if (typeof scope === 'string') {
        return ipcRenderer.invoke('orders:search', { type: 'account', accountId: scope }, params, source)
          .then((result: LocalOrderListResult) => ({
            orders: result.orders.map(snapshot => snapshot.order),
            hasMore: result.hasMore,
          }));
      }
      return ipcRenderer.invoke('orders:search', scope, params, source);
    },
    refresh: (scope: OrderScope): Promise<OrderRefreshResult> => ipcRenderer.invoke('orders:refresh', scope),
    syncState: (scope: OrderScope): Promise<OrderSyncState> => ipcRenderer.invoke('orders:syncState', scope),
    decodeAddress: (accountId: string, orderId: string): Promise<OrderAddressInfo> =>
      ipcRenderer.invoke('orders:decodeAddress', accountId, orderId),
    listDeliveryCompanies: (accountId: string): Promise<DeliveryCompanyOption[]> =>
      ipcRenderer.invoke('orders:listDeliveryCompanies', accountId),
  },
  orderRealAddresses: {
    list: (accountId: string): Promise<OrderRealAddressCache[]> => ipcRenderer.invoke('orderRealAddresses:list', accountId),
    get: (accountId: string, orderId: string): Promise<OrderRealAddressCache | null> =>
      ipcRenderer.invoke('orderRealAddresses:get', accountId, orderId),
    fetch: (accountId: string, orderId: string): Promise<OrderRealAddressCache> =>
      ipcRenderer.invoke('orderRealAddresses:fetch', accountId, orderId),
    refresh: (accountId: string, orderId: string): Promise<OrderRealAddressCache> =>
      ipcRenderer.invoke('orderRealAddresses:refresh', accountId, orderId),
  },
  orderAssociations: {
    list: (accountId: string): Promise<OrderAssociation[]> => ipcRenderer.invoke('orderAssociations:list', accountId),
    set: (
      accountId: string,
      orderId: string,
      input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>,
    ): Promise<OrderAssociation> => ipcRenderer.invoke('orderAssociations:set', accountId, orderId, input),
  },
  productSources: {
    list: (accountId: string): Promise<ProductSourceBinding[]> => ipcRenderer.invoke('productSources:list', accountId),
    set: (accountId: string, productId: string, sources: ProductSourceItem[]): Promise<ProductSourceBinding> =>
      ipcRenderer.invoke('productSources:set', accountId, productId, sources),
    remove: (accountId: string, productId: string, sourceId: string): Promise<ProductSourceBinding> =>
      ipcRenderer.invoke('productSources:remove', accountId, productId, sourceId),
  },
  quota: {
    get: (accountId: string, force = false): Promise<QuotaResult> => ipcRenderer.invoke('quota:get', accountId, force),
  },
  logs: {
    get: (accountId: string): Promise<LogEntry[]> => ipcRenderer.invoke('logs:get', accountId),
    clear: (accountId: string): Promise<void> => ipcRenderer.invoke('logs:clear', accountId),
  },
  license: {
    get: (): Promise<LicenseState> => ipcRenderer.invoke('license:get'),
    activate: (input: LicenseActivationInput): Promise<LicenseState> => ipcRenderer.invoke('license:activate', input),
    refresh: (): Promise<LicenseState> => ipcRenderer.invoke('license:refresh'),
    clear: (): Promise<LicenseState> => ipcRenderer.invoke('license:clear'),
  },
  listingLogs: {
    get: (accountId: string): Promise<LogEntry[]> => ipcRenderer.invoke('logs:get', accountId),
    clear: (accountId: string): Promise<void> => ipcRenderer.invoke('logs:clear', accountId),
    onAdded: (accountId: string, callback: (log: LogEntry) => void) => onChannel(`log:added:${accountId}`, callback),
  },
  activityLogs: {
    list: (): Promise<ActivityLogEntry[]> => ipcRenderer.invoke('activityLogs:list'),
    clear: (): Promise<void> => ipcRenderer.invoke('activityLogs:clear'),
    onAdded: (callback: (log: ActivityLogEntry) => void) => onChannel('activityLog:added', callback),
  },
  notifications: {
    list: (): Promise<NotificationEntry[]> => ipcRenderer.invoke('notifications:list'),
    markRead: (notificationId: string): Promise<NotificationEntry[]> => ipcRenderer.invoke('notifications:markRead', notificationId),
    markAllRead: (): Promise<NotificationEntry[]> => ipcRenderer.invoke('notifications:markAllRead'),
    clear: (): Promise<void> => ipcRenderer.invoke('notifications:clear'),
    getPreference: (): Promise<NotificationPreference> => ipcRenderer.invoke('notifications:getPreference'),
    updatePreference: (patch: Partial<NotificationPreference>): Promise<NotificationPreference> =>
      ipcRenderer.invoke('notifications:updatePreference', patch),
    onAdded: (callback: (notification: NotificationEntry) => void) => onChannel('notification:added', callback),
    onChanged: (callback: (notifications: NotificationEntry[]) => void) => onChannel('notification:changed', callback),
    onPreferenceChanged: (callback: (preference: NotificationPreference) => void) =>
      onChannel('notification:preferenceChanged', callback),
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (patch: AppSettingsPatch): Promise<AppSettings> => ipcRenderer.invoke('settings:update', patch),
  },
  scheduler: {
    list: (accountId: string): Promise<ScheduledTask[]> => ipcRenderer.invoke('scheduler:list', accountId),
    add: (accountId: string, task: Omit<ScheduledTask, 'id' | 'lastRunDate' | 'todayListedCount'>): Promise<ScheduledTask> =>
      ipcRenderer.invoke('scheduler:add', accountId, task),
    update: (accountId: string, taskId: string, patch: Partial<ScheduledTask>): Promise<void> =>
      ipcRenderer.invoke('scheduler:update', accountId, taskId, patch),
    remove: (accountId: string, taskId: string): Promise<void> => ipcRenderer.invoke('scheduler:remove', accountId, taskId),
  },
  scheduledJobs: {
    list: (): Promise<ScheduledJobView[]> => ipcRenderer.invoke('scheduledJobs:list'),
    add: (job: ScheduledJobInput): Promise<ScheduledJob> => ipcRenderer.invoke('scheduledJobs:add', job),
    update: (jobId: string, patch: Partial<ScheduledJob>): Promise<void> => ipcRenderer.invoke('scheduledJobs:update', jobId, patch),
    remove: (jobId: string): Promise<void> => ipcRenderer.invoke('scheduledJobs:remove', jobId),
    runNow: (jobId: string): Promise<ScheduledJobRunNowResult> => ipcRenderer.invoke('scheduledJobs:runNow', jobId),
  },
  taskConfig: {
    get: (accountId: string): Promise<TaskConfig> => ipcRenderer.invoke('taskConfig:get', accountId),
    set: (accountId: string, config: TaskConfig): Promise<void> => ipcRenderer.invoke('taskConfig:set', accountId, config),
  },
  task: {
    run: (accountId: string, config: TaskConfig): Promise<TaskCycleResult> => ipcRenderer.invoke('task:run', accountId, config),
    stop: (accountId: string): Promise<void> => ipcRenderer.invoke('task:stop', accountId),
    onLog: (accountId: string, callback: (log: LogEntry) => void) => onChannel(`log:added:${accountId}`, callback),
  },
  violation: {
    getWords: (accountId: string): Promise<string[]> => ipcRenderer.invoke('violation:getWords', accountId),
    setWords: (accountId: string, words: string[]): Promise<void> => ipcRenderer.invoke('violation:setWords', accountId, words),
    batchScan: (accountId: string, limit?: number): Promise<ViolationScanResult> =>
      ipcRenderer.invoke('violation:batchScan', accountId, limit),
    scanStep: (accountId: string, action: 'next' | 'skip' | 'delete'): Promise<any> =>
      ipcRenderer.invoke('violation:scanStep', accountId, action),
    batchDelete: (accountId: string, violations: ViolationMatch[]): Promise<{ deleted: number; errors: number; stopped: boolean }> =>
      ipcRenderer.invoke('violation:batchDelete', accountId, violations),
    stop: (accountId: string): Promise<void> => ipcRenderer.invoke('violation:stop', accountId),
    onLog: (accountId: string, callback: (log: LogEntry) => void) => onChannel(`violation:log:${accountId}`, callback),
  },
  blacklistRules: {
    get: (): Promise<BlacklistRule[]> => ipcRenderer.invoke('blacklistRules:get'),
    getDefaultCodes: (): Promise<number[]> => ipcRenderer.invoke('blacklistRules:getDefaultCodes'),
    set: (rules: BlacklistRule[]): Promise<void> => ipcRenderer.invoke('blacklistRules:set', rules),
  },
  skipKeywords: {
    get: (): Promise<string[]> => ipcRenderer.invoke('skipKeywords:get'),
    set: (keywords: string[]): Promise<void> => ipcRenderer.invoke('skipKeywords:set', keywords),
  },
  statusRules: {
    get: (): Promise<StatusRule[]> => ipcRenderer.invoke('statusRules:get'),
    set: (rules: StatusRule[]): Promise<void> => ipcRenderer.invoke('statusRules:set', rules),
    reset: (): Promise<StatusRule[]> => ipcRenderer.invoke('statusRules:reset'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

contextBridge.exposeInMainWorld('appVersion', {
  get: (): Promise<string> => ipcRenderer.invoke('app:version'),
});

contextBridge.exposeInMainWorld('updater', {
  check: (): Promise<void> => ipcRenderer.invoke('update:check'),
  onAvailable: (callback: (info: { version: string }) => void) => {
    ipcRenderer.on('update:available', (_, info) => callback(info));
  },
  onProgress: (callback: (info: { percent: number }) => void) => {
    ipcRenderer.on('update:progress', (_, info) => callback(info));
  },
  onDownloaded: (callback: (info: { version: string }) => void) => {
    ipcRenderer.on('update:downloaded', (_, info) => callback(info));
  },
  onNotAvailable: (callback: () => void) => {
    ipcRenderer.on('update:not-available', () => callback());
  },
  onError: (callback: (error: string) => void) => {
    ipcRenderer.on('update:error', (_, error) => callback(error));
  },
  install: (): Promise<void> => ipcRenderer.invoke('update:install'),
});

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
    appVersion: {
      get: () => Promise<string>;
    };
    updater: {
      check: () => Promise<void>;
      onAvailable: (callback: (info: { version: string }) => void) => void;
      onProgress: (callback: (info: { percent: number }) => void) => void;
      onDownloaded: (callback: (info: { version: string }) => void) => void;
      onNotAvailable: (callback: () => void) => void;
      onError: (callback: (error: string) => void) => void;
      install: () => Promise<void>;
    };
  }
}
