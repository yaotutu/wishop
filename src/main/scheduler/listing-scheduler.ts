import cron from 'node-cron';
import { getScheduler, setScheduler, getTaskConfig } from '../store';
import { getAuditQuota } from '../ipc/wechat-api';
import { runTaskCycle } from '../modules/task-cycle';

let scheduledTask: cron.ScheduledTask | null = null;

async function executeListing(): Promise<void> {
  const scheduler = getScheduler();

  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  if (scheduler.lastRunDate !== today) {
    scheduler.todayListedCount = 0;
    scheduler.lastRunDate = today;
    setScheduler(scheduler);
  }

  if (scheduler.todayListedCount >= scheduler.dailyLimit) {
    console.log('[Scheduler] 今日上架次数已达上限，停止执行');
    return;
  }

  try {
    const quota = await getAuditQuota();
    if (quota.quota <= 0) {
      console.log('[Scheduler] 配额已用完，停止执行');
      return;
    }

    const taskConfig = getTaskConfig();
    const result = await runTaskCycle(taskConfig);

    scheduler.todayListedCount += result.listed;
    setScheduler(scheduler);
    console.log(`[Scheduler] 执行完毕: 提交=${result.listed}, 删除=${result.deleted}`);
  } catch (error) {
    console.error('[Scheduler] 执行失败:', error);
  }
}

export function startScheduler(): void {
  const scheduler = getScheduler();

  if (scheduledTask) {
    scheduledTask.stop();
  }

  if (!scheduler.enabled) {
    console.log('[Scheduler] 未启用');
    return;
  }

  const cronExpression = scheduler.cronExpression;
  if (!cron.validate(cronExpression)) {
    console.error(`[Scheduler] 无效的 cron 表达式: ${cronExpression}`);
    return;
  }

  scheduledTask = cron.schedule(cronExpression, executeListing);
  console.log(`[Scheduler] 已启动, cron: ${cronExpression}`);
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Scheduler] 已停止');
  }
}
