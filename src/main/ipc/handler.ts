import { registerAccountHandlers } from './handlers/accounts';
import { registerConfigHandlers } from './handlers/config';
import { registerDraftHandlers } from './handlers/drafts';
import { registerLogHandlers } from './handlers/logs';
import { registerOrderHandlers } from './handlers/orders';
import { registerQuotaHandlers } from './handlers/quota';
import { registerSchedulerHandlers } from './handlers/scheduler';
import { registerTaskHandlers } from './handlers/task';

const draftPaginationMap = new Map<string, { nextKey: string; hasMore: boolean }>();
const orderPaginationMap = new Map<string, { nextKey: string; hasMore: boolean; currentStatus?: number }>();
const taskControllers = new Map<string, AbortController>();

export function registerHandlers(): void {
  const context = { draftPaginationMap, orderPaginationMap, taskControllers };

  registerAccountHandlers(context);
  registerConfigHandlers();
  registerDraftHandlers(context);
  registerLogHandlers();
  registerOrderHandlers(context);
  registerQuotaHandlers();
  registerSchedulerHandlers();
  registerTaskHandlers(context);
}
