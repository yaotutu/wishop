import { WeChatClient, DraftProduct } from '../wechat/client';
import { AddLogFn } from '../store';

export type ListOneResult = 'success' | 'failed' | 'skipped' | 'stopped';

const SUBMIT_INTERVAL_MS = 3000;
const lastSubmitTimeMap = new Map<string, number>();

// 账号级错误 — 影响所有商品，立即停止任务
const STOP_CODES = new Set([
  1002002,
  10020066,
  10020111,
  10020208,
  10020246,
  10020247,
]);

// 商品级错误 — 该商品本身有问题，跳过继续下一个
const SKIP_CODES = new Set([
  10020110,  // 商品信息检查不通过
  10020067,
  10020049,
  10020052,
  10020053,
  10020008,
]);

async function waitInterval(cacheKey: string, signal?: AbortSignal): Promise<void> {
  const lastSubmitTime = lastSubmitTimeMap.get(cacheKey) || 0;
  const now = Date.now();
  const elapsed = now - lastSubmitTime;
  if (elapsed < SUBMIT_INTERVAL_MS) {
    const waitMs = SUBMIT_INTERVAL_MS - elapsed;
    console.log(`[ListUnreviewed] 等待间隔 ${waitMs}ms...`);
    if (signal) {
      await Promise.race([
        new Promise(resolve => setTimeout(resolve, waitMs)),
        new Promise(resolve => { signal.addEventListener('abort', resolve, { once: true }); }),
      ]);
    } else {
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}

export async function listOne(
  api: WeChatClient,
  addLog: AddLogFn,
  product: DraftProduct,
  runId: string,
  signal?: AbortSignal,
): Promise<ListOneResult> {
  try {
    const latest = await api.getProductDetail(product.productId);
    if (latest.editStatus !== 72) {
      console.log(`[ListUnreviewed] 跳过 (状态已变为 ${latest.editStatus}): ${product.title}`);
      return 'skipped';
    }

    await waitInterval(api.config.appId, signal);
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
      console.warn(`[ListUnreviewed] 账号级错误(${res.errcode})，停止任务`);
      return 'stopped';
    }

    if (SKIP_CODES.has(res.errcode)) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      console.log(`[ListUnreviewed] 商品级错误(${res.errcode})，跳过: ${product.title}`);
      return 'skipped';
    }

    // 未知错误 — 可能是网络/系统问题，计入连续失败
    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
    return 'failed';
  } catch (error: any) {
    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorMsg: error.message });
    console.error(`[ListUnreviewed] 异常: ${product.title}`, error.message);
    return 'failed';
  }
}
