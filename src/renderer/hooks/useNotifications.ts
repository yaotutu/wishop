import { useCallback, useEffect, useState } from 'react';
import type { NotificationEntry, NotificationPreference } from '../../shared/notification';
import { DEFAULT_NOTIFICATION_PREFERENCE } from '../../shared/notification';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [preference, setPreference] = useState<NotificationPreference>(DEFAULT_NOTIFICATION_PREFERENCE);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [nextNotifications, nextPreference] = await Promise.all([
        window.electronAPI.notifications.list(),
        window.electronAPI.notifications.getPreference(),
      ]);
      setNotifications(nextNotifications);
      setPreference(nextPreference);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (notificationId: string) => {
    setNotifications(await window.electronAPI.notifications.markRead(notificationId));
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(await window.electronAPI.notifications.markAllRead());
  }, []);

  const clearNotifications = useCallback(async () => {
    await window.electronAPI.notifications.clear();
    setNotifications([]);
  }, []);

  const updatePreference = useCallback(async (patch: Partial<NotificationPreference>) => {
    setPreference(await window.electronAPI.notifications.updatePreference(patch));
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, preference, loading, fetchNotifications, markRead, markAllRead, clearNotifications, updatePreference };
}
