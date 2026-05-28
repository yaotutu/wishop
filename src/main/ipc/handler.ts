import { registerAccountHandlers } from './handlers/accounts';
import { registerActivityLogHandlers } from './handlers/activityLogs';
import { registerConfigHandlers } from './handlers/config';
import { registerDraftHandlers } from './handlers/drafts';
import { registerLogHandlers } from './handlers/logs';
import { registerLicenseHandlers } from './handlers/license';
import { registerOrderHandlers } from './handlers/orders';
import { registerOrderAssociationHandlers } from './handlers/orderAssociations';
import { registerNotificationHandlers } from './handlers/notifications';
import { registerProductSourceHandlers } from './handlers/productSources';
import { registerQuotaHandlers } from './handlers/quota';
import { registerRealAddressHandlers } from './handlers/realAddresses';
import { registerSchedulerHandlers } from './handlers/scheduler';
import { registerScheduledJobHandlers } from './handlers/scheduledJobs';
import { registerSettingsHandlers } from './handlers/settings';
import { registerTaskHandlers } from './handlers/task';
import { registerViolationHandlers } from './handlers/violation';
import { registerBlacklistRulesHandlers } from './handlers/blacklistRules';
import { registerSkipCodeRulesHandlers } from './handlers/skipCodeRules';
import { registerStatusRulesHandlers } from './handlers/statusRules';
import { SessionManager } from './utils/session-manager';

interface PaginationState {
  nextKey: string;
  hasMore: boolean;
}

interface OrderPaginationState {
  nextKey: string;
  hasMore: boolean;
}

interface ScanSessionState {
  generator: AsyncGenerator<any> | null;
  current: any | null;
  done: boolean;
  logForwarder: { start: () => void; stop: () => void };
}

const draftPaginationMap = new Map<string, PaginationState>();
const orderPaginationMap = new Map<string, OrderPaginationState>();
const taskSessions = new SessionManager<void>();
const scanSessions = new SessionManager<ScanSessionState>();

export function registerHandlers(): void {
  const context = { draftPaginationMap, orderPaginationMap, taskSessions, scanSessions };

  registerAccountHandlers(context);
  registerActivityLogHandlers();
  registerConfigHandlers();
  registerDraftHandlers(context);
  registerLicenseHandlers();
  registerLogHandlers();
  registerOrderHandlers();
  registerOrderAssociationHandlers();
  registerNotificationHandlers();
  registerProductSourceHandlers();
  registerRealAddressHandlers();
  registerQuotaHandlers();
  registerSchedulerHandlers();
  registerScheduledJobHandlers();
  registerSettingsHandlers();
  registerTaskHandlers(context);
  registerViolationHandlers(context);
  registerBlacklistRulesHandlers();
  registerSkipCodeRulesHandlers();
  registerStatusRulesHandlers();
}
