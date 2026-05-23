import type { Config, FullAccount, TaskConfig } from '../../../shared/types';

const DEFAULT_TASK_CONFIG: TaskConfig = {
  listUnreviewed: true,
  listUnreviewedQuantity: 2,
  autoDeleteFailed: true,
};

export interface AccountRepositoryDeps {
  getAccounts: () => FullAccount[];
  setAccounts: (accounts: FullAccount[]) => void;
  getActiveAccountId: () => string;
  setActiveAccountId: (accountId: string) => void;
  createId: () => string;
  now: () => number;
  env?: NodeJS.ProcessEnv;
}

export function createAccountRepository(deps: AccountRepositoryDeps) {
  const getAccount = (accountId: string): FullAccount | undefined => deps.getAccounts().find(account => account.id === accountId);

  return {
    getAccounts(): FullAccount[] {
      return deps.getAccounts();
    },

    getAccount,

    addAccount(name: string, config: Config): FullAccount {
      const account: FullAccount = {
        id: deps.createId(),
        name,
        config,
        taskConfig: { ...DEFAULT_TASK_CONFIG },
        listingSettings: {
          useAccountTaskConfig: false,
          useAccountRules: false,
          globalScheduledEnabled: true,
        },
        violationWords: [],
        productSources: [],
        orderAssociations: [],
        realAddressCaches: [],
        logs: [],
        createdAt: deps.now(),
      };
      const accounts = [...deps.getAccounts(), account];
      deps.setAccounts(accounts);
      if (!deps.getActiveAccountId()) deps.setActiveAccountId(account.id);
      return account;
    },

    removeAccount(accountId: string): void {
      const accounts = deps.getAccounts().filter(account => account.id !== accountId);
      deps.setAccounts(accounts);
      if (deps.getActiveAccountId() === accountId) {
        deps.setActiveAccountId(accounts.length > 0 ? accounts[0].id : '');
      }
    },

    updateAccount(accountId: string, patch: Partial<Pick<FullAccount, 'name' | 'config'>>): void {
      deps.setAccounts(deps.getAccounts().map(account => (
        account.id === accountId ? { ...account, ...patch } : account
      )));
    },

    getConfig(accountId: string): Config {
      const account = getAccount(accountId);
      if (!account) return { appId: '', appSecret: '' };
      return {
        appId: account.config.appId || deps.env?.WECHAT_APP_ID || '',
        appSecret: account.config.appSecret || deps.env?.WECHAT_APP_SECRET || '',
      };
    },

    setConfig(accountId: string, config: Config): void {
      this.updateAccount(accountId, { config });
    },

  };
}
