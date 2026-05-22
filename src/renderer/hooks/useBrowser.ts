import { useCallback } from 'react';
import type { ShippingAssistantSession } from '../../shared/types';

export function useBrowser() {
  const openBrowser = useCallback(async (profileId: string = 'default', url?: string) => {
    await window.electronAPI.browser.openClean(profileId, url);
  }, []);

  const openCleanBrowser = useCallback(async (profileId: string = 'default', url?: string) => {
    await window.electronAPI.browser.openClean(profileId, url);
  }, []);

  const openShippingAssistant = useCallback(async (profileId: string = 'default', url: string, session: ShippingAssistantSession) => {
    await window.electronAPI.browser.openShippingAssistant(profileId, url, session);
  }, []);

  const closeBrowser = useCallback(async () => {
    await window.electronAPI.browser.close();
  }, []);

  return { openBrowser, openCleanBrowser, openShippingAssistant, closeBrowser };
}
