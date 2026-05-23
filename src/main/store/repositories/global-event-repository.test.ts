import { describe, expect, it } from 'vitest';
import { createGlobalEventRepository } from './global-event-repository';
import type { GlobalLogEntry } from '../../../shared/global-log';
import type { NotificationEntry, NotificationPreference } from '../../../shared/notification';

describe('global event repository', () => {
  it('keeps recent logs and creates notifications from matching log entries', () => {
    let logs: GlobalLogEntry[] = [{
      id: 'old',
      timestamp: 1,
      level: 'info',
      module: 'system',
      eventType: 'task',
      title: 'old',
    }];
    let notifications: NotificationEntry[] = [];
    const repo = createGlobalEventRepository({
      getGlobalLogs: () => logs,
      setGlobalLogs: next => { logs = next; },
      getNotifications: () => notifications,
      setNotifications: next => { notifications = next; },
      getNotificationPreference: () => undefined,
      setNotificationPreference: () => undefined,
      createId: () => `id-${logs.length}-${notifications.length}`,
      now: () => 10 * 24 * 60 * 60 * 1000,
    });

    repo.addGlobalLog({
      level: 'error',
      module: 'orders',
      eventType: 'task',
      title: '订单失败',
      detail: 'raw error',
    });

    expect(logs.map(log => log.title)).toEqual(['订单失败']);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      title: '订单失败',
      level: 'error',
      module: 'orders',
      deliveryStatus: 'delivered',
    });
  });

  it('merges nested notification preference patches', () => {
    let preference: NotificationPreference | undefined;
    const repo = createGlobalEventRepository({
      getGlobalLogs: () => [],
      setGlobalLogs: () => undefined,
      getNotifications: () => [],
      setNotifications: () => undefined,
      getNotificationPreference: () => preference,
      setNotificationPreference: next => { preference = next; },
      createId: () => 'id',
      now: () => 1,
    });

    const next = repo.updateNotificationPreference({
      levelEnabled: { error: false },
      moduleEnabled: { orders: false },
    });

    expect(next.levelEnabled.error).toBe(false);
    expect(next.levelEnabled.warning).toBe(true);
    expect(next.levelEnabled.info).toBe(false);
    expect(next.moduleEnabled.orders).toBe(false);
  });
});
