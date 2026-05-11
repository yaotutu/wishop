// Shared types across main process, preload, and renderer

export interface Config {
  appId: string;
  appSecret: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  enabled: boolean;
  cronExpression: string;
  dailyLimit: number;
  taskConfig: TaskConfig;
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
  deleteFailedConfirm: boolean;
  listUnreviewed: boolean;
  listUnreviewedQuantity: number;
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

export interface TaskCycleResult {
  scanned: number;
  deleted: number;
  listed: number;
  errors: number;
  skipped: number;
  stopped: boolean;
  reason?: string;
  pendingDelete: DraftProduct[];
}

export interface Account {
  id: string;
  name: string;
  config: Config;
  createdAt: number;
}

export type AddLogFn = (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;

// Full account with all data (main process only)
export interface FullAccount {
  id: string;
  name: string;
  config: Config;
  schedulers: ScheduledTask[];
  taskConfig: TaskConfig;
  logs: LogEntry[];
  createdAt: number;
}
