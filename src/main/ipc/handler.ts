import { ipcMain } from 'electron';
import {
  getConfig,
  setConfig,
  getScheduler,
  setScheduler,
  getTaskConfig,
  setTaskConfig,
  getLogs,
  clearLogs,
  addLog,
  Config,
  SchedulerConfig,
  TaskConfig,
  LogEntry,
} from '../store';
import {
  getDraftProducts,
  getProductDetail,
  listProduct,
  getAuditQuota,
  getAccessToken,
  DraftProduct,
} from './wechat-api';
import { startScheduler, stopScheduler } from '../scheduler/listing-scheduler';
import { runTaskCycle, TaskCycleResult } from '../modules/task-cycle';

let draftsNextKey = '';
let draftsHasMore = true;

export function registerHandlers(): void {
  ipcMain.handle('config:get', (): Config => {
    return getConfig();
  });

  ipcMain.handle('config:set', async (_, config: Config): Promise<{ success: boolean; error?: string }> => {
    try {
      await getAccessToken();
      setConfig(config);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('drafts:fetch', async (_, reset?: boolean): Promise<{ products: DraftProduct[]; hasMore: boolean }> => {
    if (reset) {
      draftsNextKey = '';
      draftsHasMore = true;
    }

    if (!draftsHasMore) {
      return { products: [], hasMore: false };
    }

    const need = 10;
    const products: DraftProduct[] = [];
    let nextKey = draftsNextKey;

    while (products.length < need) {
      const result = await getDraftProducts(30, nextKey);

      for (const productId of result.productIds) {
        if (products.length >= need) break;
        try {
          const detail = await getProductDetail(productId);
          if (detail.editStatus === 72) {
            products.push(detail);
          }
        } catch (error) {
          console.error(`[Drafts] 获取商品 ${productId} 详情失败:`, error);
        }
      }

      nextKey = result.nextKey;
      if (!result.hasMore || !nextKey) {
        draftsHasMore = false;
        break;
      }
    }

    draftsNextKey = nextKey;
    return { products, hasMore: draftsHasMore };
  });

  ipcMain.handle('drafts:list', async (_, productId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await listProduct(productId);
      if (result.errcode === 0) {
        addLog({ productId, productTitle: '', status: 'success' });
        return { success: true };
      } else {
        addLog({ productId, productTitle: '', status: 'failed', errorCode: result.errcode, errorMsg: result.errmsg });
        return { success: false, error: result.errmsg };
      }
    } catch (error: any) {
      addLog({ productId, productTitle: '', status: 'failed', errorMsg: error.message });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('quota:get', async (): Promise<{ quota: number; total: number }> => {
    return getAuditQuota();
  });

  ipcMain.handle('logs:get', (): LogEntry[] => {
    return getLogs();
  });

  ipcMain.handle('logs:clear', (): void => {
    clearLogs();
  });

  ipcMain.handle('scheduler:get', (): SchedulerConfig => {
    return getScheduler();
  });

  ipcMain.handle('scheduler:set', (_, scheduler: SchedulerConfig): void => {
    setScheduler(scheduler);
    if (scheduler.enabled) {
      startScheduler();
    } else {
      stopScheduler();
    }
  });

  ipcMain.handle('scheduler:start', (): void => {
    startScheduler();
  });

  ipcMain.handle('scheduler:stop', (): void => {
    stopScheduler();
  });

  ipcMain.handle('taskConfig:get', (): TaskConfig => {
    return getTaskConfig();
  });

  ipcMain.handle('taskConfig:set', (_, config: TaskConfig): void => {
    setTaskConfig(config);
  });

  ipcMain.handle('task:run', async (_, config: TaskConfig): Promise<TaskCycleResult> => {
    return runTaskCycle(config);
  });
}
