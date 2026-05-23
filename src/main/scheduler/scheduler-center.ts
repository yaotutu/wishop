import * as cron from 'node-cron';
import type { BrowserWindow } from 'electron';
import type {
  FullAccount,
  ScheduledJob,
  ScheduledJobModule,
  ScheduledJobRunStats,
  ScheduledJobStatus,
  ScheduledJobType,
} from '../../shared/types';
import {
  addScheduledJob,
  getAccounts,
  getScheduledJobs,
  normalizeScheduledJobSingletons,
  removeScheduledJob,
  updateScheduledJob,
  updateScheduledJobAccountStats,
  updateScheduledJobStats,
  upsertScheduledJobSingleton,
} from '../store';
import { jobRunner } from '../jobs/job-runner';
import { createLogger } from '../utils/logger';

export type ScheduledJobExecutorResult = {
  listed?: number;
  status?: ScheduledJobStatus;
  error?: string;
};

export type ScheduledJobExecutorContext = {
  job: ScheduledJob;
  accountId?: string;
  runId: string;
  signal?: AbortSignal;
  getMainWindow: () => BrowserWindow | null;
};

export type ScheduledJobExecutor = (
  context: ScheduledJobExecutorContext,
) => Promise<ScheduledJobExecutorResult | void>;

export type ScheduledJobDefinition = {
  module: ScheduledJobModule;
  jobType: ScheduledJobType;
  executor: ScheduledJobExecutor;
  targetAccountIds?: (job: ScheduledJob) => string[];
  createDefaultJob?: () => Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'> | null;
};

export type ScheduledJobUpsertOptions = {
  start?: boolean;
};

export type DeferredScheduledTask = {
  id: string;
  runAt: number;
  runnerId?: string;
  task: (context: { signal: AbortSignal }) => Promise<void> | void;
};

const scheduledTasks = new Map<string, cron.ScheduledTask>();
const deferredTasks = new Map<string, { timeout: ReturnType<typeof setTimeout>; runnerId: string }>();
const definitions = new Map<ScheduledJobType, ScheduledJobDefinition>();
let mainWindowProvider: (() => BrowserWindow | null) | null = null;

function scheduledJobRunnerId(jobId: string): string {
  return `scheduled:${jobId}`;
}

function deferredRunnerId(taskId: string): string {
  return `deferred:${taskId}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMainWindow(): BrowserWindow | null {
  return mainWindowProvider?.() || null;
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

function defaultTargetAccountIds(job: ScheduledJob): string[] {
  if (job.scope === 'account') return job.accountId ? [job.accountId] : [];
  const excluded = new Set(job.excludedAccountIds || []);
  return getAccounts()
    .filter((account: FullAccount) => !excluded.has(account.id))
    .map(account => account.id);
}

function targetAccountIds(job: ScheduledJob, definition: ScheduledJobDefinition): string[] {
  return definition.targetAccountIds?.(job) || defaultTargetAccountIds(job);
}

export function scheduledJobSingletonKey(jobType: ScheduledJobType): string {
  return `global:${jobType}`;
}

export function registerScheduledJobDefinition(definition: ScheduledJobDefinition): void {
  definitions.set(definition.jobType, definition);
}

export function isSupportedJobCron(cronExpression: string): boolean {
  return cron.validate(cronExpression);
}

export function upsertScheduledJob(
  input: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>,
  options: ScheduledJobUpsertOptions = {},
): ScheduledJob {
  const singletonKey = input.singletonKey || (input.scope === 'global' ? scheduledJobSingletonKey(input.jobType) : undefined);
  const job = singletonKey
    ? upsertScheduledJobSingleton(singletonKey, { ...input, singletonKey })
    : addScheduledJob(input);
  if (options.start !== false) {
    startScheduledJob(job);
  }
  return job;
}

export function updateScheduledJobAndReschedule(jobId: string, patch: Partial<ScheduledJob>): ScheduledJob | undefined {
  updateScheduledJob(jobId, patch);
  const next = getScheduledJobs().find(job => job.id === jobId);
  if (next) startScheduledJob(next);
  return next;
}

export function removeScheduledJobAndStop(jobId: string): void {
  stopScheduledJob(jobId);
  removeScheduledJob(jobId);
}

export function reconcileScheduledJobDefinition(
  jobType: ScheduledJobType,
  options: ScheduledJobUpsertOptions = {},
): ScheduledJob | null {
  const definition = definitions.get(jobType);
  if (!definition?.createDefaultJob) return null;
  const input = definition.createDefaultJob();
  return input ? upsertScheduledJob(input, options) : null;
}

export function reconcileDefaultScheduledJobs(options: ScheduledJobUpsertOptions = {}): ScheduledJob[] {
  return Array.from(definitions.values())
    .map(definition => definition.createDefaultJob?.())
    .filter((input): input is Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'> => !!input)
    .map(input => upsertScheduledJob(input, options));
}

async function delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

async function executeForAccount(
  job: ScheduledJob,
  definition: ScheduledJobDefinition,
  accountId: string,
  signal?: AbortSignal,
): Promise<void> {
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
    const result = await definition.executor({ job, accountId, runId, signal, getMainWindow });
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
  const definition = definitions.get(job.jobType);
  if (!definition) {
    createLogger('ScheduledJob', 'system').warn(`[${job.id}] 未注册调度任务定义: ${job.jobType}`);
    return;
  }

  const accounts = targetAccountIds(job, definition);
  for (const [index, accountId] of accounts.entries()) {
    if (signal?.aborted) return;
    if (index > 0 && job.scope === 'global' && (job.staggerMinutes || 0) > 0) {
      await delayWithSignal((job.staggerMinutes || 0) * 60 * 1000, signal);
    }
    if (signal?.aborted) return;
    await executeForAccount(job, definition, accountId, signal);
  }
}

export function startScheduledJob(job: ScheduledJob): void {
  stopScheduledJob(job.id);
  if (!job.enabled) return;

  if (!definitions.has(job.jobType)) {
    createLogger('ScheduledJob', 'system').warn(`[${job.id}] 未注册调度任务定义: ${job.jobType}`);
    return;
  }
  if (!cron.validate(job.cronExpression)) {
    createLogger('ScheduledJob', 'system').warn(`[${job.id}] 无效 cron: ${job.cronExpression}`);
    return;
  }

  const task = cron.schedule(job.cronExpression, () => {
    void jobRunner.run(scheduledJobRunnerId(job.id), ({ signal }) => executeJob(job.id, signal)).catch(error => {
      createLogger('ScheduledJob', 'system').error(`[${job.id}] 调度执行失败`, error);
    });
  });
  scheduledTasks.set(job.id, task);
}

export function stopScheduledJob(jobId: string): void {
  jobRunner.stop(scheduledJobRunnerId(jobId));
  const task = scheduledTasks.get(jobId);
  if (!task) return;
  task.stop();
  scheduledTasks.delete(jobId);
}

export function startAllScheduledJobs(provider?: () => BrowserWindow | null): void {
  if (provider) mainWindowProvider = provider;
  reconcileDefaultScheduledJobs({ start: false });
  normalizeScheduledJobSingletons();
  for (const job of getScheduledJobs()) {
    startScheduledJob(job);
  }
}

export function stopAllScheduledJobs(): void {
  for (const jobId of Array.from(scheduledTasks.keys())) {
    stopScheduledJob(jobId);
  }
  for (const taskId of Array.from(deferredTasks.keys())) {
    cancelDeferredTask(taskId);
  }
}

export function scheduleDeferredTask(input: DeferredScheduledTask): void {
  cancelDeferredTask(input.id);
  const runnerId = input.runnerId || deferredRunnerId(input.id);
  const run = () => {
    deferredTasks.delete(input.id);
    void jobRunner.run(runnerId, ({ signal }) => input.task({ signal })).catch(error => {
      createLogger('ScheduledJob', 'system').error(`[${input.id}] 延迟任务执行失败`, error);
    });
  };
  const delay = Math.max(0, input.runAt - Date.now());
  if (delay === 0) {
    queueMicrotask(run);
    return;
  }
  const timeout = setTimeout(run, delay);
  deferredTasks.set(input.id, { timeout, runnerId });
}

export function cancelDeferredTask(taskId: string): void {
  const active = deferredTasks.get(taskId);
  if (!active) return;
  clearTimeout(active.timeout);
  jobRunner.stop(active.runnerId);
  deferredTasks.delete(taskId);
}

export function cancelDeferredTasksByPrefix(prefix: string): void {
  for (const taskId of Array.from(deferredTasks.keys())) {
    if (taskId.startsWith(prefix)) cancelDeferredTask(taskId);
  }
}

export function resetScheduledJobDefinitionsForTests(): void {
  stopAllScheduledJobs();
  definitions.clear();
  mainWindowProvider = null;
}
