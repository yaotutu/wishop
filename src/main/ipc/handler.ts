import { registerAccountHandlers } from './handlers/accounts';
import { registerConfigHandlers } from './handlers/config';
import { registerDraftHandlers } from './handlers/drafts';
import { registerLogHandlers } from './handlers/logs';
import { registerQuotaHandlers } from './handlers/quota';
import { registerSchedulerHandlers } from './handlers/scheduler';
import { registerTaskHandlers } from './handlers/task';

const draftPaginationMap = new Map<string, { nextKey: string; hasMore: boolean }>();
const taskControllers = new Map<string, AbortController>();

export function registerHandlers(): void {
  const context = { draftPaginationMap, taskControllers };

  registerAccountHandlers(context);
  registerConfigHandlers();
  registerDraftHandlers(context);
  registerLogHandlers();
  registerQuotaHandlers();
  registerSchedulerHandlers();
  registerTaskHandlers(context);
}
