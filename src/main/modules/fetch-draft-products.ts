import { WeChatClient, DraftProduct } from '../wechat/client';

export async function* streamDraftProducts(api: WeChatClient): AsyncGenerator<DraftProduct> {
  let nextKey = '';
  let hasMore = true;

  while (hasMore) {
    const listResult = await api.getDraftProducts(30, nextKey);

    for (const productId of listResult.productIds) {
      try {
        const detail = await api.getProductDetail(productId);
        yield detail;
      } catch (error) {
        console.error(`[StreamDrafts] 获取商品 ${productId} 详情失败:`, error);
      }
    }

    nextKey = listResult.nextKey;
    hasMore = listResult.hasMore && !!nextKey;
  }
}
