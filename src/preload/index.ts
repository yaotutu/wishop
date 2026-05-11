import { contextBridge, ipcRenderer } from 'electron';
import type { Config, SchedulerConfig, LogEntry, DraftProduct, QuotaResult, TaskConfig, Account } from '../shared/types';

export type { Config, SchedulerConfig, LogEntry, DraftProduct, QuotaResult, TaskConfig, Account };

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
    get: (accountId: string): Promise<SchedulerConfig> =>
      ipcRenderer.invoke('scheduler:get', accountId),
    set: (accountId: string, config: SchedulerConfig): Promise<void> =>
      ipcRenderer.invoke('scheduler:set', accountId, config),
    start: (accountId: string): Promise<void> =>
      ipcRenderer.invoke('scheduler:start', accountId),
    stop: (accountId: string): Promise<void> =>
      ipcRenderer.invoke('scheduler:stop', accountId),
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
