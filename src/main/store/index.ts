import Store from 'electron-store';
import { EventEmitter } from 'events';

export const logEmitter = new EventEmitter();

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

export interface TaskConfig {
  deleteFailed: boolean;
  listUnreviewed: boolean;
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
    taskConfig: { deleteFailed: false, listUnreviewed: true, listUnreviewedQuantity: 2 },
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

let logCounter = 0;

export function addLog(log: Omit<LogEntry, 'id' | 'timestamp'>): void {
  logCounter++;
  const entry: LogEntry = {
    ...log,
    id: `${Date.now()}-${logCounter}`,
    timestamp: Date.now(),
  };
  const logs = getLogs();
  logs.push(entry);
  store.set('logs', logs);
  logEmitter.emit('log-added', entry);
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
