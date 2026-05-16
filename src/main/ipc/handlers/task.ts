import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { createScopedAddLog, getTaskConfig, setTaskConfig, getBlacklistRules, getSkipKeywords, getStatusRules } from '../../store';
import type { TaskConfig, TaskCycleResult } from '../../../shared/types';
import { getClient } from '../../wxshop/client-registry';
import { runTaskCycle } from '../../modules/task-cycle';
import { withLogForwarding } from '../utils/log-forwarding';
import { SessionManager } from '../utils/session-manager';
import { createLogger } from '../../utils/logger';

export function registerTaskHandlers(context: { taskSessions: SessionManager<void> }): void {
  ipcMain.handle('taskConfig:get', (_, accountId: string): TaskConfig => {
    return getTaskConfig(accountId);
  });

  ipcMain.handle('taskConfig:set', (_, accountId: string, config: TaskConfig): void => {
    setTaskConfig(accountId, config);
  });

  ipcMain.handle('task:run', async (event: IpcMainInvokeEvent, accountId: string, taskConfig: TaskConfig): Promise<TaskCycleResult> => {
    const logger = createLogger('TaskRun', accountId);
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);

    if (taskConfig.listUnreviewed) {
      try {
        const api = getClient(accountId);
        const quota = await api.getAuditQuota();
        logger.info(`配额检查: 剩余 ${quota.quota} / 总共 ${quota.total}`);
        scopedAddLog({ runId, productId: '', productTitle: `今日提审配额: 剩余${quota.quota}/${quota.total}`, action: 'check', status: quota.quota > 0 ? 'success' : 'failed' });
      } catch (error: any) {
        scopedAddLog({ runId, productId: '', productTitle: '', action: 'check', status: 'failed', errorMsg: `配额检查失败: ${error.message}` });
        logger.error(`配额检查失败:`, error);
        return { scanned: 0, deleted: 0, listed: 0, errors: 0, skipped: 0, stopped: true, reason: `配额检查失败: ${error.message}` };
      }
    }

    return withLogForwarding(event, accountId, `log:added:${accountId}`, async () => {
      const signal = context.taskSessions.start(accountId, undefined);
      try {
        const api = getClient(accountId);
        const blacklistRules = getBlacklistRules();
        const skipKeywords = getSkipKeywords();
        const statusRules = getStatusRules();
        return await runTaskCycle(api, scopedAddLog, taskConfig, runId, signal, accountId, blacklistRules, skipKeywords, statusRules);
      } finally {
        context.taskSessions.complete(accountId);
      }
    });
  });

  ipcMain.handle('task:stop', (_, accountId: string): void => {
    const logger = createLogger('TaskStop', accountId);
    context.taskSessions.stop(accountId);
    logger.info(`已发送停止信号: ${accountId}`);
  });
}
