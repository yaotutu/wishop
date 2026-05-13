import * as cron from 'node-cron';
import { getAccounts, getSchedulers, updateScheduler, createScopedAddLog } from '../store';
import type { ScheduledTask } from '../../shared/types';
import { getClient } from '../wxshop/client-registry';
import { runTaskCycle } from '../modules/task-cycle';

const scheduledTasks = new Map<string, cron.ScheduledTask>();

async function executeTask(accountId: string, taskId: string): Promise<void> {
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
    console.log(`[Scheduler:${accountId}:${taskId}] 今日上架次数已达上限，停止执行`);
    return;
  }

  try {
    const api = getClient(accountId);
    const scopedAddLog = createScopedAddLog(accountId);
    const quota = await api.getAuditQuota();

    if (quota.quota <= 0) {
      console.log(`[Scheduler:${accountId}:${taskId}] 配额已用完，停止执行`);
      return;
    }

    const result = await runTaskCycle(api, scopedAddLog, task.taskConfig, `cron-${taskId}-${Date.now()}`);

    const newCount = count + result.listed;
    updateScheduler(accountId, taskId, { todayListedCount: newCount });
    console.log(`[Scheduler:${accountId}:${taskId}] 执行完毕: 提交=${result.listed}, 删除=${result.deleted}`);
  } catch (error) {
    console.error(`[Scheduler:${accountId}:${taskId}] 执行失败:`, error);
  }
}

export function startTask(accountId: string, task: ScheduledTask): void {
  const key = `${accountId}:${task.id}`;

  if (scheduledTasks.has(key)) {
    scheduledTasks.get(key)!.stop();
    scheduledTasks.delete(key);
  }

  if (!task.enabled) return;

  if (!cron.validate(task.cronExpression)) {
    console.error(`[Scheduler:${accountId}:${task.id}] 无效的 cron 表达式: ${task.cronExpression}`);
    return;
  }

  const cronTask = cron.schedule(task.cronExpression, () => executeTask(accountId, task.id));
  scheduledTasks.set(key, cronTask);
  console.log(`[Scheduler:${accountId}:${task.id}] 已启动 "${task.name}", cron: ${task.cronExpression}`);
}

export function stopTask(accountId: string, taskId: string): void {
  const key = `${accountId}:${taskId}`;
  const cronTask = scheduledTasks.get(key);
  if (cronTask) {
    cronTask.stop();
    scheduledTasks.delete(key);
    console.log(`[Scheduler:${accountId}:${taskId}] 已停止`);
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
