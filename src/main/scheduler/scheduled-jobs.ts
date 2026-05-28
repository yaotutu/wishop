import { v4 as uuidv4 } from 'uuid';
import type {
  OrderHistoryBackfillPayload,
  ScheduledJob,
  ScheduledJobInput,
  ScheduledJobRunNowResult,
  ScheduledJobRunStats,
  ScheduledJobStatus,
  ScheduledJobView,
  TaskConfig,
} from '../../shared/types';
import { recordActivityCompleted, recordActivityFailed, recordActivitySkipped, recordActivityStarted } from '../activity-logs/activity-log-service';
import { orderSyncService } from '../orders/order-domain';
import { planOrderHistoryBackfillWindow } from '../orders/order-history-backfill-window';
import { createDiagnosticLogger } from '../logging/diagnostic-logger';
import { createScopedAddLog, getAccount, getAccounts, getBlacklistRules, getSkipKeywords, getStatusRules, getViolationWords, readStore, writeStore } from '../store';
import { runTaskCycle } from '../modules/task-cycle';
import { batchScan } from '../modules/violation-detect';
import { getClient } from '../wxshop/client-registry';

const ORDER_RECENT_SYNC_CRON = '*/5 * * * *';
const ORDER_HISTORY_BACKFILL_CRON = '*/3 * * * *';
const DEFAULT_HISTORY_BACKFILL_LOOKBACK_DAYS = 182;

interface ParsedSchedule {
  nextRunAt: number;
  periodMs: number;
}

interface TimerState {
  timeout: ReturnType<typeof setTimeout>;
  nextRunAt: number;
}

const timers = new Map<string, TimerState>();

function initialStats(): ScheduledJobRunStats {
  return { lastRunDate: '', todayRunCount: 0 };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function jobs(): ScheduledJob[] {
  return readStore().scheduledJobs || [];
}

function setJobs(next: ScheduledJob[]): void {
  writeStore({ scheduledJobs: next });
}

function getScheduledJob(jobId: string): ScheduledJob | undefined {
  return jobs().find(job => job.id === jobId);
}

function timerKey(jobId: string, accountId?: string): string {
  return accountId ? `${jobId}:${accountId}` : jobId;
}

function nextDaily(hour: number, minute: number, offsetMinutes: number, from = Date.now()): number {
  const next = new Date(from);
  next.setHours(hour, minute, 0, 0);
  if (offsetMinutes > 0) next.setMinutes(next.getMinutes() + offsetMinutes);
  if (next.getTime() <= from) next.setDate(next.getDate() + 1);
  return next.getTime();
}

function nextHourly(minute: number, offsetMinutes: number, from = Date.now()): number {
  const next = new Date(from);
  next.setMinutes(minute, 0, 0);
  if (offsetMinutes > 0) next.setMinutes(next.getMinutes() + offsetMinutes);
  if (next.getTime() <= from) next.setHours(next.getHours() + 1);
  return next.getTime();
}

export function parseJobSchedule(cronExpression: string, offsetMinutes = 0, from = Date.now()): ParsedSchedule | null {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*') return null;

  const everyMinutes = minute.match(/^\*\/(\d+)$/);
  if (everyMinutes && hour === '*') {
    const periodMinutes = Number(everyMinutes[1]);
    if (!Number.isFinite(periodMinutes) || periodMinutes < 1) return null;
    const periodMs = periodMinutes * 60 * 1000;
    return { nextRunAt: from + periodMs + offsetMinutes * 60 * 1000, periodMs };
  }

  if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    const m = Number(minute);
    const h = Number(hour);
    if (m < 0 || m > 59 || h < 0 || h > 23) return null;
    return { nextRunAt: nextDaily(h, m, offsetMinutes, from), periodMs: 24 * 60 * 60 * 1000 };
  }

  if (/^\d+$/.test(minute) && hour === '*') {
    const m = Number(minute);
    if (m < 0 || m > 59) return null;
    return { nextRunAt: nextHourly(m, offsetMinutes, from), periodMs: 60 * 60 * 1000 };
  }

  return null;
}

export function isSupportedJobCron(cronExpression: string): boolean {
  return parseJobSchedule(cronExpression) !== null;
}

function unsupportedCronError(cronExpression: string): Error {
  return new Error(`当前定时器不支持该 cron 表达式: ${cronExpression}。请改为 */N * * * *、M * * * * 或 M H * * *。`);
}

function normalizeJob(input: ScheduledJobInput): ScheduledJob {
  const now = Date.now();
  const base = {
    ...input,
    id: uuidv4(),
    stats: initialStats(),
    createdAt: now,
    updatedAt: now,
  };
  if (input.scope === 'global') {
    return {
      ...base,
      scope: 'global',
      accountStats: {},
      excludedAccountIds: input.excludedAccountIds || [],
      staggerMinutes: input.staggerMinutes || 0,
    };
  }
  if (input.scope === 'system') {
    return {
      ...base,
      scope: 'system',
    };
  }
  return {
    ...base,
    scope: 'account',
    accountId: input.accountId,
  };
}

function patchJob(jobId: string, updater: (job: ScheduledJob) => ScheduledJob): void {
  setJobs(jobs().map(job => job.id === jobId ? updater(job) : job));
}

function patchJobStats(jobId: string, accountId: string | undefined, patch: Partial<ScheduledJobRunStats>): void {
  patchJob(jobId, (job) => {
    if (job.scope === 'global' && accountId) {
      return {
        ...job,
        accountStats: {
          ...job.accountStats,
          [accountId]: { ...initialStats(), ...job.accountStats[accountId], ...patch },
        },
        updatedAt: Date.now(),
      };
    }
    return {
      ...job,
      stats: { ...initialStats(), ...job.stats, ...patch },
      updatedAt: Date.now(),
    } as ScheduledJob;
  });
}

function completeScheduledJob(jobId: string): void {
  patchJob(jobId, job => ({
    ...job,
    enabled: false,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  } as ScheduledJob));
}

function updateScheduledJobPayload(jobId: string, payload: unknown): void {
  patchJob(jobId, job => ({ ...job, payload, updatedAt: Date.now() } as ScheduledJob));
}

function statsFor(job: ScheduledJob, accountId?: string): ScheduledJobRunStats {
  if (job.scope === 'global' && accountId) return job.accountStats[accountId] || initialStats();
  return job.stats || initialStats();
}

function logScope(job: ScheduledJob) {
  return job.scope === 'account' ? 'account' as const : 'global' as const;
}

function trigger(job: ScheduledJob) {
  if (job.scope === 'global') return 'globalScheduled' as const;
  if (job.scope === 'system') return 'background' as const;
  return 'scheduled' as const;
}

async function runListingJob(job: ScheduledJob, accountId: string): Promise<ScheduledJobRunNowResult> {
  const api = getClient(accountId);
  const quota = await api.getAuditQuota();
  if (quota.quota <= 0) {
    return { listed: 0, status: 'skipped', message: null, error: '今日提审配额已用完', completed: false };
  }
  const configured = job.payload as TaskConfig;
  const listUnreviewedQuantity = Math.min(configured.listUnreviewedQuantity || quota.quota, quota.quota);
  const result = await runTaskCycle(
    api,
    createScopedAddLog(accountId),
    { ...configured, listUnreviewedQuantity },
    `scheduled-${job.id}-${Date.now()}`,
    undefined,
    accountId,
    getBlacklistRules(),
    getSkipKeywords(),
    getStatusRules(),
  );
  return {
    listed: result.listed,
    status: result.stopped || result.errors > 0 ? 'failed' : 'completed',
    message: result.reason || '商品提审任务执行完成',
    error: result.stopped || result.errors > 0 ? result.reason || '商品提审任务执行失败' : null,
    completed: false,
  };
}

async function batchScanViolationProducts(job: ScheduledJob, accountId?: string): Promise<ScheduledJobRunNowResult> {
  const accounts = accountId
    ? getAccounts().filter(account => account.id === accountId)
    : getAccounts();
  if (accounts.length === 0) {
    return { listed: 0, status: 'skipped', message: null, error: '没有可扫描账号', completed: false };
  }

  const payload = typeof job.payload === 'object' && job.payload !== null ? job.payload as { limit?: number } : {};
  let scanned = 0;
  let violationCount = 0;
  let failedCount = 0;
  const skippedAccounts: string[] = [];
  const failures: string[] = [];

  for (const account of accounts) {
    const words = getViolationWords(account.id);
    if (words.length === 0) {
      skippedAccounts.push(account.name);
      continue;
    }
    try {
      const result = await batchScan(
        getClient(account.id),
        createScopedAddLog(account.id),
        words,
        `scheduled-violation-${job.id}-${Date.now()}`,
        undefined,
        payload.limit,
        account.id,
      );
      scanned += result.scanned;
      violationCount += result.violations.length;
      if (result.errors > 0 || result.stopped) {
        failedCount += 1;
        failures.push(`${account.name}: ${result.reason || `扫描异常 ${result.errors} 个`}`);
      }
    } catch (error) {
      failedCount += 1;
      failures.push(`${account.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const completedCount = accounts.length - skippedAccounts.length - failedCount;
  if (completedCount === 0 && failedCount === 0) {
    return { listed: 0, status: 'skipped', message: null, error: '所有账号词库为空，已跳过', completed: false };
  }
  if (failedCount > 0 && completedCount === 0) {
    return { listed: Math.max(scanned, 1), status: 'failed', message: null, error: failures.join('; '), completed: false };
  }
  return {
    listed: Math.max(scanned, violationCount, 1),
    status: failedCount > 0 ? 'completed' : 'completed',
    message: `违规扫描完成，扫描 ${scanned} 个商品，命中 ${violationCount} 条${failedCount > 0 ? `，失败 ${failedCount} 个账号` : ''}`,
    error: failedCount > 0 ? failures.join('; ') : null,
    completed: false,
  };
}

function normalizeBackfillPayload(payload: unknown): OrderHistoryBackfillPayload {
  const value = typeof payload === 'object' && payload !== null ? payload as OrderHistoryBackfillPayload : {};
  return {
    lookbackDays: value.lookbackDays || DEFAULT_HISTORY_BACKFILL_LOOKBACK_DAYS,
    cursorByAccountId: value.cursorByAccountId || {},
  };
}

async function runHistoryBackfillWindow(job: ScheduledJob): Promise<ScheduledJobRunNowResult> {
  const accounts = getAccounts();
  const payload = normalizeBackfillPayload(job.payload);
  const cursorByAccountId = { ...(payload.cursorByAccountId || {}) };
  const lookbackDays = payload.lookbackDays || DEFAULT_HISTORY_BACKFILL_LOOKBACK_DAYS;
  const nowSeconds = Math.floor(Date.now() / 1000);
  let updatedOrderCount = 0;
  let processedAccountCount = 0;
  let completedAccountCount = 0;
  const failures: string[] = [];

  for (const account of accounts) {
    const plan = planOrderHistoryBackfillWindow({
      nowSeconds,
      lookbackDays,
      cursor: cursorByAccountId[account.id],
    });
    if (plan.completed || plan.windowStartTime === undefined || plan.windowEndTime === undefined || plan.nextCursor === undefined) {
      completedAccountCount += 1;
      continue;
    }

    try {
      const result = await orderSyncService.refresh(
        { type: 'account', accountId: account.id },
        {
          reason: 'historyBackfill',
          mode: 'backfill',
          windowStartTime: plan.windowStartTime,
          windowEndTime: plan.windowEndTime,
          lookbackDays,
          maxWindows: 1,
        },
      );
      updatedOrderCount += result.updatedOrderCount;
      processedAccountCount += 1;
      cursorByAccountId[account.id] = plan.nextCursor;
    } catch (error) {
      failures.push(`${account.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  updateScheduledJobPayload(job.id, { lookbackDays, cursorByAccountId } satisfies OrderHistoryBackfillPayload);

  if (accounts.length === 0) {
    return { listed: 1, status: 'skipped', message: '订单历史补拉跳过：当前没有账号', error: null, completed: false };
  }
  if (completedAccountCount === accounts.length) {
    return { listed: 1, status: 'completed', message: '订单历史补拉已完成', error: null, completed: true };
  }
  const message = failures.length > 0
    ? `订单历史补拉完成，处理 ${processedAccountCount} 个账号，失败 ${failures.length} 个账号：${failures.join('; ')}`
    : `订单历史补拉完成，处理 ${processedAccountCount} 个账号，新增/变更 ${updatedOrderCount} 条订单`;
  const status: ScheduledJobStatus = failures.length > 0 && processedAccountCount === 0 ? 'failed' : 'completed';
  return {
    listed: Math.max(updatedOrderCount, processedAccountCount, 1),
    status,
    message: status === 'completed' ? message : null,
    error: status === 'failed' ? message : null,
    completed: false,
  };
}

async function runJobExecutor(job: ScheduledJob, accountId: string | undefined): Promise<ScheduledJobRunNowResult> {
  if (job.jobType === 'listing.submitDrafts') {
    if (!accountId) throw new Error('商品提审定时任务缺少账号上下文');
    return runListingJob(job, accountId);
  }
  if (job.jobType === 'orders.syncRecent') {
    const result = await orderSyncService.refresh({ type: 'all' }, { reason: 'autoSync', mode: 'incremental' });
    const failedCount = result.failedAccounts.length;
    const message = failedCount > 0
      ? `订单自动同步完成，成功 ${result.refreshedAccountIds.length} 个账号，失败 ${failedCount} 个账号，扫描 ${result.fetchedOrderCount} 条，新增/变更 ${result.updatedOrderCount} 条`
      : `订单自动同步完成，扫描 ${result.fetchedOrderCount} 条，新增/变更 ${result.updatedOrderCount} 条`;
    return {
      listed: Math.max(result.fetchedOrderCount || result.updatedOrderCount, 1),
      status: failedCount > 0 && result.refreshedAccountIds.length === 0 ? 'failed' : 'completed',
      message: failedCount > 0 && result.refreshedAccountIds.length === 0 ? null : message,
      error: failedCount > 0 && result.refreshedAccountIds.length === 0 ? message : null,
      completed: false,
    };
  }
  if (job.jobType === 'orders.backfillHistory') {
    return runHistoryBackfillWindow(job);
  }
  if (job.jobType === 'violation.scanProducts') {
    return batchScanViolationProducts(job, accountId);
  }
  return {
    listed: 0,
    status: 'skipped',
    message: null,
    error: `暂不支持的任务类型: ${job.jobType}`,
    completed: false,
  };
}

function aggregateRunResults(results: ScheduledJobRunNowResult[]): ScheduledJobRunNowResult {
  if (results.length === 0) return { listed: 0, status: 'skipped', message: null, error: '没有可执行账号', completed: false };
  const listed = results.reduce((sum, result) => sum + result.listed, 0);
  const failed = results.filter(result => result.status === 'failed');
  const completed = results.filter(result => result.status === 'completed');
  const status: ScheduledJobStatus = failed.length === results.length
    ? 'failed'
    : completed.length > 0
      ? 'completed'
      : 'skipped';
  return {
    listed,
    status,
    message: failed.length > 0 && completed.length > 0
      ? `手动执行完成，失败 ${failed.length}/${results.length} 个账号：${failed.map(result => result.error).filter(Boolean).join('; ')}`
      : results.map(result => result.message).filter(Boolean).join('; ') || null,
    error: failed.length === results.length
      ? failed.map(result => result.error || result.message).filter(Boolean).join('; ')
      : null,
    completed: false,
  };
}

async function executeScheduledJob(job: ScheduledJob, accountId?: string): Promise<ScheduledJobRunNowResult> {
  if (!job.enabled) return { listed: 0, status: 'skipped', message: null, error: '任务已停用', completed: false };

  const targetAccountId = accountId || (job.scope === 'account' ? job.accountId : undefined);
  const account = targetAccountId ? getAccount(targetAccountId) : undefined;
  const stat = statsFor(job, targetAccountId);
  const currentDate = todayKey();
  const todayRunCount = stat.lastRunDate === currentDate ? stat.todayRunCount : 0;

  if (job.dailyLimit > 0 && todayRunCount >= job.dailyLimit) {
    await recordActivitySkipped({
      domain: job.module,
      scope: logScope(job),
      accountId: targetAccountId,
      accountName: account?.name,
      taskId: job.id,
      taskName: job.name,
      trigger: trigger(job),
      title: '定时任务跳过',
      detail: `今日已执行 ${todayRunCount}，达到任务上限 ${job.dailyLimit}`,
    });
    return { listed: 0, status: 'skipped', message: null, error: `今日已执行 ${todayRunCount}，达到任务上限 ${job.dailyLimit}`, completed: false };
  }

  const runId = `${job.scope === 'global' ? 'global-job' : job.scope === 'system' ? 'system-job' : 'job'}-${job.id}-${Date.now()}`;
  const startedAt = Date.now();
  patchJobStats(job.id, job.scope === 'global' ? targetAccountId : undefined, {
    lastRunDate: currentDate,
    todayRunCount,
    lastRunAt: startedAt,
    lastStatus: 'running',
    lastMessage: undefined,
    lastListed: undefined,
    lastError: undefined,
  });

  await recordActivityStarted({
    domain: job.module,
    scope: logScope(job),
    accountId: targetAccountId,
    accountName: account?.name,
    taskId: job.id,
    taskName: job.name,
    trigger: trigger(job),
    runId,
    title: '定时任务开始执行',
    detail: `任务类型：${job.jobType}`,
  });

  try {
    const result = await runJobExecutor(job, targetAccountId);
    if (job.runMode === 'recurring' && result.completed) {
      throw new Error(`周期任务 ${job.jobType} 不允许返回 completed=true`);
    }
    const detail = result.message ?? result.error ?? undefined;
    const errorMessage = result.status === 'failed' ? result.error || result.message || undefined : undefined;
    patchJobStats(job.id, job.scope === 'global' ? targetAccountId : undefined, {
      lastRunDate: currentDate,
      todayRunCount: todayRunCount + result.listed,
      lastFinishedAt: Date.now(),
      lastStatus: result.status,
      lastMessage: result.status === 'failed' ? undefined : detail,
      lastListed: result.listed,
      lastError: errorMessage,
    });

    if (job.runMode === 'untilComplete' && result.completed) {
      completeScheduledJob(job.id);
      stopScheduledJob(job.id);
    }

    if (result.status === 'skipped') {
      await recordActivitySkipped({
        domain: job.module,
        scope: logScope(job),
        accountId: targetAccountId,
        accountName: account?.name,
        taskId: job.id,
        taskName: job.name,
        trigger: trigger(job),
        title: '定时任务跳过',
        detail,
      });
      return { ...result, message: detail ?? null, error: null };
    }

    await recordActivityCompleted({
      domain: job.module,
      scope: logScope(job),
      accountId: targetAccountId,
      accountName: account?.name,
      taskId: job.id,
      taskName: job.name,
      trigger: trigger(job),
      runId,
      title: '定时任务执行完成',
      detail,
      summary: { listed: result.listed },
    });
    return { ...result, message: result.status === 'failed' ? null : detail ?? null, error: errorMessage ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    patchJobStats(job.id, job.scope === 'global' ? targetAccountId : undefined, {
      lastRunDate: currentDate,
      todayRunCount: todayRunCount + 1,
      lastFinishedAt: Date.now(),
      lastStatus: 'failed',
      lastMessage: undefined,
      lastListed: 1,
      lastError: message,
    });
    await recordActivityFailed({
      domain: job.module,
      scope: logScope(job),
      accountId: targetAccountId,
      accountName: account?.name,
      taskId: job.id,
      taskName: job.name,
      trigger: trigger(job),
      runId,
      title: '定时任务执行失败',
      detail: message,
      error: { message },
      notification: {
        topic: 'scheduled_job.failed',
        urgency: 'important',
        detail: message,
      },
    });
    return { listed: 1, status: 'failed', message: null, error: message, completed: false };
  }
}

function scheduleTimer(job: ScheduledJob, accountId: string | undefined, offsetMinutes = 0): boolean {
  const schedule = parseJobSchedule(job.cronExpression, offsetMinutes);
  if (!schedule) return false;
  const key = timerKey(job.id, accountId);
  const delay = Math.max(1000, schedule.nextRunAt - Date.now());
  const timeout = setTimeout(() => {
    timers.delete(key);
    void runScheduledJobTimer(job.id, accountId);
  }, delay);
  timers.set(key, { timeout, nextRunAt: schedule.nextRunAt });
  return true;
}

async function runScheduledJobTimer(jobId: string, accountId?: string): Promise<void> {
  const job = getScheduledJob(jobId);
  if (!job || !job.enabled) return;
  const logger = createDiagnosticLogger({ domain: 'scheduler', component: 'ScheduledJobs', accountId });
  logger.info(`[${jobId}] 定时任务触发`, { accountId });
  await executeScheduledJob(job, accountId);
  const latest = getScheduledJob(jobId);
  if (latest?.enabled) {
    if (latest.scope === 'global' && accountId) scheduleTimer(latest, accountId);
    else if (latest.scope !== 'global') scheduleTimer(latest, undefined);
  }
}

export function stopScheduledJob(jobId: string): void {
  for (const [key, timer] of [...timers.entries()]) {
    if (key === jobId || key.startsWith(`${jobId}:`)) {
      clearTimeout(timer.timeout);
      timers.delete(key);
    }
  }
}

export function startScheduledJob(job: ScheduledJob): boolean {
  const logger = createDiagnosticLogger({
    domain: 'scheduler',
    component: 'ScheduledJobs',
    accountId: job.scope === 'account' ? job.accountId : undefined,
  });
  stopScheduledJob(job.id);
  if (!job.enabled) return true;

  if (job.scope === 'global') {
    const accounts = getAccounts().filter(account => !job.excludedAccountIds.includes(account.id));
    for (const [index, account] of accounts.entries()) {
      if (!scheduleTimer(job, account.id, index * job.staggerMinutes)) {
        stopScheduledJob(job.id);
        logger.warn(`[${job.id}] 不支持的 cron 表达式: ${job.cronExpression}`);
        return false;
      }
    }
    return true;
  }

  if (!scheduleTimer(job, undefined)) {
    logger.warn(`[${job.id}] 不支持的 cron 表达式: ${job.cronExpression}`);
    return false;
  }
  return true;
}

export function startAllScheduledJobs(): void {
  for (const job of jobs()) {
    if (job.enabled) startScheduledJob(job);
  }
}

export function stopAllScheduledJobs(): void {
  for (const [key, timer] of timers.entries()) {
    clearTimeout(timer.timeout);
    timers.delete(key);
  }
}

export function getScheduledJobNextRunAt(job: ScheduledJob): number | null {
  if (!job.enabled) return null;
  if (job.scope === 'global') {
    const values = [...timers.entries()]
      .filter(([key]) => key.startsWith(`${job.id}:`))
      .map(([, timer]) => timer.nextRunAt)
      .sort((a, b) => a - b);
    return values[0] ?? parseJobSchedule(job.cronExpression)?.nextRunAt ?? null;
  }
  return timers.get(timerKey(job.id))?.nextRunAt ?? parseJobSchedule(job.cronExpression)?.nextRunAt ?? null;
}

export function listScheduledJobs(): ScheduledJobView[] {
  ensureDefaultOrderScheduledJobs();
  return jobs().map(job => ({ ...job, nextRunAt: getScheduledJobNextRunAt(job) }));
}

export function addScheduledJob(input: ScheduledJobInput): ScheduledJob {
  if (!isSupportedJobCron(input.cronExpression)) throw unsupportedCronError(input.cronExpression);
  const job = normalizeJob(input);
  setJobs([job, ...jobs()]);
  if (job.enabled && !startScheduledJob(job)) throw unsupportedCronError(job.cronExpression);
  return job;
}

export function updateScheduledJob(jobId: string, patch: Partial<ScheduledJob>): void {
  if (patch.cronExpression && !isSupportedJobCron(patch.cronExpression)) throw unsupportedCronError(patch.cronExpression);
  const existing = getScheduledJob(jobId);
  if (!existing) return;
  setJobs(jobs().map(job => (
    job.id === jobId ? { ...job, ...patch, id: job.id, updatedAt: Date.now() } as ScheduledJob : job
  )));
  const updated = getScheduledJob(jobId);
  if (!updated) return;
  if (patch.enabled === false) stopScheduledJob(jobId);
  else if (updated.enabled) startScheduledJob(updated);
}

export function removeScheduledJob(jobId: string): void {
  stopScheduledJob(jobId);
  setJobs(jobs().filter(job => job.id !== jobId));
}

export async function runScheduledJobNow(jobId: string): Promise<ScheduledJobRunNowResult> {
  const job = getScheduledJob(jobId);
  if (!job) throw new Error(`定时任务不存在: ${jobId}`);
  if (!job.enabled) throw new Error('任务已停用，无法手动执行');

  let result: ScheduledJobRunNowResult;
  if (job.scope === 'global') {
    const accounts = getAccounts().filter(account => !job.excludedAccountIds.includes(account.id));
    const results: ScheduledJobRunNowResult[] = [];
    for (const account of accounts) {
      results.push(await executeScheduledJob(job, account.id));
    }
    result = aggregateRunResults(results);
  } else {
    result = await executeScheduledJob(job);
  }

  const latest = getScheduledJob(jobId);
  if (latest?.enabled) startScheduledJob(latest);
  else stopScheduledJob(jobId);
  return result;
}

export function ensureDefaultOrderScheduledJobs(): void {
  const existing = jobs();
  const syncJob = existing.find(job => job.jobType === 'orders.syncRecent' && job.scope === 'system');
  if (syncJob) {
    const patch: Partial<ScheduledJob> = {};
    if (syncJob.cronExpression !== ORDER_RECENT_SYNC_CRON) patch.cronExpression = ORDER_RECENT_SYNC_CRON;
    if (!syncJob.enabled) patch.enabled = true;
    if (Object.keys(patch).length > 0) updateScheduledJob(syncJob.id, patch);
  } else {
    addScheduledJob({
      name: '订单自动同步',
      enabled: true,
      module: 'orders',
      jobType: 'orders.syncRecent',
      scope: 'system',
      runMode: 'recurring',
      cronExpression: ORDER_RECENT_SYNC_CRON,
      dailyLimit: 0,
      completedAt: null,
      payload: {},
    });
  }

  const backfillJob = jobs().find(job => job.jobType === 'orders.backfillHistory' && job.scope === 'system') as ScheduledJob<OrderHistoryBackfillPayload> | undefined;
  if (backfillJob) {
    const normalizedPayload = normalizeBackfillPayload(backfillJob.payload);
    const patch: Partial<ScheduledJob<OrderHistoryBackfillPayload>> = {};
    if (backfillJob.cronExpression !== ORDER_HISTORY_BACKFILL_CRON) patch.cronExpression = ORDER_HISTORY_BACKFILL_CRON;
    if (backfillJob.runMode !== 'untilComplete') patch.runMode = 'untilComplete';
    if (JSON.stringify(backfillJob.payload || {}) !== JSON.stringify(normalizedPayload)) patch.payload = normalizedPayload;
    if (Object.keys(patch).length > 0) updateScheduledJob(backfillJob.id, patch as Partial<ScheduledJob>);
    return;
  }

  addScheduledJob({
    name: '订单历史补拉',
    enabled: true,
    module: 'orders',
    jobType: 'orders.backfillHistory',
    scope: 'system',
    runMode: 'untilComplete',
    cronExpression: ORDER_HISTORY_BACKFILL_CRON,
    dailyLimit: 0,
    completedAt: null,
    payload: {
      lookbackDays: DEFAULT_HISTORY_BACKFILL_LOOKBACK_DAYS,
      cursorByAccountId: {},
    },
  });
}
