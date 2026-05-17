import { contextBridge, ipcRenderer } from 'electron';
import type { Config, ScheduledTask, LogEntry, DraftProduct, QuotaResult, TaskConfig, Account, Order, OrderSearchParams, OrderStatus, OrderAddressInfo, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule } from '../shared/types';

export type { Config, ScheduledTask, LogEntry, DraftProduct, QuotaResult, TaskConfig, Account, Order, OrderSearchParams, OrderStatus, OrderAddressInfo, ViolationMatch, ViolationScanResult, BlacklistRule, StatusRule };

const electronAPI = {
  accounts: {
    list: (): Promise<Account[]> => ipcRenderer.invoke('accounts:list'),
    add: (name: string, config: Config): Promise<Account> =>
      ipcRenderer.invoke('accounts:add', name, config),
    remove: (accountId: string): Promise<void> =>
      ipcRenderer.invoke('accounts:remove', accountId),
    update: (accountId: string, patch: Partial<Pick<Account, 'name' | 'config'>>): Promise<void> =>
      ipcRenderer.invoke('accounts:update', accountId, patch),
    getActive: (): Promise<string> => ipcRenderer.invoke('accounts:getActive'),
    setActive: (accountId: string): Promise<void> =>
      ipcRenderer.invoke('accounts:setActive', accountId),
  },
  config: {
    get: (accountId: string): Promise<Config> =>
      ipcRenderer.invoke('config:get', accountId),
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
    list: (accountId: string, status?: OrderStatus, pageSize?: number): Promise<{ orders: Order[]; hasMore: boolean }> =>
      ipcRenderer.invoke('orders:list', accountId, status, pageSize),
    detail: (accountId: string, orderId: string): Promise<Order> =>
      ipcRenderer.invoke('orders:detail', accountId, orderId),
    search: (accountId: string, params: OrderSearchParams): Promise<{ orders: Order[]; hasMore: boolean }> =>
      ipcRenderer.invoke('orders:search', accountId, params),
    decodeAddress: (accountId: string, orderId: string): Promise<OrderAddressInfo> =>
      ipcRenderer.invoke('orders:decodeAddress', accountId, orderId),
  },
  quota: {
    get: (accountId: string): Promise<QuotaResult> =>
      ipcRenderer.invoke('quota:get', accountId),
  },
  logs: {
    get: (accountId: string): Promise<LogEntry[]> =>
      ipcRenderer.invoke('logs:get', accountId),
    clear: (accountId: string): Promise<void> =>
      ipcRenderer.invoke('logs:clear', accountId),
  },
  scheduler: {
    list: (accountId: string): Promise<ScheduledTask[]> =>
      ipcRenderer.invoke('scheduler:list', accountId),
    add: (accountId: string, task: Omit<ScheduledTask, 'id' | 'lastRunDate' | 'todayListedCount'>): Promise<ScheduledTask> =>
      ipcRenderer.invoke('scheduler:add', accountId, task),
    update: (accountId: string, taskId: string, patch: Partial<ScheduledTask>): Promise<void> =>
      ipcRenderer.invoke('scheduler:update', accountId, taskId, patch),
    remove: (accountId: string, taskId: string): Promise<void> =>
      ipcRenderer.invoke('scheduler:remove', accountId, taskId),
  },
  browser: {
    open: (profileId: string, url?: string): Promise<void> =>
      ipcRenderer.invoke('browser:open', profileId, url),
    close: (): Promise<void> =>
      ipcRenderer.invoke('browser:close'),
    back: (): Promise<void> =>
      ipcRenderer.invoke('browser:back'),
    forward: (): Promise<void> =>
      ipcRenderer.invoke('browser:forward'),
    refresh: (): Promise<void> =>
      ipcRenderer.invoke('browser:refresh'),
    stop: (): Promise<void> =>
      ipcRenderer.invoke('browser:stop'),
    setBounds: (x: number, y: number, width: number, height: number): Promise<void> =>
      ipcRenderer.invoke('browser:setBounds', x, y, width, height),
    onUrlChange: (callback: (url: string) => void) => {
      const handler = (_: any, url: string) => callback(url);
      ipcRenderer.on('browser:url', handler);
      return () => ipcRenderer.removeListener('browser:url', handler);
    },
    onLoadingChange: (callback: (loading: boolean) => void) => {
      const handler = (_: any, loading: boolean) => callback(loading);
      ipcRenderer.on('browser:loading', handler);
      return () => ipcRenderer.removeListener('browser:loading', handler);
    },
  },
  taskConfig: {
    get: (accountId: string): Promise<TaskConfig> =>
      ipcRenderer.invoke('taskConfig:get', accountId),
    set: (accountId: string, config: TaskConfig): Promise<void> =>
      ipcRenderer.invoke('taskConfig:set', accountId, config),
  },
  task: {
    run: (accountId: string, config: TaskConfig): Promise<any> =>
      ipcRenderer.invoke('task:run', accountId, config),
    stop: (accountId: string): Promise<void> =>
      ipcRenderer.invoke('task:stop', accountId),
    onLog: (accountId: string, callback: (log: LogEntry) => void) => {
      const handler = (_: any, log: LogEntry) => callback(log);
      ipcRenderer.on(`log:added:${accountId}`, handler);
      return () => ipcRenderer.removeListener(`log:added:${accountId}`, handler);
    },
  },
  violation: {
    getWords: (accountId: string): Promise<string[]> =>
      ipcRenderer.invoke('violation:getWords', accountId),
    setWords: (accountId: string, words: string[]): Promise<void> =>
      ipcRenderer.invoke('violation:setWords', accountId, words),
    batchScan: (accountId: string, limit?: number): Promise<ViolationScanResult> =>
      ipcRenderer.invoke('violation:batchScan', accountId, limit),
    scanStep: (accountId: string, action: 'next' | 'skip' | 'delete'): Promise<any> =>
      ipcRenderer.invoke('violation:scanStep', accountId, action),
    batchDelete: (accountId: string, violations: ViolationMatch[]): Promise<{ deleted: number; errors: number; stopped: boolean }> =>
      ipcRenderer.invoke('violation:batchDelete', accountId, violations),
    stop: (accountId: string): Promise<void> =>
      ipcRenderer.invoke('violation:stop', accountId),
    onLog: (accountId: string, callback: (log: LogEntry) => void) => {
      const handler = (_: any, log: LogEntry) => callback(log);
      ipcRenderer.on(`violation:log:${accountId}`, handler);
      return () => ipcRenderer.removeListener(`violation:log:${accountId}`, handler);
    },
  },
  blacklistRules: {
    get: (): Promise<BlacklistRule[]> =>
      ipcRenderer.invoke('blacklistRules:get'),
    getDefaultCodes: (): Promise<number[]> =>
      ipcRenderer.invoke('blacklistRules:getDefaultCodes'),
    set: (rules: BlacklistRule[]): Promise<void> =>
      ipcRenderer.invoke('blacklistRules:set', rules),
  },
  skipKeywords: {
    get: (): Promise<string[]> =>
      ipcRenderer.invoke('skipKeywords:get'),
    set: (keywords: string[]): Promise<void> =>
      ipcRenderer.invoke('skipKeywords:set', keywords),
  },
  // 处理规则 — editStatus → action 的可配置映射
  statusRules: {
    get: (): Promise<StatusRule[]> =>
      ipcRenderer.invoke('statusRules:get'),
    set: (rules: StatusRule[]): Promise<void> =>
      ipcRenderer.invoke('statusRules:set', rules),
    reset: (): Promise<StatusRule[]> =>
      ipcRenderer.invoke('statusRules:reset'),
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
