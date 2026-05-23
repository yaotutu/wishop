import type { ShippingAssistantSession } from '../../../shared/types';

export const browserClient = {
  openClean(profileId: string, url?: string): Promise<void> {
    return window.wishop.browser.openClean(profileId, url);
  },
  openShippingAssistant(profileId: string, url: string, session: ShippingAssistantSession): Promise<void> {
    return window.wishop.browser.openShippingAssistant(profileId, url, session);
  },
  close(): Promise<void> {
    return window.wishop.browser.close();
  },
};
