import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BlacklistRule, LogEntry, QuotaResult, StatusRule, TaskConfig } from '../../../shared/listing';
import { isCredentialError } from '../../../shared/errors';
import { useCredentialError } from '../../contexts/CredentialErrorContext';
import { listingClient } from './client';

const defaultTaskConfig: TaskConfig = {
  listUnreviewed: true,
  listUnreviewedQuantity: 2,
  autoDeleteFailed: true,
};

const emptyQuota: QuotaResult = { quota: 0, total: 0 };

export function useTaskConfig(accountId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['listing', accountId, 'taskConfig'],
    enabled: !!accountId,
    queryFn: () => listingClient.taskConfig.get(accountId),
    initialData: defaultTaskConfig,
  });
  const saveMutation = useMutation({
    mutationFn: (config: TaskConfig) => listingClient.taskConfig.save(accountId, config),
    onSuccess: (_result, config) => {
      queryClient.setQueryData(['listing', accountId, 'taskConfig'], config);
    },
  });

  return {
    taskConfig: query.data || defaultTaskConfig,
    loading: query.isLoading,
    fetchTaskConfig: () => query.refetch(),
    saveTaskConfig: (config: TaskConfig) => saveMutation.mutateAsync(config),
    runTask: (config: TaskConfig) => listingClient.taskConfig.run(accountId, config),
    stopTask: () => listingClient.taskConfig.stop(accountId),
    onTaskLog: (callback: (log: LogEntry) => void) => listingClient.taskConfig.onLog(accountId, callback),
  };
}

export function useLogs(accountId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['listing', accountId, 'logs'],
    enabled: !!accountId,
    queryFn: () => listingClient.logs.list(accountId),
    initialData: [],
  });
  const clearMutation = useMutation({
    mutationFn: () => listingClient.logs.clear(accountId),
    onSuccess: () => queryClient.setQueryData(['listing', accountId, 'logs'], []),
  });

  return {
    logs: query.data || [],
    loading: query.isLoading,
    fetchLogs: () => query.refetch(),
    clearLogs: () => clearMutation.mutateAsync(),
  };
}

export function useQuota(accountId: string) {
  const { reportCredentialError } = useCredentialError();
  const query = useQuery({
    queryKey: ['listing', accountId, 'quota'],
    enabled: false,
    queryFn: async () => {
      try {
        return await listingClient.quota.get(accountId);
      } catch (error: unknown) {
        if (isCredentialError(error)) reportCredentialError(error);
        return emptyQuota;
      }
    },
    initialData: emptyQuota,
  });

  return {
    quota: query.data || emptyQuota,
    loading: query.isLoading,
    fetchQuota: () => query.refetch(),
  };
}

export function useBlacklistRules() {
  const queryClient = useQueryClient();
  const rulesQuery = useQuery({
    queryKey: ['listing', 'blacklistRules'],
    queryFn: () => listingClient.rules.getBlacklist(),
    initialData: [],
  });
  const defaultCodesQuery = useQuery({
    queryKey: ['listing', 'blacklistDefaultCodes'],
    queryFn: () => listingClient.rules.getDefaultBlacklistCodes(),
    initialData: [],
  });
  const saveMutation = useMutation({
    mutationFn: (rules: BlacklistRule[]) => listingClient.rules.saveBlacklist(rules),
    onSuccess: (_result, rules) => queryClient.setQueryData(['listing', 'blacklistRules'], rules),
  });

  return {
    rules: rulesQuery.data || [],
    loading: rulesQuery.isLoading,
    fetchRules: () => rulesQuery.refetch(),
    saveRules: (rules: BlacklistRule[]) => saveMutation.mutateAsync(rules),
    defaultCodes: useMemo(() => new Set(defaultCodesQuery.data || []), [defaultCodesQuery.data]),
  };
}

export function useSkipKeywords() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['listing', 'skipKeywords'],
    queryFn: () => listingClient.rules.getSkipKeywords(),
    initialData: [],
  });
  const saveMutation = useMutation({
    mutationFn: (keywords: string[]) => listingClient.rules.saveSkipKeywords(keywords),
    onSuccess: (_result, keywords) => queryClient.setQueryData(['listing', 'skipKeywords'], keywords),
  });

  return {
    keywords: query.data || [],
    loading: query.isLoading,
    fetchKeywords: () => query.refetch(),
    saveKeywords: (keywords: string[]) => saveMutation.mutateAsync(keywords),
  };
}

export function useStatusRules() {
  const queryClient = useQueryClient();
  const key = ['listing', 'statusRules'];
  const query = useQuery({
    queryKey: key,
    queryFn: () => listingClient.rules.getStatusRules(),
    initialData: [],
  });
  const saveMutation = useMutation({
    mutationFn: (rules: StatusRule[]) => listingClient.rules.saveStatusRules(rules),
    onSuccess: (_result, rules) => queryClient.setQueryData(key, rules),
  });
  const resetMutation = useMutation({
    mutationFn: () => listingClient.rules.resetStatusRules(),
    onSuccess: rules => queryClient.setQueryData(key, rules),
  });

  return {
    rules: query.data || [],
    loading: query.isLoading,
    fetchRules: () => query.refetch(),
    saveRules: (rules: StatusRule[]) => saveMutation.mutateAsync(rules),
    resetRules: () => resetMutation.mutateAsync().then(() => undefined),
  };
}
