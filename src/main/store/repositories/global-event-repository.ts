import type { GlobalLogEntry, GlobalLogInput } from '../../../shared/global-log';
import type { NotificationEntry, NotificationPreference } from '../../../shared/notification';
import { DEFAULT_NOTIFICATION_PREFERENCE } from '../../../shared/notification';

export interface GlobalEventRepositoryDeps {
  getGlobalLogs: () => GlobalLogEntry[];
  setGlobalLogs: (logs: GlobalLogEntry[]) => void;
  getNotifications: () => NotificationEntry[];
  setNotifications: (notifications: NotificationEntry[]) => void;
  getNotificationPreference: () => NotificationPreference | undefined;
  setNotificationPreference: (preference: NotificationPreference) => void;
  createId: () => string;
  now: () => number;
}

function recentLogCutoff(now: number): number {
  return now - 7 * 24 * 60 * 60 * 1000;
}

export function createGlobalEventRepository(deps: GlobalEventRepositoryDeps) {
  function getPreference(): NotificationPreference {
    const stored = deps.getNotificationPreference();
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCE,
      ...(stored || {}),
      levelEnabled: {
        ...DEFAULT_NOTIFICATION_PREFERENCE.levelEnabled,
        ...(stored?.levelEnabled || {}),
      },
      moduleEnabled: {
        ...DEFAULT_NOTIFICATION_PREFERENCE.moduleEnabled,
        ...(stored?.moduleEnabled || {}),
      },
      eventTypeEnabled: {
        ...DEFAULT_NOTIFICATION_PREFERENCE.eventTypeEnabled,
        ...(stored?.eventTypeEnabled || {}),
      },
    };
  }

  function shouldNotify(log: GlobalLogEntry): boolean {
    const preference = getPreference();
    return preference.inAppEnabled
      && preference.levelEnabled[log.level] !== false
      && preference.moduleEnabled[log.module] !== false
      && preference.eventTypeEnabled[log.eventType] !== false;
  }

  function maybeCreateNotification(log: GlobalLogEntry): void {
    if (!shouldNotify(log)) return;
    const notification: NotificationEntry = {
      id: deps.createId(),
      sourceLogId: log.id,
      timestamp: log.timestamp,
      channel: 'inApp',
      deliveryStatus: 'delivered',
      level: log.level,
      module: log.module,
      eventType: log.eventType,
      title: log.title,
      detail: log.detail,
      errorMessage: log.error?.message,
      accountId: log.accountId,
      accountName: log.accountName,
      taskKind: log.taskKind,
      runId: log.runId,
      metadata: log.metadata,
    };
    deps.setNotifications([notification, ...deps.getNotifications()].slice(0, 500));
  }

  return {
    getGlobalLogs(): GlobalLogEntry[] {
      return deps.getGlobalLogs().filter(log => log.timestamp > recentLogCutoff(deps.now()));
    },

    addGlobalLog(input: GlobalLogInput): GlobalLogEntry {
      const entry: GlobalLogEntry = {
        ...input,
        id: deps.createId(),
        timestamp: deps.now(),
      };
      deps.setGlobalLogs([entry, ...this.getGlobalLogs()].slice(0, 1000));
      maybeCreateNotification(entry);
      return entry;
    },

    clearGlobalLogs(): void {
      deps.setGlobalLogs([]);
    },

    getNotificationPreference: getPreference,

    updateNotificationPreference(patch: Partial<NotificationPreference>): NotificationPreference {
      const current = getPreference();
      const next: NotificationPreference = {
        ...current,
        ...patch,
        levelEnabled: { ...current.levelEnabled, ...(patch.levelEnabled || {}) },
        moduleEnabled: { ...current.moduleEnabled, ...(patch.moduleEnabled || {}) },
        eventTypeEnabled: { ...current.eventTypeEnabled, ...(patch.eventTypeEnabled || {}) },
      };
      deps.setNotificationPreference(next);
      return next;
    },

    getNotifications(): NotificationEntry[] {
      return deps.getNotifications();
    },

    markNotificationRead(notificationId: string): NotificationEntry[] {
      const timestamp = deps.now();
      const next = deps.getNotifications().map(notification => (
        notification.id === notificationId
          ? { ...notification, readAt: notification.readAt || timestamp, deliveryStatus: 'read' as const }
          : notification
      ));
      deps.setNotifications(next);
      return next;
    },

    markAllNotificationsRead(): NotificationEntry[] {
      const timestamp = deps.now();
      const next = deps.getNotifications().map(notification => ({
        ...notification,
        readAt: notification.readAt || timestamp,
        deliveryStatus: 'read' as const,
      }));
      deps.setNotifications(next);
      return next;
    },

    clearNotifications(): void {
      deps.setNotifications([]);
    },
  };
}
