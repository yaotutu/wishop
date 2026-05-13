import { createWxShopClient, WxShopClient } from './client';
import { getConfig } from '../store';

const clients = new Map<string, WxShopClient>();

export function getClient(accountId: string): WxShopClient {
  let client = clients.get(accountId);
  if (!client) {
    client = createWxShopClient(getConfig(accountId));
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
