import type { ActivityLogTrigger } from '../../shared/activity-log';
import { appendActivityLog } from '../activity-logs/activity-log-service';
import type {
  OrderSyncActivityCompleteInput,
  OrderSyncActivityFailInput,
  OrderSyncActivityLog,
  OrderSyncActivityStartInput,
  RefreshOptions,
} from './order-sync-service';

function triggerForReason(reason: NonNullable<RefreshOptions['reason']>): ActivityLogTrigger {
  return reason === 'manualRefresh' ? 'manual' : 'background';
}

function metadataFor(input: OrderSyncActivityStartInput) {
  return {
    reason: input.reason,
    mode: input.mode,
    accountCount: input.accountCount,
    concurrency: input.concurrency,
  };
}

function startDetail(input: OrderSyncActivityStartInput): string {
  const scope = input.scope.type === 'all' ? '全部账号' : `账号 ${input.scope.accountId}`;
  return `${scope}，账号数 ${input.accountCount}，并发上限 ${input.concurrency}`;
}

function completeTitle(input: OrderSyncActivityCompleteInput): string {
  if (input.status === 'failed') return '订单刷新失败';
  if (input.status === 'partial_failed') return '订单刷新部分失败';
  return '订单刷新完成';
}

function baseInput(input: OrderSyncActivityStartInput) {
  return {
    domain: 'orders' as const,
    scope: input.scope.type === 'all' ? 'global' as const : 'account' as const,
    accountId: input.scope.type === 'account' ? input.scope.accountId : undefined,
    trigger: triggerForReason(input.reason),
    metadata: metadataFor(input),
  };
}

export function createOrderSyncActivityLog(): OrderSyncActivityLog {
  return {
    started(input) {
      appendActivityLog({
        ...baseInput(input),
        event: 'started',
        level: 'info',
        title: '订单刷新开始',
        detail: startDetail(input),
      });
    },
    completed(input) {
      const summary = {
        succeeded: input.successCount,
        failed: input.failureCount,
        fetched: input.fetchedOrderCount,
        updated: input.updatedOrderCount,
      };
      if (input.status === 'failed') {
        appendActivityLog({
          ...baseInput(input),
          event: 'failed',
          level: 'error',
          title: completeTitle(input),
          summary,
          error: { message: `成功 ${input.successCount}，失败 ${input.failureCount}` },
          notification: {
            topic: 'orders.sync_failed',
            urgency: 'important',
            detail: `成功 ${input.successCount}，失败 ${input.failureCount}`,
          },
        });
        return;
      }
      appendActivityLog({
        ...baseInput(input),
        event: 'completed',
        level: input.status === 'partial_failed' ? 'warning' : 'success',
        title: completeTitle(input),
        summary,
        notification: input.status === 'partial_failed' ? {
          topic: 'orders.sync_failed',
          urgency: 'normal',
          detail: `成功 ${input.successCount}，失败 ${input.failureCount}`,
        } : undefined,
      });
    },
    failed(input: OrderSyncActivityFailInput) {
      appendActivityLog({
        ...baseInput(input),
        event: 'failed',
        level: 'error',
        title: '订单刷新失败',
        error: { message: input.error },
        notification: {
          topic: 'orders.sync_failed',
          urgency: 'important',
          detail: input.error,
        },
      });
    },
  };
}
