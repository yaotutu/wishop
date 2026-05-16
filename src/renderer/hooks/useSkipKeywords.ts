import { useCallback } from 'react';
import { useIpcFetch } from './useIpcFetch';

export function useSkipKeywords() {
  const { data: keywords, loading, fetch: fetchKeywords, setData: setKeywords } = useIpcFetch<string[]>(
    'global',
    useCallback(() => window.electronAPI.skipKeywords.get(), []),
    [],
  );

  const saveKeywords = useCallback(async (newKeywords: string[]): Promise<void> => {
    await window.electronAPI.skipKeywords.set(newKeywords);
    setKeywords(newKeywords);
  }, [setKeywords]);

  return { keywords, loading, fetchKeywords, saveKeywords };
}
