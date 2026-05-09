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
  runId: string;
  productId: string;
  productTitle: string;
  action: 'list' | 'delete' | 'check';
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

export interface TaskConfig {
  deleteFailed: boolean;
  listUnreviewed: boolean;
  listUnreviewedQuantity: number;
}

export interface TaskCycleResult {
  scanned: number;
  deleted: number;
  listed: number;
  errors: number;
  skipped: number;
  stopped: boolean;
  reason?: string;
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
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const { products, hasMore: more } = await window.electronAPI.drafts.fetch(reset);
      if (reset) {
        setDrafts(products);
      } else {
        setDrafts(prev => [...prev, ...products]);
      }
      setHasMore(more);
    } finally {
      setLoading(false);
    }
  }, []);

  const listProduct = useCallback(async (productId: string) => {
    return window.electronAPI.drafts.list(productId);
  }, []);

  return { drafts, hasMore, loading, fetchDrafts, listProduct };
}

export function useTaskConfig() {
  const [taskConfig, setTaskConfigState] = useState<TaskConfig>({
    deleteFailed: false,
    listUnreviewed: true,
    listUnreviewedQuantity: 2,
  });
  const [loading, setLoading] = useState(false);

  const fetchTaskConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.taskConfig.get();
      setTaskConfigState(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTaskConfig = useCallback(async (config: TaskConfig) => {
    await window.electronAPI.taskConfig.set(config);
    setTaskConfigState(config);
  }, []);

  const runTask = useCallback(async (config: TaskConfig): Promise<TaskCycleResult> => {
    return window.electronAPI.task.run(config);
  }, []);

  return { taskConfig, loading, fetchTaskConfig, saveTaskConfig, runTask };
}
