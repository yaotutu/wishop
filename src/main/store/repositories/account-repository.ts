import type { Config, FullAccount, ScheduledTask, TaskConfig } from '../../../shared/types';

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
        schedulers: [],
        taskConfig: { ...DEFAULT_TASK_CONFIG },
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

    getSchedulers(accountId: string): ScheduledTask[] {
      return getAccount(accountId)?.schedulers || [];
    },

    addScheduler(accountId: string, task: Omit<ScheduledTask, 'id' | 'lastRunDate' | 'todayListedCount'>): ScheduledTask {
      const newTask: ScheduledTask = {
        ...task,
        id: deps.createId(),
        lastRunDate: '',
        todayListedCount: 0,
      };
      deps.setAccounts(deps.getAccounts().map(account => (
        account.id === accountId ? { ...account, schedulers: [...account.schedulers, newTask] } : account
      )));
      return newTask;
    },

    updateScheduler(accountId: string, taskId: string, patch: Partial<ScheduledTask>): void {
      deps.setAccounts(deps.getAccounts().map(account => {
        if (account.id !== accountId) return account;
        return {
          ...account,
          schedulers: account.schedulers.map(task => task.id === taskId ? { ...task, ...patch } : task),
        };
      }));
    },

    removeScheduler(accountId: string, taskId: string): void {
      deps.setAccounts(deps.getAccounts().map(account => (
        account.id === accountId
          ? { ...account, schedulers: account.schedulers.filter(task => task.id !== taskId) }
          : account
      )));
    },
  };
}
