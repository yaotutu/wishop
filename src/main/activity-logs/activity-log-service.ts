import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { ActivityLogEntry, ActivityLogInput } from '../../shared/activity-log';
import { NOTIFICATION_TOPIC_DEFINITIONS, type NotificationEntry, type NotificationPreference, DEFAULT_NOTIFICATION_PREFERENCE } from '../../shared/notification';
import { readStore, writeStore } from '../store';

export const activityLogEmitter = new EventEmitter();

const ACTIVITY_LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const NOTIFICATION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function pruneByTimestamp<T extends { timestamp: number }>(items: T[], retentionMs: number): T[] {
  const oldest = Date.now() - retentionMs;
  return items
    .filter(item => item.timestamp > oldest)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 500);
}

export function listActivityLogs(): ActivityLogEntry[] {
  return pruneByTimestamp(readStore().activityLogs || [], ACTIVITY_LOG_RETENTION_MS);
}

export function clearActivityLogs(): void {
  writeStore({ activityLogs: [] });
  activityLogEmitter.emit('activityLogs:changed', []);
}

export function appendActivityLog(input: ActivityLogInput): ActivityLogEntry {
  const entry: ActivityLogEntry = {
    ...input,
    id: uuidv4(),
    timestamp: Date.now(),
  };
  const logs = pruneByTimestamp([entry, ...(readStore().activityLogs || [])], ACTIVITY_LOG_RETENTION_MS);
  writeStore({ activityLogs: logs });
  activityLogEmitter.emit('activityLog:added', entry);
  if (entry.notification?.topic) appendNotificationFromActivity(entry);
  return entry;
}

export function getNotificationPreference(): NotificationPreference {
  const stored = readStore().notificationPreference;
  if (!stored) return DEFAULT_NOTIFICATION_PREFERENCE;
  return {
    inAppEnabled: stored.inAppEnabled !== false,
    topicEnabled: { ...DEFAULT_NOTIFICATION_PREFERENCE.topicEnabled, ...stored.topicEnabled },
    domainEnabled: { ...DEFAULT_NOTIFICATION_PREFERENCE.domainEnabled, ...stored.domainEnabled },
  };
}

export function updateNotificationPreference(patch: Partial<NotificationPreference>): NotificationPreference {
  const current = getNotificationPreference();
  const next: NotificationPreference = {
    inAppEnabled: patch.inAppEnabled ?? current.inAppEnabled,
    topicEnabled: { ...current.topicEnabled, ...patch.topicEnabled },
    domainEnabled: { ...current.domainEnabled, ...patch.domainEnabled },
  };
  writeStore({ notificationPreference: next });
  activityLogEmitter.emit('notification:preferenceChanged', next);
  return next;
}

export function listNotifications(): NotificationEntry[] {
  return pruneByTimestamp(readStore().notifications || [], NOTIFICATION_RETENTION_MS);
}

function writeNotifications(notifications: NotificationEntry[]): NotificationEntry[] {
  const next = pruneByTimestamp(notifications, NOTIFICATION_RETENTION_MS);
  writeStore({ notifications: next });
  activityLogEmitter.emit('notification:changed', next);
  return next;
}

function appendNotificationFromActivity(log: ActivityLogEntry): NotificationEntry | null {
  const intent = log.notification;
  if (!intent) return null;
  const preference = getNotificationPreference();
  if (!preference.inAppEnabled) return null;
  if (preference.domainEnabled[log.domain] === false) return null;
  if (preference.topicEnabled[intent.topic] === false) return null;
  const topic = NOTIFICATION_TOPIC_DEFINITIONS.find(item => item.topic === intent.topic);
  const notification: NotificationEntry = {
    id: uuidv4(),
    sourceLogId: log.id,
    topic: intent.topic,
    timestamp: Date.now(),
    channel: 'inApp',
    deliveryStatus: 'delivered',
    level: log.level,
    domain: log.domain,
    event: log.event,
    title: intent.title || log.title,
    detail: intent.detail || log.detail,
    errorMessage: log.error?.message,
    accountId: log.accountId,
    accountName: log.accountName,
    trigger: log.trigger,
    runId: log.runId,
    metadata: log.metadata,
  };
  if (!topic && intent.topic) return null;
  const next = writeNotifications([notification, ...(readStore().notifications || [])]);
  activityLogEmitter.emit('notification:added', notification);
  return next[0] || notification;
}

export function markNotificationRead(notificationId: string): NotificationEntry[] {
  const now = Date.now();
  return writeNotifications(listNotifications().map(notification => (
    notification.id === notificationId
      ? { ...notification, deliveryStatus: 'read' as const, readAt: notification.readAt || now }
      : notification
  )));
}

export function markAllNotificationsRead(): NotificationEntry[] {
  const now = Date.now();
  return writeNotifications(listNotifications().map(notification => (
    notification.readAt ? notification : { ...notification, deliveryStatus: 'read' as const, readAt: now }
  )));
}

export function clearNotifications(): void {
  writeStore({ notifications: [] });
  activityLogEmitter.emit('notification:changed', []);
}

export const recordActivityStarted = (input: Omit<ActivityLogInput, 'event' | 'level'>) =>
  appendActivityLog({ ...input, event: 'started', level: 'info' });

export const recordActivityCompleted = (input: Omit<ActivityLogInput, 'event' | 'level'>) =>
  appendActivityLog({ ...input, event: 'completed', level: 'success' });

export const recordActivitySkipped = (input: Omit<ActivityLogInput, 'event' | 'level'>) =>
  appendActivityLog({ ...input, event: 'skipped', level: 'warning' });

export const recordActivityFailed = (input: Omit<ActivityLogInput, 'event' | 'level'>) =>
  appendActivityLog({ ...input, event: 'failed', level: 'error' });
