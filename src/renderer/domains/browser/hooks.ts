import { useCallback } from 'react';
import type { ShippingAssistantSession } from '../../../shared/types';
import { browserClient } from './client';

export function useBrowser() {
  const openTaobaoBrowser = useCallback(async () => {
    await browserClient.openTaobaoBrowser();
  }, []);

  const openBrowser = useCallback(async (profileId: string = 'default', url?: string) => {
    await browserClient.openClean(profileId, url);
  }, []);

  const openCleanBrowser = useCallback(async (profileId: string = 'default', url?: string) => {
    await browserClient.openClean(profileId, url);
  }, []);

  const openShippingAssistant = useCallback(async (profileId: string = 'default', url: string, session: ShippingAssistantSession) => {
    await browserClient.openShippingAssistant(profileId, url, session);
  }, []);

  const closeBrowser = useCallback(async () => {
    await browserClient.close();
  }, []);

  return { openTaobaoBrowser, openBrowser, openCleanBrowser, openShippingAssistant, closeBrowser };
}
