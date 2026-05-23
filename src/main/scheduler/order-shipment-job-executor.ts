import type { BrowserWindow } from 'electron';
import type { LinkedPlatformOrder, Order, OrderAssociation, ScheduledJob } from '../../shared/types';
import { OrderStatus } from '../../shared/types';
import { normalizeShipmentCheckSettings } from '../../shared/settings';
import {
  getAppSettings,
  getConfig,
  getOrderAssociations,
  setOrderAssociation,
} from '../store';
import { getClient } from '../wxshop/client-registry';
import { runPurchaseLookupAutomation } from '../services/taobao-automation-service';
import {
  buildShipmentCheckDispatchPlan,
  selectShipmentCheckCandidates,
  type ShipmentCheckDispatchPlanItem,
} from './order-shipment-check-planner';
import {
  cancelDeferredTasksByPrefix,
  registerScheduledJobDefinition,
  scheduleDeferredTask,
  scheduledJobSingletonKey,
} from './scheduler-center';

const DISPATCH_TASK_PREFIX = 'orders-shipment-check:';
const DEFAULT_ORDER_SHIPMENT_JOB_NAME = '采购发货状态检测';

function encodeTaskPart(value: string): string {
  return encodeURIComponent(value);
}

function dispatchTaskId(item: ShipmentCheckDispatchPlanItem): string {
  return `${DISPATCH_TASK_PREFIX}${[
    item.accountId,
    item.orderId,
    item.platformOrderId,
  ].map(encodeTaskPart).join(':')}`;
}

async function fetchPendingShipmentOrders(accountId: string, lookbackDays: number): Promise<Order[]> {
  const api = getClient(accountId, getConfig(accountId));
  const nowSeconds = Math.floor(Date.now() / 1000);
  const listResult = await api.getOrderList({
    page_size: 50,
    status: OrderStatus.PendingShipment,
    create_time_range: {
      start_time: nowSeconds - lookbackDays * 24 * 60 * 60,
      end_time: nowSeconds,
    },
  });
  const settled = await Promise.allSettled(listResult.order_id_list.map(orderId => api.getOrderDetail(orderId)));
  return settled
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter((order): order is Order => order !== null);
}

function patchLinkedOrderShipmentCheck(
  accountId: string,
  orderId: string,
  patch: Partial<Pick<
    LinkedPlatformOrder,
    | 'lastShipmentCheckQueuedAt'
    | 'lastShipmentCheckStartedAt'
    | 'lastShipmentCheckFinishedAt'
    | 'lastShipmentCheckStatus'
    | 'lastShipmentCheckError'
    | 'nextShipmentCheckAfter'
  >>,
): OrderAssociation | null {
  const existing = getOrderAssociations(accountId).find(item => item.orderId === orderId);
  const [linked, ...rest] = existing?.linkedOrders || [];
  if (!existing || !linked) return null;
  return setOrderAssociation(accountId, orderId, {
    internalRemark: existing.internalRemark || '',
    linkedOrders: [{ ...linked, ...patch, updatedAt: Date.now() }, ...rest],
  });
}

function isTaobaoVerificationError(message: string): boolean {
  return message.includes('需要人工处理') || message.includes('登录') || message.includes('验证');
}

async function dispatchShipmentCheck(
  item: ShipmentCheckDispatchPlanItem,
  getMainWindow: () => BrowserWindow | null,
): Promise<void> {
  const settings = normalizeShipmentCheckSettings(getAppSettings().shipmentCheck);
  if (!settings.enabled) {
    patchLinkedOrderShipmentCheck(item.accountId, item.orderId, {
      lastShipmentCheckFinishedAt: Date.now(),
      lastShipmentCheckStatus: 'skipped',
      lastShipmentCheckError: '发货状态检测已关闭',
    });
    return;
  }

  const parent = getMainWindow();
  if (!parent || parent.isDestroyed()) {
    patchLinkedOrderShipmentCheck(item.accountId, item.orderId, {
      lastShipmentCheckFinishedAt: Date.now(),
      lastShipmentCheckStatus: 'waiting_user',
      lastShipmentCheckError: '主窗口不可用，无法打开淘宝工作页',
      nextShipmentCheckAfter: Date.now() + settings.verificationCooldownMinutes * 60 * 1000,
    });
    return;
  }

  patchLinkedOrderShipmentCheck(item.accountId, item.orderId, {
    lastShipmentCheckStartedAt: Date.now(),
    lastShipmentCheckStatus: 'running',
    lastShipmentCheckError: '',
  });

  try {
    await runPurchaseLookupAutomation(parent, {
      accountId: item.accountId,
      orderId: item.orderId,
      platformOrderId: item.platformOrderId,
    }, { getOrderAssociations, setOrderAssociation });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const waitingUser = isTaobaoVerificationError(message);
    patchLinkedOrderShipmentCheck(item.accountId, item.orderId, {
      lastShipmentCheckFinishedAt: Date.now(),
      lastShipmentCheckStatus: waitingUser ? 'waiting_user' : 'failed',
      lastShipmentCheckError: message,
      nextShipmentCheckAfter: Date.now() + (
        waitingUser
          ? settings.verificationCooldownMinutes
          : settings.failureCooldownMinutes
      ) * 60 * 1000,
    });
  }
}

function scheduleDispatches(
  plan: ShipmentCheckDispatchPlanItem[],
  getMainWindow: () => BrowserWindow | null,
): void {
  const settings = normalizeShipmentCheckSettings(getAppSettings().shipmentCheck);
  for (const item of plan) {
    patchLinkedOrderShipmentCheck(item.accountId, item.orderId, {
      lastShipmentCheckQueuedAt: Date.now(),
      lastShipmentCheckStatus: 'queued',
      lastShipmentCheckError: '',
      nextShipmentCheckAfter: item.scheduledAt + settings.normalCooldownMinutes * 60 * 1000,
    });
    scheduleDeferredTask({
      id: dispatchTaskId(item),
      runAt: item.scheduledAt,
      task: ({ signal }) => {
        if (signal.aborted) return;
        return dispatchShipmentCheck(item, getMainWindow);
      },
    });
  }
}

function createOrderShipmentCheckJob(): Omit<ScheduledJob, 'id' | 'stats' | 'createdAt' | 'updatedAt'> {
  const settings = normalizeShipmentCheckSettings(getAppSettings().shipmentCheck);
  return {
    name: DEFAULT_ORDER_SHIPMENT_JOB_NAME,
    enabled: settings.enabled,
    module: 'orders',
    jobType: 'orders.checkShipmentStatus',
    scope: 'global',
    singletonKey: scheduledJobSingletonKey('orders.checkShipmentStatus'),
    cronExpression: `*/${settings.windowMinutes} * * * *`,
    staggerMinutes: 0,
    dailyLimit: 0,
    payload: {},
  };
}

export function registerOrderShipmentScheduledJobs(): void {
  registerScheduledJobDefinition({
    module: 'orders',
    jobType: 'orders.checkShipmentStatus',
    createDefaultJob: createOrderShipmentCheckJob,
    async executor({ accountId, getMainWindow }) {
      if (!accountId) throw new Error('缺少账号 ID');

      const settings = normalizeShipmentCheckSettings(getAppSettings().shipmentCheck);
      if (!settings.enabled) {
        cancelDeferredTasksByPrefix(DISPATCH_TASK_PREFIX);
        return { listed: 0, status: 'skipped' as const, error: '发货状态检测已关闭' };
      }

      const [orders, associations] = await Promise.all([
        fetchPendingShipmentOrders(accountId, settings.orderLookbackDays),
        Promise.resolve(getOrderAssociations(accountId)),
      ]);
      const associationsByOrderId = Object.fromEntries(associations.map(association => [association.orderId, association]));
      const candidates = selectShipmentCheckCandidates({
        accountId,
        orders,
        associationsByOrderId,
        settings,
        now: Date.now(),
        activeKeys: new Set(),
      });
      const plan = buildShipmentCheckDispatchPlan({ candidates, settings, now: Date.now() });
      scheduleDispatches(plan, getMainWindow);

      return {
        listed: plan.length,
        status: plan.length > 0 ? 'completed' as const : 'skipped' as const,
        error: plan.length > 0 ? `已安排 ${plan.length} 个采购单在本窗口内检测` : '本轮没有需要检测的采购单',
      };
    },
  });
}
