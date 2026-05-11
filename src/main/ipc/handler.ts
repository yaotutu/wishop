import { ipcMain } from 'electron';
import {
  getAccounts,
  getAccount,
  addAccount,
  removeAccount,
  updateAccount,
  getActiveAccountId,
  setActiveAccountId,
  getConfig,
  setConfig,
  getScheduler,
  setScheduler,
  getTaskConfig,
  setTaskConfig,
  getLogs,
  clearLogs,
  addLog,
  logEmitter,
  Config,
  SchedulerConfig,
  TaskConfig,
  LogEntry,
  Account,
} from '../store';
import { createWeChatClient, DraftProduct, WeChatClient } from '../wechat/client';
import { startScheduler, stopScheduler, startAllSchedulers, stopAllSchedulers } from '../scheduler/listing-scheduler';
import { runTaskCycle, TaskCycleResult } from '../modules/task-cycle';
import { deleteOne } from '../modules/delete-failed-products';

// Per-account draft pagination state
const draftPaginationMap = new Map<string, { nextKey: string; hasMore: boolean }>();

// Per-account task abort controllers
const taskControllers = new Map<string, AbortController>();

export function registerHandlers(): void {
  // --- Account management ---
  ipcMain.handle('accounts:list', (): Account[] => {
    return getAccounts();
  });

  ipcMain.handle('accounts:add', (_, name: string, config: Config): Account => {
    return addAccount(name, config);
  });

  ipcMain.handle('accounts:remove', (_, accountId: string): void => {
    stopScheduler(accountId);
    removeAccount(accountId);
    draftPaginationMap.delete(accountId);
  });

  ipcMain.handle('accounts:update', (_, accountId: string, patch: Partial<Pick<Account, 'name' | 'config'>>): void => {
    updateAccount(accountId, patch);
  });

  ipcMain.handle('accounts:getActive', (): string => {
    return getActiveAccountId();
  });

  ipcMain.handle('accounts:setActive', (_, accountId: string): void => {
    setActiveAccountId(accountId);
  });

  // --- Config ---
  ipcMain.handle('config:get', (_, accountId: string): Config => {
    return getConfig(accountId);
  });

  ipcMain.handle('config:set', async (_, accountId: string, config: Config): Promise<{ success: boolean; error?: string }> => {
    setConfig(accountId, config);
    try {
      const api = createWeChatClient(config);
      await api.getAccessToken();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // --- Drafts ---
  ipcMain.handle('drafts:fetch', async (_, accountId: string, reset?: boolean): Promise<{ products: DraftProduct[]; hasMore: boolean }> => {
    let pagination = draftPaginationMap.get(accountId);
    if (!pagination || reset) {
      pagination = { nextKey: '', hasMore: true };
      draftPaginationMap.set(accountId, pagination);
    }

    if (!pagination.hasMore) {
      return { products: [], hasMore: false };
    }

    const api = createWeChatClient(getConfig(accountId));
    const need = 10;
    const products: DraftProduct[] = [];
    let nextKey = pagination.nextKey;

    while (products.length < need) {
      const result = await api.getDraftProducts(30, nextKey);

      for (const productId of result.productIds) {
        if (products.length >= need) break;
        try {
          const detail = await api.getProductDetail(productId);
          if (detail.editStatus === 72) {
            products.push(detail);
          }
        } catch (error) {
          console.error(`[Drafts] 获取商品 ${productId} 详情失败:`, error);
        }
      }

      nextKey = result.nextKey;
      if (!result.hasMore || !nextKey) {
        pagination.hasMore = false;
        break;
      }
    }

    pagination.nextKey = nextKey;
    return { products, hasMore: pagination.hasMore };
  });

  ipcMain.handle('drafts:list', async (_, accountId: string, productId: string): Promise<{ success: boolean; error?: string }> => {
    const api = createWeChatClient(getConfig(accountId));
    const scopedAddLog = (log: Omit<LogEntry, 'id' | 'timestamp'>) => addLog(accountId, log);
    try {
      const result = await api.listProduct(productId);
      if (result.errcode === 0) {
        scopedAddLog({ runId: '', productId, productTitle: '', action: 'list', status: 'success' });
        return { success: true };
      } else {
        scopedAddLog({ runId: '', productId, productTitle: '', action: 'list', status: 'failed', errorCode: result.errcode, errorMsg: result.errmsg });
        return { success: false, error: result.errmsg };
      }
    } catch (error: any) {
      scopedAddLog({ runId: '', productId, productTitle: '', action: 'list', status: 'failed', errorMsg: error.message });
      return { success: false, error: error.message };
    }
  });

  // --- Quota ---
  ipcMain.handle('quota:get', async (_, accountId: string): Promise<{ quota: number; total: number }> => {
    const api = createWeChatClient(getConfig(accountId));
    return api.getAuditQuota();
  });

  // --- Logs ---
  ipcMain.handle('logs:get', (_, accountId: string): LogEntry[] => {
    return getLogs(accountId);
  });

  ipcMain.handle('logs:clear', (_, accountId: string): void => {
    clearLogs(accountId);
  });

  // --- Scheduler ---
  ipcMain.handle('scheduler:get', (_, accountId: string): SchedulerConfig => {
    return getScheduler(accountId);
  });

  ipcMain.handle('scheduler:set', (_, accountId: string, scheduler: SchedulerConfig): void => {
    setScheduler(accountId, scheduler);
    if (scheduler.enabled) {
      startScheduler(accountId);
    } else {
      stopScheduler(accountId);
    }
  });

  ipcMain.handle('scheduler:start', (_, accountId: string): void => {
    startScheduler(accountId);
  });

  ipcMain.handle('scheduler:stop', (_, accountId: string): void => {
    stopScheduler(accountId);
  });

  // --- TaskConfig ---
  ipcMain.handle('taskConfig:get', (_, accountId: string): TaskConfig => {
    return getTaskConfig(accountId);
  });

  ipcMain.handle('taskConfig:set', (_, accountId: string, config: TaskConfig): void => {
    setTaskConfig(accountId, config);
  });

  // --- Task run ---
  ipcMain.handle('task:run', async (event, accountId: string, taskConfig: TaskConfig): Promise<TaskCycleResult> => {
    const runId = Date.now().toString();
    const scopedAddLog = (log: Omit<LogEntry, 'id' | 'timestamp'>) => addLog(accountId, log);

    if (taskConfig.listUnreviewed) {
      try {
        const api = createWeChatClient(getConfig(accountId));
        const quota = await api.getAuditQuota();
        console.log(`[TaskRun] 配额检查: 剩余 ${quota.quota} / 总共 ${quota.total}`);
        if (quota.quota > 0) {
          scopedAddLog({ runId, productId: '', productTitle: `今日提审配额: 剩余${quota.quota}/${quota.total}`, action: 'check', status: 'success' });
        } else {
          scopedAddLog({ runId, productId: '', productTitle: `今日提审配额已用完 (${quota.quota}/${quota.total})，请明天再试`, action: 'check', status: 'failed' });
          console.warn(`[TaskRun] 配额为0，跳过执行`);
          return { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: true, reason: `提审配额已用完 (剩余${quota.quota}/${quota.total})`, pendingDelete: [] };
        }
      } catch (error: any) {
        scopedAddLog({ runId, productId: '', productTitle: '', action: 'check', status: 'failed', errorMsg: `配额检查失败: ${error.message}` });
        console.error(`[TaskRun] 配额检查失败:`, error.message);
        return { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: true, reason: `配额检查失败: ${error.message}`, pendingDelete: [] };
      }
    }

    const win = event.sender;
    const onLog = (log: LogEntry) => {
      if (!win.isDestroyed()) {
        win.send(`log:added:${accountId}`, log);
      }
    };
    logEmitter.on(`log-added:${accountId}`, onLog);
    const controller = new AbortController();
    taskControllers.set(accountId, controller);
    try {
      const api = createWeChatClient(getConfig(accountId));
      const taskResult = await runTaskCycle(api, scopedAddLog, taskConfig, runId, controller.signal);
      return { ...taskResult, pendingDelete: taskResult.pendingDelete };
    } finally {
      taskControllers.delete(accountId);
      logEmitter.off(`log-added:${accountId}`, onLog);
    }
  });

  // --- Task stop ---
  ipcMain.handle('task:stop', (_, accountId: string): void => {
    const controller = taskControllers.get(accountId);
    if (controller) {
      controller.abort();
      console.log(`[TaskStop] 已发送停止信号: ${accountId}`);
    }
  });

  // --- Batch delete (after user confirmation) ---
  ipcMain.handle('task:batchDelete', async (event, accountId: string, products: DraftProduct[]): Promise<{ deleted: number; errors: number; stopped: boolean }> => {
    const runId = Date.now().toString();
    const scopedAddLog = (log: Omit<LogEntry, 'id' | 'timestamp'>) => addLog(accountId, log);
    const api = createWeChatClient(getConfig(accountId));
    let deleted = 0;
    let errors = 0;
    let stopped = false;

    const win = event.sender;
    const onLog = (log: LogEntry) => {
      if (!win.isDestroyed()) {
        win.send(`log:added:${accountId}`, log);
      }
    };
    logEmitter.on(`log-added:${accountId}`, onLog);

    try {
      for (const product of products) {
        const res = await deleteOne(api, scopedAddLog, product, runId);
        if (res === 'success') {
          deleted++;
        } else if (res === 'stopped') {
          stopped = true;
          break;
        } else {
          errors++;
        }
      }
    } finally {
      logEmitter.off(`log-added:${accountId}`, onLog);
    }

    return { deleted, errors, stopped };
  });
}
