import { BrowserWindow, ipcMain } from 'electron';
import type { NotificationPreference } from '../../../shared/notification';
import {
  activityLogEmitter,
  clearNotifications,
  getNotificationPreference,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreference,
} from '../../activity-logs/activity-log-service';

export function registerNotificationHandlers(): void {
  ipcMain.handle('notifications:list', async () => listNotifications());
  ipcMain.handle('notifications:markRead', async (_, notificationId: string) => markNotificationRead(notificationId));
  ipcMain.handle('notifications:markAllRead', async () => markAllNotificationsRead());
  ipcMain.handle('notifications:clear', async () => clearNotifications());
  ipcMain.handle('notifications:getPreference', async () => getNotificationPreference());
  ipcMain.handle('notifications:updatePreference', async (_, patch: Partial<NotificationPreference>) => updateNotificationPreference(patch));

  for (const event of ['notification:added', 'notification:changed', 'notification:preferenceChanged']) {
    activityLogEmitter.on(event, (payload) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(event, payload);
      }
    });
  }
}
