import type { FullAccount } from '../../../shared/types';

export interface ViolationRepositoryDeps {
  getAccounts: () => FullAccount[];
  setAccounts: (accounts: FullAccount[]) => void;
}

export function createViolationRepository(deps: ViolationRepositoryDeps) {
  return {
    getViolationWords(accountId: string): string[] {
      return deps.getAccounts().find(account => account.id === accountId)?.violationWords || [];
    },

    setViolationWords(accountId: string, words: string[]): void {
      const accounts = deps.getAccounts();
      deps.setAccounts(accounts.map(account => (
        account.id === accountId ? { ...account, violationWords: words } : account
      )));
    },
  };
}

