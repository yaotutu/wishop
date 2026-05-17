import { useCallback, useEffect, useState } from 'react';

export function useBrowser() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const openBrowser = useCallback(async (profileId: string = 'default', url?: string) => {
    await window.electronAPI.browser.open(profileId, url);
  }, []);

  const closeBrowser = useCallback(async () => {
    await window.electronAPI.browser.close();
  }, []);

  const goBack = useCallback(async () => {
    await window.electronAPI.browser.back();
  }, []);

  const goForward = useCallback(async () => {
    await window.electronAPI.browser.forward();
  }, []);

  const goRefresh = useCallback(async () => {
    await window.electronAPI.browser.refresh();
  }, []);

  const goStop = useCallback(async () => {
    await window.electronAPI.browser.stop();
  }, []);

  useEffect(() => {
    const unsubUrl = window.electronAPI.browser.onUrlChange?.((u: string) => setUrl(u));
    const unsubLoading = window.electronAPI.browser.onLoadingChange?.((l: boolean) => setLoading(l));
    return () => {
      unsubUrl?.();
      unsubLoading?.();
    };
  }, []);

  return { openBrowser, closeBrowser, goBack, goForward, goRefresh, goStop, url, loading };
}
