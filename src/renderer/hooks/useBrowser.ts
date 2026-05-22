import { useCallback } from 'react';

export function useBrowser() {
  const openBrowser = useCallback(async (profileId: string = 'default', url?: string) => {
    await window.electronAPI.browser.openClean(profileId, url);
  }, []);

  const openCleanBrowser = useCallback(async (profileId: string = 'default', url?: string) => {
    await window.electronAPI.browser.openClean(profileId, url);
  }, []);

  const closeBrowser = useCallback(async () => {
    await window.electronAPI.browser.close();
  }, []);

  return { openBrowser, openCleanBrowser, closeBrowser };
}
