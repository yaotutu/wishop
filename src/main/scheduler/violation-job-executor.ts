import {
  createScopedAddLog,
  getConfig,
  getViolationWords,
} from '../store';
import { batchScan } from '../modules/violation-detect';
import { getClient } from '../wxshop/client-registry';
import { registerScheduledJobDefinition } from './scheduler-center';

export function registerViolationScheduledJobs(): void {
  registerScheduledJobDefinition({
    module: 'violation',
    jobType: 'violation.scanProducts',
    async executor({ job, accountId, runId, signal }) {
      if (!accountId) throw new Error('缺少账号 ID');

      const words = getViolationWords(accountId);
      if (words.length === 0) {
        return { listed: 0, status: 'skipped' as const, error: '违规词库为空' };
      }

      const payload = (job.payload || {}) as Partial<{ limit: number }>;
      const result = await batchScan(
        getClient(accountId, getConfig(accountId)),
        createScopedAddLog(accountId),
        words,
        runId,
        signal,
        payload.limit || 200,
        accountId,
      );

      return {
        listed: result.violations.length,
        status: result.stopped || result.errors > 0 ? 'failed' as const : 'completed' as const,
        error: result.reason,
      };
    },
  });
}
