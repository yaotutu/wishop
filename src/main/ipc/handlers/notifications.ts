import { ipcMain } from 'electron';
import {
  clearNotifications,
  getNotificationPreference,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreference,
} from '../../store';
import type { NotificationEntry, NotificationPreference } from '../../../shared/notification';

export function registerNotificationHandlers(): void {
  ipcMain.handle('notifications:list', (): NotificationEntry[] => {
    return getNotifications();
  });

  ipcMain.handle('notifications:markRead', (_, notificationId: string): NotificationEntry[] => {
    return markNotificationRead(notificationId);
  });

  ipcMain.handle('notifications:markAllRead', (): NotificationEntry[] => {
    return markAllNotificationsRead();
  });

  ipcMain.handle('notifications:clear', (): void => {
    clearNotifications();
  });

  ipcMain.handle('notifications:getPreference', (): NotificationPreference => {
    return getNotificationPreference();
  });

  ipcMain.handle('notifications:updatePreference', (_, patch: Partial<NotificationPreference>): NotificationPreference => {
    return updateNotificationPreference(patch);
  });
}
