import { listProduct, getProductDetail, DraftProduct } from '../ipc/wechat-api';
import { addLog } from '../store';

export type ListOneResult = 'success' | 'failed' | 'skipped' | 'stopped';

const SUBMIT_INTERVAL_MS = 3000;

let lastSubmitTime = 0;

async function waitInterval(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastSubmitTime;
  if (elapsed < SUBMIT_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, SUBMIT_INTERVAL_MS - elapsed));
  }
}

export async function listOne(product: DraftProduct): Promise<ListOneResult> {
  try {
    // 提交前二次检查 edit_status
    const latest = await getProductDetail(product.productId);
    if (latest.editStatus !== 72) {
      console.log(`[ListUnreviewed] 跳过 (edit_status=${latest.editStatus}): ${product.title}`);
      return 'skipped';
    }

    await waitInterval();
    const res = await listProduct(product.productId);
    lastSubmitTime = Date.now();

    if (res.errcode === 0) {
      addLog({ productId: product.productId, productTitle: product.title, status: 'success' });
      console.log(`[ListUnreviewed] 提交成功: ${product.title}`);
      return 'success';
    } else if (res.errcode === 10020066) {
      addLog({ productId: product.productId, productTitle: product.title, status: 'failed', errorCode: res.errcode, errorMsg: `小时提审次数超限: ${res.errmsg}` });
      return 'stopped';
    } else if (res.errcode === 10020111) {
      addLog({ productId: product.productId, productTitle: product.title, status: 'failed', errorCode: res.errcode, errorMsg: `天提审次数超限: ${res.errmsg}` });
      return 'stopped';
    } else if (res.errcode === 10020067) {
      addLog({ productId: product.productId, productTitle: product.title, status: 'failed', errorCode: res.errcode, errorMsg: `上传中，跳过: ${res.errmsg}` });
      return 'skipped';
    } else {
      addLog({ productId: product.productId, productTitle: product.title, status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      console.error(`[ListUnreviewed] 提交失败: ${product.title}, errcode=${res.errcode}`);
      return 'failed';
    }
  } catch (error: any) {
    addLog({ productId: product.productId, productTitle: product.title, status: 'failed', errorMsg: error.message });
    return 'failed';
  }
}
