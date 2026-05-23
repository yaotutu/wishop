import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationEntry, NotificationPreference } from '../../../shared/notification';
import { DEFAULT_NOTIFICATION_PREFERENCE } from '../../../shared/notification';
import { notificationsClient } from './client';

const notificationsKey = ['notifications', 'list'];
const notificationPreferenceKey = ['notifications', 'preference'];

export function useNotifications() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: notificationsKey,
    queryFn: () => notificationsClient.list(),
    initialData: [],
    initialDataUpdatedAt: 0,
    staleTime: 0,
  });
  const preferenceQuery = useQuery({
    queryKey: notificationPreferenceKey,
    queryFn: () => notificationsClient.getPreference(),
    initialData: DEFAULT_NOTIFICATION_PREFERENCE,
    initialDataUpdatedAt: 0,
    staleTime: 0,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsClient.markRead(notificationId),
    onSuccess: notifications => queryClient.setQueryData<NotificationEntry[]>(notificationsKey, notifications),
  });
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsClient.markAllRead(),
    onSuccess: notifications => queryClient.setQueryData<NotificationEntry[]>(notificationsKey, notifications),
  });
  const clearMutation = useMutation({
    mutationFn: () => notificationsClient.clear(),
    onSuccess: () => queryClient.setQueryData<NotificationEntry[]>(notificationsKey, []),
  });
  const updatePreferenceMutation = useMutation({
    mutationFn: (patch: Partial<NotificationPreference>) => notificationsClient.updatePreference(patch),
    onSuccess: preference => queryClient.setQueryData<NotificationPreference>(notificationPreferenceKey, preference),
  });

  const fetchNotifications = useCallback(async () => {
    await Promise.all([
      notificationsQuery.refetch(),
      preferenceQuery.refetch(),
    ]);
  }, [notificationsQuery, preferenceQuery]);

  const markRead = useCallback(async (notificationId: string) => {
    await markReadMutation.mutateAsync(notificationId);
  }, [markReadMutation]);

  const markAllRead = useCallback(async () => {
    await markAllReadMutation.mutateAsync();
  }, [markAllReadMutation]);

  const clearNotifications = useCallback(async () => {
    await clearMutation.mutateAsync();
  }, [clearMutation]);

  const updatePreference = useCallback(async (patch: Partial<NotificationPreference>) => {
    await updatePreferenceMutation.mutateAsync(patch);
  }, [updatePreferenceMutation]);

  return {
    notifications: notificationsQuery.data || [],
    preference: preferenceQuery.data || DEFAULT_NOTIFICATION_PREFERENCE,
    loading: notificationsQuery.isFetching || preferenceQuery.isFetching,
    fetchNotifications,
    markRead,
    markAllRead,
    clearNotifications,
    updatePreference,
  };
}
