import { ipcMain } from 'electron';
import {
  getConfig,
  setConfig,
} from '../store';
import {
  getScheduler,
  setScheduler,
  getLogs,
  clearLogs,
  addLog,
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
import { Config, SchedulerConfig, LogEntry } from '../store';

export function registerHandlers(): void {
  ipcMain.handle('config:get', (): Config => {
    return getConfig();
  });

  ipcMain.handle('config:set', async (_, config: Config): Promise<{ success: boolean; error?: string }> => {
    try {
      // 先验证 credentials，获取 token
      await getAccessToken();
      setConfig(config);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('drafts:fetch', async (): Promise<DraftProduct[]> => {
    const result = await getDraftProducts(5); // 先只获取5个测试
    const products: DraftProduct[] = [];

    for (const productId of result.productIds) {
      try {
        const detail = await getProductDetail(productId);
        products.push(detail);
      } catch (error) {
        console.error(`获取商品 ${productId} 详情失败:`, error);
      }
    }

    return products;
  });

  ipcMain.handle('drafts:list', async (_, productId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await listProduct(productId);
      if (result.errcode === 0) {
        addLog({
          productId,
          productTitle: '',
          status: 'success',
        });
        return { success: true };
      } else {
        addLog({
          productId,
          productTitle: '',
          status: 'failed',
          errorCode: result.errcode,
          errorMsg: result.errmsg,
        });
        return { success: false, error: result.errmsg };
      }
    } catch (error: any) {
      addLog({
        productId,
        productTitle: '',
        status: 'failed',
        errorMsg: error.message,
      });
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
}
