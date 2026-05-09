import { deleteProduct, DraftProduct } from '../ipc/wechat-api';
import { addLog } from '../store';

export async function deleteOne(product: DraftProduct): Promise<boolean> {
  try {
    const res = await deleteProduct(product.productId);
    if (res.errcode === 0) {
      addLog({ productId: product.productId, productTitle: product.title, status: 'success' });
      console.log(`[DeleteFailed] 已删除: ${product.title}`);
      return true;
    } else {
      addLog({ productId: product.productId, productTitle: product.title, status: 'failed', errorCode: res.errcode, errorMsg: res.errmsg });
      console.error(`[DeleteFailed] 删除失败: ${product.title}, errcode=${res.errcode}`);
      return false;
    }
  } catch (error: any) {
    addLog({ productId: product.productId, productTitle: product.title, status: 'failed', errorMsg: error.message });
    return false;
  }
}
