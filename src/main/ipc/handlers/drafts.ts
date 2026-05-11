import { ipcMain } from 'electron';
import { getConfig, createScopedAddLog } from '../../store';
import type { DraftProduct } from '../../../shared/types';
import { createWeChatClient } from '../../wechat/client';

interface PaginationState {
  nextKey: string;
  hasMore: boolean;
}

export function registerDraftHandlers(context: { draftPaginationMap: Map<string, PaginationState> }): void {
  ipcMain.handle('drafts:fetch', async (_, accountId: string, reset?: boolean): Promise<{ products: DraftProduct[]; hasMore: boolean }> => {
    let pagination = context.draftPaginationMap.get(accountId);
    if (!pagination || reset) {
      pagination = { nextKey: '', hasMore: true };
      context.draftPaginationMap.set(accountId, pagination);
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
    const scopedAddLog = createScopedAddLog(accountId);
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
}
