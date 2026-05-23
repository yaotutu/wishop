import {
  getAccounts,
  addAccount,
  removeAccount,
  updateAccount,
  getActiveAccountId,
  setActiveAccountId,
  getScheduledJobs,
  removeScheduledJobsForAccount,
} from '../../store';
import type { Config, Account } from '../../../shared/types';
import { stopScheduledJob } from '../../scheduler/scheduled-job-runner';
import { removeClient } from '../../wxshop/client-registry';
import { handleIpc } from '../utils/handle-ipc';

export function registerAccountHandlers(context: { draftPaginationMap: Map<string, unknown> }): void {
  handleIpc('accounts:list', (): Account[] => {
    return getAccounts();
  }, 'Accounts');

  handleIpc('accounts:add', (_, name: string, config: Config): Account => {
    return addAccount(name, config);
  }, 'Accounts');

  handleIpc('accounts:remove', (_, accountId: string): void => {
    for (const job of getScheduledJobs()) {
      if (job.scope === 'account' && job.accountId === accountId) {
        stopScheduledJob(job.id);
      }
    }
    removeAccount(accountId);
    removeScheduledJobsForAccount(accountId);
    removeClient(accountId);
    context.draftPaginationMap.delete(accountId);
  }, 'Accounts');

  handleIpc('accounts:update', (_, accountId: string, patch: Partial<Pick<Account, 'name' | 'config'>>): void => {
    updateAccount(accountId, patch);
  }, 'Accounts');

  handleIpc('accounts:getActive', (): string => {
    return getActiveAccountId();
  }, 'Accounts');

  handleIpc('accounts:setActive', (_, accountId: string): void => {
    setActiveAccountId(accountId);
  }, 'Accounts');
}
