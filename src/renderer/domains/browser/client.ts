import type { ShippingAssistantSession } from '../../../shared/types';

export const TAOBAO_BROWSER_PROFILE_ID = 'baseline';
export const TAOBAO_HOME_URL = 'https://www.taobao.com';
export const OPEN_TAOBAO_BROWSER_EVENT = 'wishop:open-taobao-browser';
export const OPEN_SHIPPING_ASSISTANT_EVENT = 'wishop:open-shipping-assistant';

export type OpenTaobaoBrowserDetail = {
  profileId: string;
  url: string;
  onReady?: () => void;
  onError?: (error: unknown) => void;
};

export type OpenShippingAssistantDetail = OpenTaobaoBrowserDetail & {
  session: ShippingAssistantSession;
};

function dispatchBrowserEvent<T extends { onReady?: () => void; onError?: (error: unknown) => void }>(type: string, detail: Omit<T, 'onReady' | 'onError'>): Promise<void> {
  return new Promise((resolve, reject) => {
    window.dispatchEvent(new CustomEvent<T>(type, {
      detail: {
        ...detail,
        onReady: resolve,
        onError: reject,
      } as T,
    }));
  });
}

export const browserClient = {
  openTaobaoBrowser(): Promise<void> {
    return dispatchBrowserEvent<OpenTaobaoBrowserDetail>(OPEN_TAOBAO_BROWSER_EVENT, {
      profileId: TAOBAO_BROWSER_PROFILE_ID,
      url: TAOBAO_HOME_URL,
    });
  },
  openClean(profileId: string, url?: string): Promise<void> {
    return dispatchBrowserEvent<OpenTaobaoBrowserDetail>(OPEN_TAOBAO_BROWSER_EVENT, {
      profileId,
      url: url || TAOBAO_HOME_URL,
    });
  },
  openShippingAssistant(profileId: string, url: string, session: ShippingAssistantSession): Promise<void> {
    return dispatchBrowserEvent<OpenShippingAssistantDetail>(OPEN_SHIPPING_ASSISTANT_EVENT, {
      profileId,
      url,
      session,
    });
  },
  close(): Promise<void> {
    window.dispatchEvent(new CustomEvent('wishop:close-taobao-browser'));
    return Promise.resolve();
  },
};
