import { registerBrowserTaobaoDomainHandlers } from './handlers/domains/browser-taobao';
import { registerListingDomainHandlers } from './handlers/domains/listing';
import { registerOrdersDomainHandlers } from './handlers/domains/orders';
import { registerSettingsSystemDomainHandlers } from './handlers/domains/settings-system';
import { registerSyncCloudDomainHandlers } from './handlers/domains/sync-cloud';
import { registerViolationsDomainHandlers } from './handlers/domains/violations';
import type { ViolationScanSessionState } from './handlers/violation';
import { SessionManager } from './utils/session-manager';

interface PaginationState {
  nextKey: string;
  hasMore: boolean;
}

interface OrderPaginationState {
  nextKey: string;
  hasMore: boolean;
  windowEndTime: number;
  minStartTime: number;
}

const draftPaginationMap = new Map<string, PaginationState>();
const orderPaginationMap = new Map<string, OrderPaginationState>();
const taskSessions = new SessionManager<void>();
const scanSessions = new SessionManager<ViolationScanSessionState>();

export function registerHandlers(): void {
  const context = { draftPaginationMap, orderPaginationMap, taskSessions, scanSessions };

  registerSettingsSystemDomainHandlers(context);
  registerOrdersDomainHandlers(context);
  registerListingDomainHandlers(context);
  registerViolationsDomainHandlers(context);
  registerSyncCloudDomainHandlers();
  registerBrowserTaobaoDomainHandlers();
}
