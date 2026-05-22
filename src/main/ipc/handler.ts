import { registerAccountHandlers } from './handlers/accounts';
import { registerBrowserHandlers } from './handlers/browser';
import { registerConfigHandlers } from './handlers/config';
import { registerDraftHandlers } from './handlers/drafts';
import { registerGlobalLogHandlers } from './handlers/globalLogs';
import { registerLogHandlers } from './handlers/logs';
import { registerLicenseHandlers } from './handlers/license';
import { registerNotificationHandlers } from './handlers/notifications';
import { registerOrderHandlers } from './handlers/orders';
import { registerOrderAssociationHandlers } from './handlers/orderAssociations';
import { registerProductSourceHandlers } from './handlers/productSources';
import { registerQuotaHandlers } from './handlers/quota';
import { registerRealAddressHandlers } from './handlers/realAddresses';
import { registerSchedulerHandlers } from './handlers/scheduler';
import { registerScheduledJobHandlers } from './handlers/scheduledJobs';
import { registerSettingsHandlers } from './handlers/settings';
import { registerTaskHandlers } from './handlers/task';
import { registerTaobaoAutomationHandlers } from './handlers/taobaoAutomation';
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
  windowEndTime: number;
  minStartTime: number;
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
  registerBrowserHandlers();
  registerConfigHandlers();
  registerDraftHandlers(context);
  registerGlobalLogHandlers();
  registerLogHandlers();
  registerLicenseHandlers();
  registerNotificationHandlers();
  registerOrderHandlers(context);
  registerOrderAssociationHandlers();
  registerProductSourceHandlers();
  registerQuotaHandlers();
  registerRealAddressHandlers();
  registerSchedulerHandlers();
  registerScheduledJobHandlers();
  registerSettingsHandlers();
  registerTaobaoAutomationHandlers();
  registerTaskHandlers(context);
  registerViolationHandlers(context);
  registerBlacklistRulesHandlers();
  registerSkipCodeRulesHandlers();
  registerStatusRulesHandlers();
}
