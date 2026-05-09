import Store from 'electron-store';

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
  productId: string;
  productTitle: string;
  status: 'success' | 'failed';
  errorCode?: number;
  errorMsg?: string;
}

export interface TaskConfig {
  deleteFailed: boolean;
  listUnreviewed: boolean;
  deleteFailedQuantity: number;
  listUnreviewedQuantity: number;
}

export interface StoreSchema {
  config: Config;
  scheduler: SchedulerConfig;
  taskConfig: TaskConfig;
  logs: LogEntry[];
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
    config: { appId: '', appSecret: '' },
    scheduler: defaultScheduler,
    taskConfig: { deleteFailed: false, listUnreviewed: true, deleteFailedQuantity: 2, listUnreviewedQuantity: 2 },
    logs: [],
  },
});

export function getConfig(): Config {
  const config = store.get('config');
  return {
    appId: config.appId || process.env.WECHAT_APP_ID || '',
    appSecret: config.appSecret || process.env.WECHAT_APP_SECRET || '',
  };
}

export function setConfig(config: Config): void {
  store.set('config', config);
}

export function getScheduler(): SchedulerConfig {
  return store.get('scheduler');
}

export function setScheduler(scheduler: SchedulerConfig): void {
  store.set('scheduler', scheduler);
}

export function getTaskConfig(): TaskConfig {
  return store.get('taskConfig');
}

export function setTaskConfig(taskConfig: TaskConfig): void {
  store.set('taskConfig', taskConfig);
}

export function getLogs(): LogEntry[] {
  const logs = store.get('logs');
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return logs.filter(log => log.timestamp > sevenDaysAgo);
}

export function addLog(log: Omit<LogEntry, 'id' | 'timestamp'>): void {
  const logs = getLogs();
  logs.push({
    ...log,
    id: Date.now().toString(),
    timestamp: Date.now(),
  });
  store.set('logs', logs);
}

export function clearLogs(): void {
  store.set('logs', []);
}

export function cleanOldLogs(): void {
  const logs = store.get('logs');
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = logs.filter(log => log.timestamp > sevenDaysAgo);
  store.set('logs', filtered);
}

export default store;
