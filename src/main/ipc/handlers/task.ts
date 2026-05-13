import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { createScopedAddLog, getTaskConfig, setTaskConfig } from '../../store';
import type { TaskConfig, DraftProduct, TaskCycleResult } from '../../../shared/types';
import { getClient } from '../../wxshop/client-registry';
import { runTaskCycle } from '../../modules/task-cycle';
import { batchDelete } from '../../modules/delete-failed-products';
import { withLogForwarding } from '../utils/log-forwarding';
import { SessionManager } from '../utils/session-manager';

export function registerTaskHandlers(context: { taskSessions: SessionManager<void> }): void {
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
        const api = getClient(accountId);
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

    return withLogForwarding(event, accountId, `log:added:${accountId}`, async () => {
      const signal = context.taskSessions.start(accountId, undefined);
      try {
        const api = getClient(accountId);
        const taskResult = await runTaskCycle(api, scopedAddLog, taskConfig, runId, signal);
        return { ...taskResult, pendingDelete: taskResult.pendingDelete };
      } finally {
        context.taskSessions.complete(accountId);
      }
    });
  });

  ipcMain.handle('task:stop', (_, accountId: string): void => {
    context.taskSessions.stop(accountId);
    console.log(`[TaskStop] 已发送停止信号: ${accountId}`);
  });

  ipcMain.handle('task:batchDelete', async (event: IpcMainInvokeEvent, accountId: string, products: DraftProduct[]): Promise<{ deleted: number; errors: number; stopped: boolean }> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = getClient(accountId);

    return withLogForwarding(event, accountId, `log:added:${accountId}`, () =>
      batchDelete(api, scopedAddLog, products, runId),
    );
  });
}
