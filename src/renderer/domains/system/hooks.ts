import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GlobalLogEntry } from '../../../shared/global-log';
import { systemClient } from './client';

const globalLogsKey = ['system', 'globalLogs'];

export function useGlobalLogs() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: globalLogsKey,
    queryFn: () => systemClient.globalLogs.list(),
    initialData: [],
    initialDataUpdatedAt: 0,
    staleTime: 0,
  });
  const clearMutation = useMutation({
    mutationFn: () => systemClient.globalLogs.clear(),
    onSuccess: () => queryClient.setQueryData<GlobalLogEntry[]>(globalLogsKey, []),
  });

  const fetchLogs = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const clearLogs = useCallback(async () => {
    await clearMutation.mutateAsync();
  }, [clearMutation]);

  return {
    logs: query.data || [],
    loading: query.isFetching,
    fetchLogs,
    clearLogs,
  };
}
