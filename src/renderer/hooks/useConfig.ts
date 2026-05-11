import { useState, useEffect, useCallback } from 'react';
import type { Config } from '../../shared/types';

export function useConfig(accountId: string) {
  const [config, setConfig] = useState<Config>({ appId: '', appSecret: '' });
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.config.get(accountId);
      setConfig(data);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const saveConfig = useCallback(async (newConfig: Config): Promise<{ success: boolean; error?: string }> => {
    const result = await window.electronAPI.config.set(accountId, newConfig);
    if (result.success) {
      setConfig(newConfig);
    }
    return result;
  }, [accountId]);

  useEffect(() => { fetchConfig(); }, [accountId]);

  return { config, loading, fetchConfig, saveConfig };
}
