import type { BlacklistRule, LogEntry, QuotaResult, StatusRule, TaskConfig, TaskCycleResult } from '../../../shared/listing';
import type { ScheduledTask } from '../../../shared/scheduling';

export const listingClient = {
  taskConfig: {
    get(accountId: string): Promise<TaskConfig> {
      return window.wishop.taskConfig.get(accountId);
    },
    save(accountId: string, config: TaskConfig): Promise<void> {
      return window.wishop.taskConfig.set(accountId, config);
    },
    run(accountId: string, config: TaskConfig): Promise<TaskCycleResult> {
      return window.wishop.task.run(accountId, config);
    },
    stop(accountId: string): Promise<void> {
      return window.wishop.task.stop(accountId);
    },
    onLog(accountId: string, callback: (log: LogEntry) => void): () => void {
      return window.wishop.task.onLog(accountId, callback);
    },
  },
  logs: {
    list(accountId: string): Promise<LogEntry[]> {
      return window.wishop.logs.get(accountId);
    },
    clear(accountId: string): Promise<void> {
      return window.wishop.logs.clear(accountId);
    },
  },
  quota: {
    get(accountId: string): Promise<QuotaResult> {
      return window.wishop.quota.get(accountId);
    },
  },
  schedulers: {
    list(accountId: string): Promise<ScheduledTask[]> {
      return window.wishop.scheduler.list(accountId);
    },
    add(accountId: string, task: Omit<ScheduledTask, 'id' | 'lastRunDate' | 'todayListedCount'>): Promise<ScheduledTask> {
      return window.wishop.scheduler.add(accountId, task);
    },
    update(accountId: string, taskId: string, patch: Partial<ScheduledTask>): Promise<void> {
      return window.wishop.scheduler.update(accountId, taskId, patch);
    },
    remove(accountId: string, taskId: string): Promise<void> {
      return window.wishop.scheduler.remove(accountId, taskId);
    },
  },
  rules: {
    getBlacklist(): Promise<BlacklistRule[]> {
      return window.wishop.blacklistRules.get();
    },
    getDefaultBlacklistCodes(): Promise<number[]> {
      return window.wishop.blacklistRules.getDefaultCodes();
    },
    saveBlacklist(rules: BlacklistRule[]): Promise<void> {
      return window.wishop.blacklistRules.set(rules);
    },
    getSkipKeywords(): Promise<string[]> {
      return window.wishop.skipKeywords.get();
    },
    saveSkipKeywords(keywords: string[]): Promise<void> {
      return window.wishop.skipKeywords.set(keywords);
    },
    getStatusRules(): Promise<StatusRule[]> {
      return window.wishop.statusRules.get();
    },
    saveStatusRules(rules: StatusRule[]): Promise<void> {
      return window.wishop.statusRules.set(rules);
    },
    resetStatusRules(): Promise<StatusRule[]> {
      return window.wishop.statusRules.reset();
    },
  },
};
