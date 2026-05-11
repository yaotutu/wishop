import cron from 'node-cron';
import { getAccounts, getScheduler, setScheduler, getTaskConfig, getConfig, addLog, LogEntry } from '../store';
import { createWeChatClient } from '../wechat/client';
import { runTaskCycle } from '../modules/task-cycle';

const scheduledTasks = new Map<string, cron.ScheduledTask>();

async function executeListing(accountId: string): Promise<void> {
  const scheduler = getScheduler(accountId);

  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  if (scheduler.lastRunDate !== today) {
    scheduler.todayListedCount = 0;
    scheduler.lastRunDate = today;
    setScheduler(accountId, scheduler);
  }

  if (scheduler.todayListedCount >= scheduler.dailyLimit) {
    console.log(`[Scheduler:${accountId}] 今日上架次数已达上限，停止执行`);
    return;
  }

  try {
    const config = getConfig(accountId);
    const api = createWeChatClient(config);
    const scopedAddLog = (log: Omit<LogEntry, 'id' | 'timestamp'>) => addLog(accountId, log);
    const quota = await api.getAuditQuota();

    if (quota.quota <= 0) {
      console.log(`[Scheduler:${accountId}] 配额已用完，停止执行`);
      return;
    }

    const taskConfig = getTaskConfig(accountId);
    const result = await runTaskCycle(api, scopedAddLog, taskConfig, Date.now().toString());

    scheduler.todayListedCount += result.listed;
    setScheduler(accountId, scheduler);
    console.log(`[Scheduler:${accountId}] 执行完毕: 提交=${result.listed}, 删除=${result.deleted}`);
  } catch (error) {
    console.error(`[Scheduler:${accountId}] 执行失败:`, error);
  }
}

export function startScheduler(accountId: string): void {
  const scheduler = getScheduler(accountId);

  if (scheduledTasks.has(accountId)) {
    scheduledTasks.get(accountId)!.stop();
    scheduledTasks.delete(accountId);
  }

  if (!scheduler.enabled) {
    console.log(`[Scheduler:${accountId}] 未启用`);
    return;
  }

  const cronExpression = scheduler.cronExpression;
  if (!cron.validate(cronExpression)) {
    console.error(`[Scheduler:${accountId}] 无效的 cron 表达式: ${cronExpression}`);
    return;
  }

  const task = cron.schedule(cronExpression, () => executeListing(accountId));
  scheduledTasks.set(accountId, task);
  console.log(`[Scheduler:${accountId}] 已启动, cron: ${cronExpression}`);
}

export function stopScheduler(accountId: string): void {
  const task = scheduledTasks.get(accountId);
  if (task) {
    task.stop();
    scheduledTasks.delete(accountId);
    console.log(`[Scheduler:${accountId}] 已停止`);
  }
}

export function startAllSchedulers(): void {
  const accounts = getAccounts();
  for (const account of accounts) {
    if (account.scheduler.enabled) {
      startScheduler(account.id);
    }
  }
}

export function stopAllSchedulers(): void {
  for (const [accountId] of scheduledTasks) {
    stopScheduler(accountId);
  }
}
