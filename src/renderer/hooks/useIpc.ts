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
  deleteFailedConfirm: boolean;
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
  pendingDelete: DraftProduct[];
}

export interface Account {
  id: string;
  name: string;
  config: Config;
  createdAt: number;
}

// --- Account management ---

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState<string>('');

  const fetchAccounts = useCallback(async () => {
    const list = await window.electronAPI.accounts.list();
    setAccounts(list);
    const active = await window.electronAPI.accounts.getActive();
    setActiveAccountIdState(active);
  }, []);

  const addAccount = useCallback(async (name: string, config: Config): Promise<Account> => {
    const account = await window.electronAPI.accounts.add(name, config);
    await fetchAccounts();
    return account;
  }, [fetchAccounts]);

  const removeAccount = useCallback(async (id: string) => {
    await window.electronAPI.accounts.remove(id);
    await fetchAccounts();
  }, [fetchAccounts]);

  const updateAccount = useCallback(async (id: string, patch: Partial<Pick<Account, 'name' | 'config'>>) => {
    await window.electronAPI.accounts.update(id, patch);
    await fetchAccounts();
  }, [fetchAccounts]);

  const switchAccount = useCallback(async (id: string) => {
    await window.electronAPI.accounts.setActive(id);
    setActiveAccountIdState(id);
  }, []);

  return { accounts, activeAccountId, fetchAccounts, addAccount, removeAccount, updateAccount, switchAccount };
}

// --- Per-account hooks ---

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

export function useScheduler(accountId: string) {
  const [scheduler, setScheduler] = useState<SchedulerConfig>({
    enabled: false,
    cronExpression: '0 9 * * *',
    dailyLimit: 100,
    lastRunDate: '',
    todayListedCount: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchScheduler = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.scheduler.get(accountId);
      setScheduler(data);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const saveScheduler = useCallback(async (newScheduler: SchedulerConfig) => {
    await window.electronAPI.scheduler.set(accountId, newScheduler);
    setScheduler(newScheduler);
  }, [accountId]);

  useEffect(() => { fetchScheduler(); }, [accountId]);

  return { scheduler, loading, fetchScheduler, saveScheduler };
}

export function useLogs(accountId: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.logs.get(accountId);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const clearLogs = useCallback(async () => {
    if (!accountId) return;
    await window.electronAPI.logs.clear(accountId);
    setLogs([]);
  }, [accountId]);

  return { logs, loading, fetchLogs, clearLogs };
}

export function useQuota(accountId: string) {
  const [quota, setQuota] = useState<QuotaResult>({ quota: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchQuota = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.quota.get(accountId);
      setQuota(data);
    } catch {
      setQuota({ quota: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  return { quota, loading, fetchQuota };
}

export function useDrafts(accountId: string) {
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = useCallback(async (reset = true) => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { products, hasMore: more } = await window.electronAPI.drafts.fetch(accountId, reset);
      if (reset) {
        setDrafts(products);
      } else {
        setDrafts(prev => [...prev, ...products]);
      }
      setHasMore(more);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const listProduct = useCallback(async (productId: string) => {
    return window.electronAPI.drafts.list(accountId, productId);
  }, [accountId]);

  return { drafts, hasMore, loading, fetchDrafts, listProduct };
}

export function useTaskConfig(accountId: string) {
  const [taskConfig, setTaskConfigState] = useState<TaskConfig>({
    deleteFailed: false,
    deleteFailedConfirm: false,
    listUnreviewed: true,
    listUnreviewedQuantity: 2,
  });
  const [loading, setLoading] = useState(false);

  const fetchTaskConfig = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.taskConfig.get(accountId);
      setTaskConfigState(data);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const saveTaskConfig = useCallback(async (config: TaskConfig) => {
    if (!accountId) return;
    await window.electronAPI.taskConfig.set(accountId, config);
    setTaskConfigState(config);
  }, [accountId]);

  const runTask = useCallback(async (config: TaskConfig): Promise<TaskCycleResult> => {
    return window.electronAPI.task.run(accountId, config);
  }, [accountId]);

  useEffect(() => { fetchTaskConfig(); }, [accountId]);

  return { taskConfig, loading, fetchTaskConfig, saveTaskConfig, runTask };
}
