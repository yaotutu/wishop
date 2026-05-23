export type ScheduledJobModule = 'listing' | 'orders' | 'violation' | 'store' | 'system';
export type ScheduledJobScope = 'account' | 'global';
export type ScheduledJobType =
  | 'listing.submitDrafts'
  | 'orders.checkShipmentStatus'
  | 'violation.scanProducts';
export type ScheduledJobStatus = 'idle' | 'running' | 'waiting_user' | 'completed' | 'failed' | 'skipped';

export interface ScheduledJobRunStats {
  lastRunDate: string;
  todayRunCount: number;
  lastRunAt?: number;
  lastFinishedAt?: number;
  lastStatus?: ScheduledJobStatus;
  lastError?: string;
}

export interface ScheduledJob<TPayload = unknown> {
  id: string;
  name: string;
  enabled: boolean;
  module: ScheduledJobModule;
  jobType: ScheduledJobType;
  scope: ScheduledJobScope;
  accountId?: string;
  excludedAccountIds?: string[];
  cronExpression: string;
  staggerMinutes?: number;
  dailyLimit?: number;
  payload: TPayload;
  stats: ScheduledJobRunStats;
  accountStats?: Record<string, ScheduledJobRunStats>;
  createdAt: number;
  updatedAt: number;
}
