import type { ScheduledJob, TaskConfig } from '../../shared/types';
import {
  createScopedAddLog,
  getAccounts,
  getConfig,
  getEffectiveBlacklistRules,
  getEffectiveSkipKeywords,
  getEffectiveStatusRules,
  getEffectiveTaskConfig,
} from '../store';
import { runTaskCycle } from '../modules/task-cycle';
import { getClient } from '../wxshop/client-registry';
import { registerScheduledJobDefinition } from './scheduler-center';

function targetListingAccountIds(job: ScheduledJob): string[] {
  if (job.scope === 'account') return job.accountId ? [job.accountId] : [];
  const excluded = new Set(job.excludedAccountIds || []);
  return getAccounts()
    .filter(account => !excluded.has(account.id))
    .filter(account => {
      const legacyFlag = (account as { globalListingScheduledEnabled?: boolean }).globalListingScheduledEnabled;
      return (account.listingSettings?.globalScheduledEnabled ?? legacyFlag) !== false;
    })
    .map(account => account.id);
}

export function registerListingScheduledJobs(): void {
  registerScheduledJobDefinition({
    module: 'listing',
    jobType: 'listing.submitDrafts',
    targetAccountIds: targetListingAccountIds,
    async executor({ accountId, runId, signal }) {
      if (!accountId) throw new Error('缺少账号 ID');

      const api = getClient(accountId, getConfig(accountId));
      const quota = await api.getAuditQuota();
      if (quota.quota <= 0) {
        return { listed: 0, status: 'skipped' as const, error: '今日提审配额已用完' };
      }

      const configured = getEffectiveTaskConfig(accountId);
      const taskConfig: TaskConfig = {
        listUnreviewed: configured.listUnreviewed ?? true,
        listUnreviewedQuantity: Math.min(configured.listUnreviewedQuantity || quota.quota, quota.quota),
        autoDeleteFailed: configured.autoDeleteFailed ?? true,
      };

      const result = await runTaskCycle(
        api,
        createScopedAddLog(accountId),
        taskConfig,
        runId,
        signal,
        accountId,
        getEffectiveBlacklistRules(accountId),
        getEffectiveSkipKeywords(accountId),
        getEffectiveStatusRules(accountId),
      );

      return {
        listed: result.listed,
        status: result.stopped || result.errors > 0 ? 'failed' as const : 'completed' as const,
        error: result.reason,
      };
    },
  });
}
