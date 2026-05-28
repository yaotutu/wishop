import { createWxShopClient, WxShopClient } from './client';

const clients = new Map<string, WxShopClient>();

export function getClient(accountId: string): WxShopClient {
  let client = clients.get(accountId);
  if (!client) {
    client = createWxShopClient(accountId);
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
