import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ScheduledJob } from '../../../shared/types';
import { scheduledJobsClient, type ScheduledJobInput } from './client';

const scheduledJobsQueryKey = ['scheduledJobs'] as const;

export function useScheduledJobs() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: scheduledJobsQueryKey,
    queryFn: () => scheduledJobsClient.list(),
    initialData: [] as ScheduledJob[],
  });

  const addMutation = useMutation({
    mutationFn: (job: ScheduledJobInput) => scheduledJobsClient.add(job),
    onSuccess: job => {
      queryClient.setQueryData<ScheduledJob[]>(scheduledJobsQueryKey, previous => [job, ...(previous || [])]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ jobId, patch }: { jobId: string; patch: Partial<ScheduledJob> }) =>
      scheduledJobsClient.update(jobId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scheduledJobsQueryKey }),
  });

  const removeMutation = useMutation({
    mutationFn: (jobId: string) => scheduledJobsClient.remove(jobId),
    onSuccess: (_result, jobId) => {
      queryClient.setQueryData<ScheduledJob[]>(
        scheduledJobsQueryKey,
        previous => (previous || []).filter(job => job.id !== jobId),
      );
    },
  });

  return {
    jobs: query.data || [],
    loading: query.isFetching,
    fetchJobs: () => query.refetch(),
    addJob: (job: ScheduledJobInput) => addMutation.mutateAsync(job),
    updateJob: (jobId: string, patch: Partial<ScheduledJob>) => updateMutation.mutateAsync({ jobId, patch }),
    removeJob: (jobId: string) => removeMutation.mutateAsync(jobId),
  };
}
