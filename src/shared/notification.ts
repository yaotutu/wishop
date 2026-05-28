import type { ActivityLogDomain, ActivityLogEntry, ActivityLogEvent, ActivityLogLevel } from './activity-log';

export type NotificationChannel = 'inApp';
export type NotificationDeliveryStatus = 'created' | 'delivered' | 'read';
export type NotificationUrgency = 'silent' | 'normal' | 'important';

export type NotificationTopic =
  | 'orders.sync_failed'
  | 'listing.audit_failed'
  | 'listing.audit_warning'
  | 'scheduled_job.failed'
  | 'system.credential_invalid';

export interface ActivityLogNotificationIntent {
  topic: NotificationTopic;
  urgency?: NotificationUrgency;
  title?: string;
  detail?: string;
}

export interface NotificationEntry {
  id: string;
  sourceLogId: string;
  topic: NotificationTopic;
  timestamp: number;
  channel: NotificationChannel;
  deliveryStatus: NotificationDeliveryStatus;
  level: ActivityLogLevel;
  domain: ActivityLogDomain;
  event: ActivityLogEvent;
  title: string;
  detail?: string;
  errorMessage?: string;
  accountId?: string;
  accountName?: string;
  trigger?: ActivityLogEntry['trigger'];
  runId?: string;
  readAt?: number;
  metadata?: ActivityLogEntry['metadata'];
}

export interface NotificationPreference {
  inAppEnabled: boolean;
  topicEnabled: Record<NotificationTopic, boolean>;
  domainEnabled: Record<ActivityLogDomain, boolean>;
}

export const DEFAULT_NOTIFICATION_PREFERENCE: NotificationPreference = {
  inAppEnabled: true,
  topicEnabled: {
    'orders.sync_failed': true,
    'listing.audit_failed': true,
    'listing.audit_warning': true,
    'scheduled_job.failed': true,
    'system.credential_invalid': true,
  },
  domainEnabled: {
    listing: true,
    violation: true,
    orders: true,
    store: true,
    scheduler: true,
    system: true,
  },
};

export interface NotificationTopicDefinition {
  topic: NotificationTopic;
  domain: ActivityLogDomain;
  label: string;
  description: string;
  defaultUrgency: NotificationUrgency;
}

export const NOTIFICATION_TOPIC_DEFINITIONS: NotificationTopicDefinition[] = [
  {
    topic: 'orders.sync_failed',
    domain: 'orders',
    label: '订单同步失败',
    description: '微信小店订单同步、搜索或详情刷新失败。',
    defaultUrgency: 'important',
  },
  {
    topic: 'listing.audit_failed',
    domain: 'listing',
    label: '商品提审失败',
    description: '手动或定时商品提审任务失败。',
    defaultUrgency: 'important',
  },
  {
    topic: 'listing.audit_warning',
    domain: 'listing',
    label: '商品提审异常摘要',
    description: '商品提审完成但存在跳过、错误、停止或配额异常。',
    defaultUrgency: 'normal',
  },
  {
    topic: 'scheduled_job.failed',
    domain: 'scheduler',
    label: '定时任务失败',
    description: '调度中心执行定时任务失败。',
    defaultUrgency: 'important',
  },
  {
    topic: 'system.credential_invalid',
    domain: 'system',
    label: '店铺凭证失效',
    description: '店铺授权、AppSecret 或接口凭证不可用。',
    defaultUrgency: 'important',
  },
];
