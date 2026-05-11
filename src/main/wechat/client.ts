import axios from 'axios';
import type { Config, DraftProduct, QuotaResult } from '../../shared/types';

export type { Config, DraftProduct, QuotaResult };

const BASE_URL = 'https://api.weixin.qq.com';

interface TokenData {
  accessToken: string;
  expiresAt: number;
}

export interface ProductListResult {
  productIds: string[];
  nextKey: string;
  hasMore: boolean;
}

export interface ListingResult {
  errcode: number;
  errmsg: string;
}

export function createWeChatClient(config: Config) {
  let tokenCache: TokenData | null = null;

  async function getAccessToken(): Promise<string> {
    const now = Date.now();
    if (tokenCache && tokenCache.expiresAt > now + 60000) {
      return tokenCache.accessToken;
    }

    if (!config.appId || !config.appSecret) {
      throw new Error('请先配置 AppID 和 AppSecret');
    }

    const url = `${BASE_URL}/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
    const response = await axios.get(url);
    const data = response.data;

    if (data.errcode) {
      if (data.errcode === 40001 || data.errcode === 42001) {
        tokenCache = null;
      }
      throw new Error(data.errmsg || `获取 token 失败: ${data.errcode}`);
    }

    tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in - 120) * 1000,
    };

    return data.access_token;
  }

  async function getDraftProducts(pageSize = 30, nextKey = ''): Promise<ProductListResult> {
    const token = await getAccessToken();
    const url = `${BASE_URL}/channels/ec/product/list/get?access_token=${token}`;

    const response = await axios.post(url, {
      page_size: Math.min(pageSize, 30),
      next_key: nextKey || undefined,
      status: 0,
    });

    const data = response.data;

    if (data.errcode && data.errcode !== 0) {
      throw new Error(data.errmsg || `获取草稿列表失败: ${data.errcode}`);
    }

    const productIds = data.product_ids || [];

    return {
      productIds,
      nextKey: data.next_key || '',
      hasMore: !!data.next_key,
    };
  }

  async function getProductDetail(productId: string): Promise<DraftProduct> {
    const token = await getAccessToken();
    const url = `${BASE_URL}/channels/ec/product/get?access_token=${token}`;

    const response = await axios.post(url, {
      product_id: productId,
      data_type: 2,
    });

    const data = response.data;

    if (data.errcode && data.errcode !== 0) {
      throw new Error(data.errmsg || `获取商品详情失败: ${data.errcode}`);
    }

    const product = data.edit_product;
    if (!product) {
      throw new Error(`商品 ${productId} 详情为空`);
    }

    return {
      productId: product.product_id,
      title: product.title,
      headImgs: product.head_imgs || [],
      status: product.status,
      editStatus: product.edit_status,
    };
  }

  async function listProduct(productId: string): Promise<ListingResult> {
    const token = await getAccessToken();
    const url = `${BASE_URL}/channels/ec/product/listing?access_token=${token}`;
    const response = await axios.post(url, { product_id: productId });
    return response.data;
  }

  async function getAuditQuota(): Promise<QuotaResult> {
    const token = await getAccessToken();
    const url = `${BASE_URL}/channels/ec/product/getauditquota?access_token=${token}`;
    const response = await axios.post(url, {});
    const data = response.data;

    if (data.errcode && data.errcode !== 0) {
      throw new Error(data.errmsg || `获取配额失败: ${data.errcode}`);
    }

    if (!data.audit_quota) {
      return { quota: 0, total: 0 };
    }

    return {
      quota: data.audit_quota.avail_quota,
      total: data.audit_quota.total_quota,
    };
  }

  async function deleteProduct(productId: string): Promise<ListingResult> {
    const token = await getAccessToken();
    const url = `${BASE_URL}/channels/ec/product/delete?access_token=${token}`;
    const response = await axios.post(url, { product_id: productId });
    return response.data;
  }

  function clearTokenCache(): void {
    tokenCache = null;
  }

  return {
    config,
    getAccessToken,
    getDraftProducts,
    getProductDetail,
    listProduct,
    getAuditQuota,
    deleteProduct,
    clearTokenCache,
  };
}

export type WeChatClient = ReturnType<typeof createWeChatClient>;
