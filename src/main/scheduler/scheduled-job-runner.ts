import * as cron from 'node-cron';
import type { BrowserWindow } from 'electron';
import type { Order, ScheduledJob, ScheduledJobRunStats, ScheduledJobStatus, TaskConfig } from '../../shared/types';
import { OrderStatus } from '../../shared/types';
import { normalizeLinkedPurchaseOrder } from '../../shared/purchase-status';
import {
  createScopedAddLog,
  getAccounts,
  getAppSettings,
  getBlacklistRules,
  getOrderAssociations,
  getScheduledJobs,
  getSkipKeywords,
  getStatusRules,
  getViolationWords,
  updateScheduledJobAccountStats,
  updateScheduledJobStats,
} from '../store';
import { runTaskCycle } from '../modules/task-cycle';
import { batchScan } from '../modules/violation-detect';
import { getClient } from '../wxshop/client-registry';
import { createLogger } from '../utils/logger';
import { runPurchaseLookupAutomation } from '../services/taobao-automation-service';
import { jobRunner } from '../jobs/job-runner';

type ScheduledJobExecutorResult = {
  listed?: number;
  status?: ScheduledJobStatus;
  error?: string;
};

const scheduledJobs = new Map<string, cron.ScheduledTask>();
let mainWindowProvider: (() => BrowserWindow | null) | null = null;

function scheduledJobRunnerId(jobId: string): string {
  return `scheduled:${jobId}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function statsFor(job: ScheduledJob, accountId?: string): ScheduledJobRunStats {
  if (job.scope === 'global' && accountId) {
    return job.accountStats?.[accountId] || { lastRunDate: '', todayRunCount: 0 };
  }
  return job.stats;
}

function patchStats(job: ScheduledJob, accountId: string | undefined, patch: Partial<ScheduledJobRunStats>): void {
  if (job.scope === 'global' && accountId) {
    updateScheduledJobAccountStats(job.id, accountId, patch);
    return;
  }
  updateScheduledJobStats(job.id, patch);
}

function targetAccountIds(job: ScheduledJob): string[] {
  if (job.scope === 'account') return job.accountId ? [job.accountId] : [];
  const excluded = new Set(job.excludedAccountIds || []);
  return getAccounts().filter(account => !excluded.has(account.id)).map(account => account.id);
}

async function runListingJob(job: ScheduledJob, accountId: string, runId: string): Promise<ScheduledJobExecutorResult> {
  const api = getClient(accountId);
  const quota = await api.getAuditQuota();
  if (quota.quota <= 0) {
    return { listed: 0, status: 'skipped', error: '今日提审配额已用完' };
  }

  const payload = (job.payload || {}) as Partial<{ taskConfig: TaskConfig }> & Partial<TaskConfig>;
  const configured = payload.taskConfig || payload;
  const taskConfig: TaskConfig = {
    listUnreviewed: configured.listUnreviewed ?? true,
    listUnreviewedQuantity: Math.min(configured.listUnreviewedQuantity || quota.quota, quota.quota),
    autoDeleteFailed: configured.autoDeleteFailed ?? true,
  };

  const result = await runTaskCycle(
    api,
    createScopedAddLog(accountId),
    taskConfig,
    runId,
    undefined,
    accountId,
    getBlacklistRules(),
    getSkipKeywords(),
    getStatusRules(),
  );

  return {
    listed: result.listed,
    status: result.stopped || result.errors > 0 ? 'failed' : 'completed',
    error: result.reason,
  };
}

async function runViolationJob(job: ScheduledJob, accountId: string, runId: string): Promise<ScheduledJobExecutorResult> {
  const words = getViolationWords(accountId);
  if (words.length === 0) return { listed: 0, status: 'skipped', error: '违规词库为空' };
  const payload = (job.payload || {}) as Partial<{ limit: number }>;
  const result = await batchScan(
    getClient(accountId),
    createScopedAddLog(accountId),
    words,
    runId,
    undefined,
    payload.limit || 200,
    accountId,
  );
  return {
    listed: result.violations.length,
    status: result.stopped || result.errors > 0 ? 'failed' : 'completed',
    error: result.reason,
  };
}

function hasWxDelivery(order: Order): boolean {
  return (order.order_detail?.delivery_info?.delivery_product_info || []).length > 0;
}

async function fetchPendingShipmentOrders(accountId: string, lookbackDays: number): Promise<Order[]> {
  const api = getClient(accountId);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const listResult = await api.getOrderList({
    page_size: 50,
    status: OrderStatus.PendingShipment,
    create_time_range: {
      start_time: nowSeconds - lookbackDays * 24 * 60 * 60,
      end_time: nowSeconds,
    },
  });
  const settled = await Promise.allSettled(listResult.order_id_list.map(orderId => api.getOrderDetail(orderId)));
  return settled
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter((order): order is Order => order !== null);
}

async function runOrderShipmentCheckJob(accountId: string): Promise<ScheduledJobExecutorResult> {
  const parent = mainWindowProvider?.();
  if (!parent || parent.isDestroyed()) {
    return { listed: 0, status: 'waiting_user', error: '主窗口不可用，无法打开淘宝工作页' };
  }

  const settings = getAppSettings().shipmentCheck;
  if (!settings.enabled) {
    return { listed: 0, status: 'skipped', error: '发货状态检测已关闭' };
  }

  const [orders, associations] = await Promise.all([
    fetchPendingShipmentOrders(accountId, settings.orderLookbackDays),
    Promise.resolve(getOrderAssociations(accountId)),
  ]);
  const associationsByOrderId = Object.fromEntries(associations.map(association => [association.orderId, association]));
  const candidates = orders
    .filter(order => order.status === OrderStatus.PendingShipment && !hasWxDelivery(order))
    .map(order => {
      const linked = associationsByOrderId[order.order_id]?.linkedOrders[0];
      return linked ? { order, linked: normalizeLinkedPurchaseOrder(linked) } : null;
    })
    .filter((item): item is NonNullable<typeof item> => (
      !!item
      && item.linked.platform === 'taobao'
      && !!item.linked.platformOrderId?.trim()
      && !item.linked.trackingNumber?.trim()
      && !['交易关闭', '退款成功', '退货退款成功', '交易成功'].some(keyword => (item.linked.platformOrderStatus || '').includes(keyword))
    ))
    .slice(0, settings.maxChecksPerAccountPerWindow);

  let completed = 0;
  for (const candidate of candidates) {
    await runPurchaseLookupAutomation(parent, {
      accountId,
      orderId: candidate.order.order_id,
      platformOrderId: candidate.linked.platformOrderId,
    });
    completed += 1;
    if (settings.minTaskSpacingSeconds > 0) {
      await new Promise(resolve => setTimeout(resolve, settings.minTaskSpacingSeconds * 1000));
    }
  }

  return {
    listed: completed,
    status: completed > 0 ? 'completed' : 'skipped',
    error: completed > 0 ? `已检测 ${completed} 个采购单` : '本轮没有需要检测的采购单',
  };
}

async function executeForAccount(job: ScheduledJob, accountId: string): Promise<void> {
  const logger = createLogger('ScheduledJob', accountId);
  const stat = statsFor(job, accountId);
  const currentDate = todayKey();
  const todayRunCount = stat.lastRunDate === currentDate ? stat.todayRunCount : 0;
  if ((job.dailyLimit || 0) > 0 && todayRunCount >= (job.dailyLimit || 0)) {
    patchStats(job, accountId, {
      lastRunDate: currentDate,
      lastStatus: 'skipped',
      lastError: `今日已达到上限 ${job.dailyLimit}`,
    });
    return;
  }

  const runId = `${job.scope === 'global' ? 'global-job' : 'job'}-${job.id}-${accountId}-${Date.now()}`;
  patchStats(job, accountId, {
    lastRunDate: currentDate,
    todayRunCount,
    lastRunAt: Date.now(),
    lastStatus: 'running',
    lastError: undefined,
  });

  try {
    let result: ScheduledJobExecutorResult | undefined;
    if (job.jobType === 'listing.submitDrafts') {
      result = await runListingJob(job, accountId, runId);
    } else if (job.jobType === 'violation.scanProducts') {
      result = await runViolationJob(job, accountId, runId);
    } else if (job.jobType === 'orders.checkShipmentStatus') {
      result = await runOrderShipmentCheckJob(accountId);
    } else {
      throw new Error(`未支持的调度任务类型: ${job.jobType}`);
    }

    patchStats(job, accountId, {
      lastRunDate: currentDate,
      todayRunCount: todayRunCount + (result?.listed ?? 1),
      lastFinishedAt: Date.now(),
      lastStatus: result?.status || 'completed',
      lastError: result?.error,
    });
    logger.info(`[${job.id}] 执行完成: ${result?.error || result?.status || 'completed'}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    patchStats(job, accountId, {
      lastRunDate: currentDate,
      lastFinishedAt: Date.now(),
      lastStatus: 'failed',
      lastError: message,
    });
    logger.error(`[${job.id}] 执行失败`, error);
  }
}

async function executeJob(jobId: string, signal?: AbortSignal): Promise<void> {
  const job = getScheduledJobs().find(item => item.id === jobId);
  if (!job?.enabled) return;
  for (const accountId of targetAccountIds(job)) {
    if (signal?.aborted) return;
    await executeForAccount(job, accountId);
    if (job.scope === 'global' && (job.staggerMinutes || 0) > 0) {
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, (job.staggerMinutes || 0) * 60 * 1000);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    }
  }
}

export function startScheduledJob(job: ScheduledJob): void {
  stopScheduledJob(job.id);
  if (!job.enabled) return;
  if (!cron.validate(job.cronExpression)) {
    createLogger('ScheduledJob', 'system').warn(`[${job.id}] 无效 cron: ${job.cronExpression}`);
    return;
  }
  const task = cron.schedule(job.cronExpression, () => {
    void jobRunner.run(scheduledJobRunnerId(job.id), ({ signal }) => executeJob(job.id, signal)).catch(error => {
      createLogger('ScheduledJob', 'system').error(`[${job.id}] 调度执行失败`, error);
    });
  });
  scheduledJobs.set(job.id, task);
}

export function stopScheduledJob(jobId: string): void {
  jobRunner.stop(scheduledJobRunnerId(jobId));
  const task = scheduledJobs.get(jobId);
  if (!task) return;
  task.stop();
  scheduledJobs.delete(jobId);
}

export function startAllScheduledJobs(provider?: () => BrowserWindow | null): void {
  if (provider) mainWindowProvider = provider;
  for (const job of getScheduledJobs()) {
    startScheduledJob(job);
  }
}

export function stopAllScheduledJobs(): void {
  for (const jobId of Array.from(scheduledJobs.keys())) {
    stopScheduledJob(jobId);
  }
}
