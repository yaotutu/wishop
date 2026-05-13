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

const draftPaginationMap = new Map<string, { nextKey: string; hasMore: boolean }>();
const orderPaginationMap = new Map<string, { nextKey: string; hasMore: boolean; currentStatus?: number }>();
const taskControllers = new Map<string, AbortController>();
const scanSessions = new Map<string, any>();

export function registerHandlers(): void {
  const context = { draftPaginationMap, orderPaginationMap, taskControllers, scanSessions };

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
}
