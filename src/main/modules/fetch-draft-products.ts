import { getDraftProducts, getProductDetail, DraftProduct } from '../ipc/wechat-api';

export interface CategorizedProducts {
  failed: DraftProduct[];
  unreviewed: DraftProduct[];
  others: DraftProduct[];
}

/**
 * 异步迭代器：逐页获取商品 ID，逐个获取详情后 yield 出来
 */
export async function* streamDraftProducts(): AsyncGenerator<DraftProduct> {
  let nextKey = '';
  let hasMore = true;

  while (hasMore) {
    const listResult = await getDraftProducts(30, nextKey);

    for (const productId of listResult.productIds) {
      try {
        const detail = await getProductDetail(productId);
        yield detail;
      } catch (error) {
        console.error(`[StreamDrafts] 获取商品 ${productId} 详情失败:`, error);
      }
    }

    nextKey = listResult.nextKey;
    hasMore = listResult.hasMore && !!nextKey;
  }
}
