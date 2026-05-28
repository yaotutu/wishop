import axios from 'axios';
import type { Config } from '../../shared/types';
import { normalizeExternalRequestError } from '../errors/external-error';
import { getConfig, readStore, writeStore, type StoredWxAccessToken } from '../store';

const BASE_URL = 'https://api.weixin.qq.com';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60_000;

const memoryCache = new Map<string, StoredWxAccessToken>();
const refreshPromises = new Map<string, Promise<string>>();
let cacheGeneration = 0;

function assertValidConfig(config: Config): void {
  if (!config.appId || !config.appSecret) {
    throw new Error('[CREDENTIAL] 请先配置 AppID 和 AppSecret');
  }
}

function isTokenFresh(token: StoredWxAccessToken | undefined, appId: string): token is StoredWxAccessToken {
  return !!token && token.appId === appId && token.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

function toCredentialError(errcode: number, errmsg?: string): Error {
  if (errcode === 40001) {
    return new Error('[CREDENTIAL] AppSecret 不正确或已失效，请前往店铺管理更新配置');
  }
  if (errcode === 42001) {
    return new Error('[CREDENTIAL] access_token 已过期，请前往店铺管理更新配置');
  }
  return new Error(errmsg || `获取 token 失败: ${errcode}`);
}

function readStoredToken(accountId: string, appId: string): StoredWxAccessToken | undefined {
  const stored = readStore().wxAccessTokens?.[accountId];
  if (!isTokenFresh(stored, appId)) return undefined;
  memoryCache.set(accountId, stored);
  return stored;
}

function persistToken(token: StoredWxAccessToken, generation: number): void {
  if (generation !== cacheGeneration) return;
  const current = readStore().wxAccessTokens || {};
  if (generation !== cacheGeneration) return;
  writeStore({
    wxAccessTokens: {
      ...current,
      [token.accountId]: token,
    },
  });
}

async function requestNewToken(accountId: string, config: Config, generation: number): Promise<string> {
  assertValidConfig(config);
  const now = Date.now();
  let response;
  try {
    response = await axios.get(`${BASE_URL}/cgi-bin/token`, {
      params: {
        grant_type: 'client_credential',
        appid: config.appId,
        secret: config.appSecret,
      },
    });
  } catch (error) {
    throw normalizeExternalRequestError(error, {
      service: '微信小店',
      method: 'GET',
      path: '/cgi-bin/token',
      stage: '获取微信接口 access_token',
    });
  }
  const data = response.data;

  if (data.errcode) {
    memoryCache.delete(accountId);
    throw toCredentialError(data.errcode, data.errmsg);
  }

  const expiresInSeconds = typeof data.expires_in === 'number' ? data.expires_in : 7200;
  const token: StoredWxAccessToken = {
    accountId,
    appId: config.appId,
    accessToken: data.access_token,
    expiresAt: now + expiresInSeconds * 1000,
    updatedAt: now,
  };
  if (generation === cacheGeneration) {
    memoryCache.set(accountId, token);
    persistToken(token, generation);
  }
  return token.accessToken;
}

export async function getAccessToken(accountId: string, forceRefresh = false): Promise<string> {
  const config = getConfig(accountId);
  assertValidConfig(config);

  if (!forceRefresh) {
    const memoryToken = memoryCache.get(accountId);
    if (isTokenFresh(memoryToken, config.appId)) return memoryToken.accessToken;

    const storedToken = readStoredToken(accountId, config.appId);
    if (storedToken) return storedToken.accessToken;
  }

  const existingRefresh = refreshPromises.get(accountId);
  if (existingRefresh) return existingRefresh;

  const generation = cacheGeneration;
  const refresh = requestNewToken(accountId, config, generation).finally(() => {
    refreshPromises.delete(accountId);
  });
  refreshPromises.set(accountId, refresh);
  return refresh;
}

export function removeAccessToken(accountId: string): void {
  cacheGeneration++;
  memoryCache.delete(accountId);
  refreshPromises.delete(accountId);
  const current = readStore().wxAccessTokens;
  if (!current?.[accountId]) return;
  const next = { ...current };
  delete next[accountId];
  writeStore({ wxAccessTokens: next });
}

export function clearAccessTokens(): void {
  cacheGeneration++;
  memoryCache.clear();
  refreshPromises.clear();
  writeStore({ wxAccessTokens: {} });
}

export function isAccessTokenInvalidError(errcode: unknown): boolean {
  return errcode === 40001 || errcode === 40014 || errcode === 41001 || errcode === 42001;
}
