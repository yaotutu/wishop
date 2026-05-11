import { WeChatClient, DraftProduct } from '../wechat/client';
import { AddLogFn } from '../store';

const DELETE_INTERVAL_MS = 1000;
const lastDeleteTimeMap = new Map<string, number>();

export async function deleteOne(
  api: WeChatClient,
  addLog: AddLogFn,
  product: DraftProduct,
  runId: string,
): Promise<'success' | 'failed' | 'stopped'> {
  try {
    const cacheKey = api.config.appId;
    const lastDeleteTime = lastDeleteTimeMap.get(cacheKey) || 0;
    const now = Date.now();
    const elapsed = now - lastDeleteTime;
    if (elapsed < DELETE_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, DELETE_INTERVAL_MS - elapsed));
    }

    const res = await api.deleteProduct(product.productId);
    lastDeleteTimeMap.set(cacheKey, Date.now());

    if (res.errcode === 0) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'delete', status: 'success' });
      console.log(`[DeleteFailed] 已删除: ${product.title}`);
      return 'success';
    }

    console.warn(`[DeleteFailed] errcode=${res.errcode}, 完整报文:`, JSON.stringify(res));

    if (res.errcode === 10020208 || res.errcode === 10020247) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'delete', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      console.warn(`[DeleteFailed] 全局限制(${res.errcode})，停止`);
      return 'stopped';
    }

    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'delete', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
    return 'failed';
  } catch (error: any) {
    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'delete', status: 'failed', errorMsg: error.message });
    console.error(`[DeleteFailed] 异常: ${product.title}`, error.message);
    return 'failed';
  }
}
