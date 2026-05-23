import { createWxShopClient, WxShopClient } from './client';
import type { Config } from '../../shared/types';

const clients = new Map<string, WxShopClient>();

export function getClient(accountId: string, config: Config): WxShopClient {
  let client = clients.get(accountId);
  if (!client) {
    client = createWxShopClient(config);
    clients.set(accountId, client);
  }
  return client;
}

export function removeClient(accountId: string): void {
  clients.delete(accountId);
}

export function clearAll(): void {
  clients.clear();
}
