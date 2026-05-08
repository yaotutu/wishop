import axios from 'axios';
import store, { getConfig } from '../store';

const BASE_URL = 'https://api.weixin.qq.com';

interface TokenData {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenData | null = null;

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  const config = getConfig();
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

export interface DraftProduct {
  productId: string;
  title: string;
  headImgs: string[];
  status: number;
  editStatus: number;
}

export interface ProductListResult {
  productIds: string[];
  nextKey: string;
  hasMore: boolean;
}

export async function getDraftProducts(pageSize = 50, nextKey = ''): Promise<ProductListResult> {
  const token = await getAccessToken();
  const url = `${BASE_URL}/channels/ec/product/list/get?access_token=${token}`;

  const response = await axios.post(url, {
    page_size: pageSize,
    next_key: nextKey || undefined,
    status: 2,
  });

  const data = response.data;

  if (data.errcode && data.errcode !== 0) {
    throw new Error(data.errmsg || `获取草稿列表失败: ${data.errcode}`);
  }

  return {
    productIds: data.product_ids || [],
    nextKey: data.next_key || '',
    hasMore: !!data.next_key,
  };
}

export async function getAllDraftProducts(): Promise<string[]> {
  const allProductIds: string[] = [];
  let nextKey = '';
  let hasMore = true;

  while (hasMore) {
    const result = await getDraftProducts(50, nextKey);
    allProductIds.push(...result.productIds);
    nextKey = result.nextKey;
    hasMore = result.hasMore;
  }

  return allProductIds;
}

export async function getProductDetail(productId: string): Promise<DraftProduct> {
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

  // API 返回的结构是 edit_product
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

export interface ListingResult {
  errcode: number;
  errmsg: string;
}

export async function listProduct(productId: string): Promise<ListingResult> {
  const token = await getAccessToken();
  const url = `${BASE_URL}/channels/ec/product/listing?access_token=${token}`;

  const response = await axios.post(url, {
    product_id: productId,
  });

  return response.data;
}

export interface QuotaResult {
  quota: number;
  total: number;
}

export async function getAuditQuota(): Promise<QuotaResult> {
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

export function clearTokenCache(): void {
  tokenCache = null;
}
