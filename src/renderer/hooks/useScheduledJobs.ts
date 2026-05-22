import { useCallback, useEffect, useState } from 'react';
import type { ScheduledJob } from '../../shared/types';

export function useScheduledJobs() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await window.electronAPI.scheduledJobs.list());
    } finally {
      setLoading(false);
    }
  }, []);

  const addJob = useCallback(async (job: Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'>) => {
    const next = await window.electronAPI.scheduledJobs.add(job);
    setJobs(prev => [next, ...prev]);
    return next;
  }, []);

  const updateJob = useCallback(async (jobId: string, patch: Partial<ScheduledJob>) => {
    await window.electronAPI.scheduledJobs.update(jobId, patch);
    await fetchJobs();
  }, [fetchJobs]);

  const removeJob = useCallback(async (jobId: string) => {
    await window.electronAPI.scheduledJobs.remove(jobId);
    setJobs(prev => prev.filter(job => job.id !== jobId));
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, fetchJobs, addJob, updateJob, removeJob };
}
