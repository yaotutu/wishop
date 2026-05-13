import { contextBridge, ipcRenderer } from 'electron';
import type { Config, ScheduledTask, LogEntry, DraftProduct, QuotaResult, TaskConfig, Account, Order, OrderSearchParams, OrderStatus, OrderAddressInfo, ViolationMatch, ViolationScanResult } from '../shared/types';

export type { Config, ScheduledTask, LogEntry, DraftProduct, QuotaResult, TaskConfig, Account, Order, OrderSearchParams, OrderStatus, OrderAddressInfo, ViolationMatch, ViolationScanResult };

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
    batchDelete: (accountId: string, products: DraftProduct[]): Promise<{ deleted: number; errors: number; stopped: boolean }> =>
      ipcRenderer.invoke('task:batchDelete', accountId, products),
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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

contextBridge.exposeInMainWorld('appVersion', {
  get: (): Promise<string> => ipcRenderer.invoke('app:version'),
});

contextBridge.exposeInMainWorld('updater', {
  onAvailable: (callback: (info: { version: string }) => void) => {
    ipcRenderer.on('update:available', (_, info) => callback(info));
  },
  onProgress: (callback: (info: { percent: number }) => void) => {
    ipcRenderer.on('update:progress', (_, info) => callback(info));
  },
  onDownloaded: (callback: (info: { version: string }) => void) => {
    ipcRenderer.on('update:downloaded', (_, info) => callback(info));
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
      onAvailable: (callback: (info: { version: string }) => void) => void;
      onProgress: (callback: (info: { percent: number }) => void) => void;
      onDownloaded: (callback: (info: { version: string }) => void) => void;
      install: () => Promise<void>;
    };
  }
}
