import { contextBridge, ipcRenderer } from 'electron';
import type { CheckoutAddressFillResult, OrderRealAddressCache, ShippingAssistantSession } from '../shared/types';

const api = {
  getSession: (): Promise<ShippingAssistantSession> =>
    ipcRenderer.invoke('shippingAssistant:getSession'),
  fetchAddress: (refresh?: boolean): Promise<OrderRealAddressCache> =>
    ipcRenderer.invoke('shippingAssistant:fetchAddress', !!refresh),
  fillCheckoutAddress: (): Promise<CheckoutAddressFillResult> =>
    ipcRenderer.invoke('shippingAssistant:fillCheckoutAddress'),
  close: (): Promise<void> =>
    ipcRenderer.invoke('shippingAssistant:close'),
};

contextBridge.exposeInMainWorld('shippingAssistant', api);

declare global {
  interface Window {
    shippingAssistant: typeof api;
  }
}
