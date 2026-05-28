import { getAccounts } from '../store';
import { createOrderDomainService } from './order-domain-service';
import { createOrderSyncActivityLog } from './order-sync-activity-log';
import { orderStore } from './order-store';
import { createOrderSyncService } from './order-sync-service';
import { createWxOrderSource } from './wx-order-source';

export const orderSyncService = createOrderSyncService({
  store: orderStore,
  source: createWxOrderSource(),
  getAccounts: async () => getAccounts(),
  activityLog: createOrderSyncActivityLog(),
});

export const orderDomainService = createOrderDomainService({
  store: orderStore,
  sync: orderSyncService,
});
