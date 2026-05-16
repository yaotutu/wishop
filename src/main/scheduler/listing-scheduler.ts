import * as cron from 'node-cron';
import { getAccounts, getSchedulers, updateScheduler, createScopedAddLog, getBlacklistRules, getSkipKeywords, getStatusRules } from '../store';
import type { ScheduledTask } from '../../shared/types';
import { getClient } from '../wxshop/client-registry';
import { runTaskCycle } from '../modules/task-cycle';
import { createLogger } from '../utils/logger';

const scheduledTasks = new Map<string, cron.ScheduledTask>();

async function executeTask(accountId: string, taskId: string): Promise<void> {
  const logger = createLogger('Scheduler', accountId);
  const schedulers = getSchedulers(accountId);
  const task = schedulers.find(t => t.id === taskId);
  if (!task) return;

  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  let count = task.todayListedCount;
  if (task.lastRunDate !== today) {
    count = 0;
    updateScheduler(accountId, taskId, { lastRunDate: today, todayListedCount: 0 });
  }

  if (task.dailyLimit > 0 && count >= task.dailyLimit) {
    logger.info(`[${taskId}] 今日上架次数已达上限，停止执行`);
    return;
  }

  try {
    const api = getClient(accountId);
    const scopedAddLog = createScopedAddLog(accountId);
    const quota = await api.getAuditQuota();

    if (quota.quota <= 0) {
      logger.info(`[${taskId}] 配额已用完，停止执行`);
      return;
    }

    const result = await runTaskCycle(
      api, scopedAddLog, task.taskConfig, `cron-${taskId}-${Date.now()}`,
      undefined, accountId,
      getBlacklistRules(), getSkipKeywords(), getStatusRules(),
    );

    const newCount = count + result.listed;
    updateScheduler(accountId, taskId, { todayListedCount: newCount });
    logger.info(`[${taskId}] 执行完毕: 提交=${result.listed}, 删除=${result.deleted}`);
  } catch (error) {
    logger.error(`[${taskId}] 执行失败:`, error);
  }
}

export function startTask(accountId: string, task: ScheduledTask): void {
  const logger = createLogger('Scheduler', accountId);
  const key = `${accountId}:${task.id}`;

  if (scheduledTasks.has(key)) {
    scheduledTasks.get(key)!.stop();
    scheduledTasks.delete(key);
  }

  if (!task.enabled) return;

  if (!cron.validate(task.cronExpression)) {
    logger.error(`[${task.id}] 无效的 cron 表达式: ${task.cronExpression}`);
    return;
  }

  const cronTask = cron.schedule(task.cronExpression, () => executeTask(accountId, task.id));
  scheduledTasks.set(key, cronTask);
  logger.info(`[${task.id}] 已启动 "${task.name}", cron: ${task.cronExpression}`);
}

export function stopTask(accountId: string, taskId: string): void {
  const logger = createLogger('Scheduler', accountId);
  const key = `${accountId}:${taskId}`;
  const cronTask = scheduledTasks.get(key);
  if (cronTask) {
    cronTask.stop();
    scheduledTasks.delete(key);
    logger.info(`[${taskId}] 已停止`);
  }
}

export function startAllTasks(): void {
  const accounts = getAccounts();
  for (const account of accounts) {
    for (const task of account.schedulers) {
      if (task.enabled) {
        startTask(account.id, task);
      }
    }
  }
}

export function stopAllTasks(): void {
  for (const [key, cronTask] of scheduledTasks) {
    cronTask.stop();
    scheduledTasks.delete(key);
  }
}
