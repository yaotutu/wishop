import { listProduct, getProductDetail, DraftProduct } from '../ipc/wechat-api';
import { addLog } from '../store';

export type ListOneResult = 'success' | 'failed' | 'skipped' | 'stopped';

const SUBMIT_INTERVAL_MS = 3000;

let lastSubmitTime = 0;

// 遇到这些错误码应停止（全局性限制）
const STOP_CODES = new Set([
  1002002,   // 近1天提审次数超限
  10020066,  // 近1小时提审次数超限
  10020111,  // 近1天提审次数超限
  10020208,  // 上架功能被封禁
  10020246,  // 0元保证金商品数超限
  10020247,  // 店铺被限制新增能力
]);

// 遇到这些错误码跳过（单商品状态问题）
const SKIP_CODES = new Set([
  10020067,  // 上传中
  10020049,  // 审核中
  10020052,  // 商品不存在
  10020053,  // 违规封禁
  10020008,  // 不允许编辑
]);

async function waitInterval(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastSubmitTime;
  if (elapsed < SUBMIT_INTERVAL_MS) {
    console.log(`[ListUnreviewed] 等待间隔 ${SUBMIT_INTERVAL_MS - elapsed}ms...`);
    await new Promise(resolve => setTimeout(resolve, SUBMIT_INTERVAL_MS - elapsed));
  }
}

export async function listOne(product: DraftProduct, runId: string): Promise<ListOneResult> {
  try {
    const latest = await getProductDetail(product.productId);
    if (latest.editStatus !== 72) {
      console.log(`[ListUnreviewed] 跳过 (状态已变为 ${latest.editStatus}): ${product.title}`);
      return 'skipped';
    }

    await waitInterval();
    const res = await listProduct(product.productId);
    lastSubmitTime = Date.now();

    if (res.errcode === 0) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'success' });
      console.log(`[ListUnreviewed] 提交成功: ${product.title}`);
      return 'success';
    }

    // 完整报文输出，方便排查
    console.warn(`[ListUnreviewed] errcode=${res.errcode}, 完整报文:`, JSON.stringify(res));

    if (STOP_CODES.has(res.errcode)) {
      addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      console.warn(`[ListUnreviewed] 全局限制(${res.errcode})，停止`);
      return 'stopped';
    }

    // 10020110 需要判断 errmsg
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

    // 其他错误：商品信息问题，记录后继续
    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
    return 'failed';
  } catch (error: any) {
    addLog({ runId, productId: product.productId, productTitle: product.title, action: 'list', status: 'failed', errorMsg: error.message });
    console.error(`[ListUnreviewed] 异常: ${product.title}`, error.message);
    return 'failed';
  }
}
