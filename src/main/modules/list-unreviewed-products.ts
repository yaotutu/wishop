import { WeChatClient, DraftProduct } from '../wechat/client';
import { AddLogFn } from '../store';

export type ListOneResult = 'success' | 'failed' | 'skipped' | 'stopped';

const SUBMIT_INTERVAL_MS = 3000;
const lastSubmitTimeMap = new Map<string, number>();

const STOP_CODES = new Set([
  1002002,
  10020066,
  10020111,
  10020208,
  10020246,
  10020247,
]);

const SKIP_CODES = new Set([
  10020067,
  10020049,
  10020052,
  10020053,
  10020008,
]);

async function waitInterval(cacheKey: string): Promise<void> {
  const lastSubmitTime = lastSubmitTimeMap.get(cacheKey) || 0;
  const now = Date.now();
  const elapsed = now - lastSubmitTime;
  if (elapsed < SUBMIT_INTERVAL_MS) {
    console.log(`[ListUnreviewed] 等待间隔 ${SUBMIT_INTERVAL_MS - elapsed}ms...`);
    await new Promise(resolve => setTimeout(resolve, SUBMIT_INTERVAL_MS - elapsed));
  }
}

export async function listOne(
  api: WeChatClient,
  addLog: AddLogFn,
  product: DraftProduct,
  runId: string,
): Promise<ListOneResult> {
  try {
    const latest = await api.getProductDetail(product.productId);
    if (latest.editStatus !== 72) {
      console.log(`[ListUnreviewed] 跳过 (状态已变为 ${latest.editStatus}): ${product.title}`);
      return 'skipped';
    }

    await waitInterval(api.config.appId);
    const res = await api.listProduct(product.productId);
    lastSubmitTimeMap.set(api.config.appId, Date.now());

    if (res.errcode === 0) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'success' });
      console.log(`[ListUnreviewed] 提交成功: ${product.title}`);
      return 'success';
    }

    console.warn(`[ListUnreviewed] errcode=${res.errcode}, 完整报文:`, JSON.stringify(res));

    if (STOP_CODES.has(res.errcode)) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      console.warn(`[ListUnreviewed] 全局限制(${res.errcode})，停止`);
      return 'stopped';
    }

    if (res.errcode === 10020110) {
      const isQuotaError = res.errmsg.includes('提审次数');
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      if (isQuotaError) {
        console.warn(`[ListUnreviewed] 提审次数相关，停止`);
        return 'stopped';
      }
      return 'failed';
    }

    if (SKIP_CODES.has(res.errcode)) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      console.log(`[ListUnreviewed] 跳过(${res.errcode}): ${product.title}`);
      return 'skipped';
    }

    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
    return 'failed';
  } catch (error: any) {
    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorMsg: error.message });
    console.error(`[ListUnreviewed] 异常: ${product.title}`, error.message);
    return 'failed';
  }
}
