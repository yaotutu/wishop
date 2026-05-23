import type { NotificationEntry, NotificationPreference } from '../../../shared/notification';

export const notificationsClient = {
  list(): Promise<NotificationEntry[]> {
    return window.wishop.notifications.list();
  },
  getPreference(): Promise<NotificationPreference> {
    return window.wishop.notifications.getPreference();
  },
  markRead(notificationId: string): Promise<NotificationEntry[]> {
    return window.wishop.notifications.markRead(notificationId);
  },
  markAllRead(): Promise<NotificationEntry[]> {
    return window.wishop.notifications.markAllRead();
  },
  clear(): Promise<void> {
    return window.wishop.notifications.clear();
  },
  updatePreference(patch: Partial<NotificationPreference>): Promise<NotificationPreference> {
    return window.wishop.notifications.updatePreference(patch);
  },
};
