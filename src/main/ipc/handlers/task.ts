import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getConfig, createScopedAddLog, getTaskConfig, setTaskConfig, logEmitter } from '../../store';
import type { TaskConfig, LogEntry, DraftProduct, TaskCycleResult } from '../../../shared/types';
import { createWeChatClient } from '../../wechat/client';
import { runTaskCycle } from '../../modules/task-cycle';
import { deleteOne } from '../../modules/delete-failed-products';

export function registerTaskHandlers(context: { taskControllers: Map<string, AbortController> }): void {
  ipcMain.handle('taskConfig:get', (_, accountId: string): TaskConfig => {
    return getTaskConfig(accountId);
  });

  ipcMain.handle('taskConfig:set', (_, accountId: string, config: TaskConfig): void => {
    setTaskConfig(accountId, config);
  });

  ipcMain.handle('task:run', async (event: IpcMainInvokeEvent, accountId: string, taskConfig: TaskConfig): Promise<TaskCycleResult> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);

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
    context.taskControllers.set(accountId, controller);
    try {
      const api = createWeChatClient(getConfig(accountId));
      const taskResult = await runTaskCycle(api, scopedAddLog, taskConfig, runId, controller.signal);
      return { ...taskResult, pendingDelete: taskResult.pendingDelete };
    } finally {
      context.taskControllers.delete(accountId);
      logEmitter.off(`log-added:${accountId}`, onLog);
    }
  });

  ipcMain.handle('task:stop', (_, accountId: string): void => {
    const controller = context.taskControllers.get(accountId);
    if (controller) {
      controller.abort();
      console.log(`[TaskStop] 已发送停止信号: ${accountId}`);
    }
  });

  ipcMain.handle('task:batchDelete', async (event: IpcMainInvokeEvent, accountId: string, products: DraftProduct[]): Promise<{ deleted: number; errors: number; stopped: boolean }> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
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
