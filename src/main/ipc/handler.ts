import { registerAccountHandlers } from './handlers/accounts';
import { registerBrowserHandlers } from './handlers/browser';
import { registerConfigHandlers } from './handlers/config';
import { registerDraftHandlers } from './handlers/drafts';
import { registerLogHandlers } from './handlers/logs';
import { registerOrderHandlers } from './handlers/orders';
import { registerQuotaHandlers } from './handlers/quota';
import { registerSchedulerHandlers } from './handlers/scheduler';
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
  registerBrowserHandlers();
  registerConfigHandlers();
  registerDraftHandlers(context);
  registerLogHandlers();
  registerOrderHandlers(context);
  registerQuotaHandlers();
  registerSchedulerHandlers();
  registerTaskHandlers(context);
  registerViolationHandlers(context);
  registerBlacklistRulesHandlers();
  registerSkipCodeRulesHandlers();
  registerStatusRulesHandlers();
}
