import { contextBridge, ipcRenderer } from 'electron';

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

export interface DraftProduct {
  productId: string;
  title: string;
  headImgs: string[];
  status: number;
  editStatus: number;
}

export interface QuotaResult {
  quota: number;
  total: number;
}

export interface TaskConfig {
  deleteFailed: boolean;
  listUnreviewed: boolean;
  listUnreviewedQuantity: number;
}

const electronAPI = {
  config: {
    get: (): Promise<Config> => ipcRenderer.invoke('config:get'),
    set: (config: Config): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('config:set', config),
  },
  drafts: {
    fetch: (reset?: boolean): Promise<{ products: DraftProduct[]; hasMore: boolean }> => ipcRenderer.invoke('drafts:fetch', reset),
    list: (productId: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('drafts:list', productId),
  },
  quota: {
    get: (): Promise<QuotaResult> => ipcRenderer.invoke('quota:get'),
  },
  logs: {
    get: (): Promise<LogEntry[]> => ipcRenderer.invoke('logs:get'),
    clear: (): Promise<void> => ipcRenderer.invoke('logs:clear'),
  },
  scheduler: {
    get: (): Promise<SchedulerConfig> => ipcRenderer.invoke('scheduler:get'),
    set: (config: SchedulerConfig): Promise<void> => ipcRenderer.invoke('scheduler:set', config),
    start: (): Promise<void> => ipcRenderer.invoke('scheduler:start'),
    stop: (): Promise<void> => ipcRenderer.invoke('scheduler:stop'),
  },
  taskConfig: {
    get: (): Promise<TaskConfig> => ipcRenderer.invoke('taskConfig:get'),
    set: (config: TaskConfig): Promise<void> => ipcRenderer.invoke('taskConfig:set', config),
  },
  task: {
    run: (config: TaskConfig): Promise<any> => ipcRenderer.invoke('task:run', config),
    onLog: (callback: (log: LogEntry) => void) => {
      const handler = (_: any, log: LogEntry) => callback(log);
      ipcRenderer.on('log:added', handler);
      return () => ipcRenderer.removeListener('log:added', handler);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
