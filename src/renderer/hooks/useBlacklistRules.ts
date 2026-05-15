import { useCallback } from 'react';
import type { BlacklistRule } from '../../shared/types';
import { useIpcFetch } from './useIpcFetch';

export function useBlacklistRules() {
  const { data: rules, loading, fetch: fetchRules, setData: setRules } = useIpcFetch<BlacklistRule[]>(
    'global',
    useCallback(() => window.electronAPI.blacklistRules.get(), []),
    [],
  );

  const saveRules = useCallback(async (newRules: BlacklistRule[]): Promise<void> => {
    await window.electronAPI.blacklistRules.set(newRules);
    setRules(newRules);
  }, [setRules]);

  return { rules, loading, fetchRules, saveRules };
}
