import { useState, useEffect, useCallback } from 'react';

export interface Config {
  appId: string;
  appSecret: string;
}

export interface SchedulerConfig {
  enabled: boolean;
  cronExpression: string;
  dailyLimit: number;
  lastRunDate: string;
  todayListedCount: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  productId: string;
  productTitle: string;
  status: 'success' | 'failed';
  errorCode?: number;
  errorMsg?: string;
}

export interface DraftProduct {
  productId: string;
  title: string;
  headImgs: string[];
  status: number;
  editStatus: number;
}

export interface QuotaResult {
  quota: number;
  total: number;
}

export function useConfig() {
  const [config, setConfig] = useState<Config>({ appId: '', appSecret: '' });
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.config.get();
      setConfig(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = useCallback(async (newConfig: Config): Promise<{ success: boolean; error?: string }> => {
    const result = await window.electronAPI.config.set(newConfig);
    if (result.success) {
      setConfig(newConfig);
    }
    return result;
  }, []);

  return { config, loading, fetchConfig, saveConfig };
}

export function useScheduler() {
  const [scheduler, setScheduler] = useState<SchedulerConfig>({
    enabled: false,
    cronExpression: '0 9 * * *',
    dailyLimit: 100,
    lastRunDate: '',
    todayListedCount: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchScheduler = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.scheduler.get();
      setScheduler(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveScheduler = useCallback(async (newScheduler: SchedulerConfig) => {
    await window.electronAPI.scheduler.set(newScheduler);
    setScheduler(newScheduler);
  }, []);

  return { scheduler, loading, fetchScheduler, saveScheduler };
}

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.logs.get();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLogs = useCallback(async () => {
    await window.electronAPI.logs.clear();
    setLogs([]);
  }, []);

  return { logs, loading, fetchLogs, clearLogs };
}

export function useQuota() {
  const [quota, setQuota] = useState<QuotaResult>({ quota: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchQuota = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.quota.get();
      setQuota(data);
    } catch {
      setQuota({ quota: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  return { quota, loading, fetchQuota };
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = useCallback(async (editStatus: number | null = null) => {
    setLoading(true);
    try {
      const data = await window.electronAPI.drafts.fetch(editStatus);
      setDrafts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const listProduct = useCallback(async (productId: string) => {
    return window.electronAPI.drafts.list(productId);
  }, []);

  return { drafts, loading, fetchDrafts, listProduct };
}
