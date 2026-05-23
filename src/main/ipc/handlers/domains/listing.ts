import { registerBlacklistRulesHandlers } from '../blacklistRules';
import { registerDraftHandlers } from '../drafts';
import { registerLogHandlers } from '../logs';
import { registerQuotaHandlers } from '../quota';
import { registerScheduledJobHandlers } from '../scheduledJobs';
import { registerSkipCodeRulesHandlers } from '../skipCodeRules';
import { registerStatusRulesHandlers } from '../statusRules';
import { registerTaskHandlers } from '../task';

type DraftContext = Parameters<typeof registerDraftHandlers>[0];
type TaskContext = Parameters<typeof registerTaskHandlers>[0];

export function registerListingDomainHandlers(context: DraftContext & TaskContext): void {
  registerDraftHandlers(context);
  registerTaskHandlers(context);
  registerQuotaHandlers();
  registerLogHandlers();
  registerScheduledJobHandlers();
  registerBlacklistRulesHandlers();
  registerSkipCodeRulesHandlers();
  registerStatusRulesHandlers();
}
