import type { BlacklistRule, FullAccount, ListingRulesConfig, ListingSettings, LogEntry, StatusRule, TaskConfig } from '../../../shared/types';

const DEFAULT_TASK_CONFIG: TaskConfig = {
  listUnreviewed: true,
  listUnreviewedQuantity: 2,
  autoDeleteFailed: true,
};

const DEFAULT_BLACKLIST: BlacklistRule[] = [
  { code: 1002002, description: '本店铺近1天内提审次数超过限制，请1天后再试' },
  { code: 10020066, description: '本店铺近1小时内提审次数超过限制，请1小时后再试' },
  { code: 10020111, description: '本店铺近1天内提审次数超过限制，请1天后再试' },
  { code: 6600148, description: '今日提审次数已用尽，请明日再试' },
  { code: 10020208, description: '本店铺的上架功能被封禁，请登录微信小店后台管理页查看详情' },
  { code: 10020246, description: '0元保证金试运营商品数超出限制，上架中与审核中商品总数不得超过100个' },
  { code: 10020247, description: '由于未在限定时间内完成升级，该店铺已被限制商品新增能力' },
];

const DEFAULT_STATUS_RULES: StatusRule[] = [
  { editStatus: 72, label: '未审核', action: 'submit' },
  { editStatus: 1, label: '编辑中', action: 'submit' },
  { editStatus: 3, label: '审核失败', action: 'delete' },
  { editStatus: 2, label: '审核中', action: 'skip' },
  { editStatus: 4, label: '成功', action: 'skip' },
  { editStatus: 7, label: '上传中', action: 'skip' },
  { editStatus: 8, label: '上传失败', action: 'skip' },
];

export interface ListingRepositoryDeps {
  getAccounts: () => FullAccount[];
  setAccounts: (accounts: FullAccount[]) => void;
  getGlobal: <T>(key: string) => T | undefined;
  setGlobal: (key: string, value: unknown) => void;
  now: () => number;
  createId: () => string;
}

function recentCutoff(now: number): number {
  return now - 7 * 24 * 60 * 60 * 1000;
}

function mergeByCode(stored: BlacklistRule[] | undefined): BlacklistRule[] {
  if (!stored) return DEFAULT_BLACKLIST;
  const codeSet = new Set(stored.map(rule => rule.code));
  return [...stored, ...DEFAULT_BLACKLIST.filter(rule => !codeSet.has(rule.code))];
}

function mergeByEditStatus(stored: StatusRule[] | undefined): StatusRule[] {
  if (!stored) return DEFAULT_STATUS_RULES;
  const statusSet = new Set(stored.map(rule => rule.editStatus));
  return [...stored, ...DEFAULT_STATUS_RULES.filter(rule => !statusSet.has(rule.editStatus))];
}

export function createListingRepository(deps: ListingRepositoryDeps) {
  const getAccount = (accountId: string): FullAccount | undefined => deps.getAccounts().find(account => account.id === accountId);
  const defaultTaskConfig = (): TaskConfig => ({ ...DEFAULT_TASK_CONFIG });
  const getGlobalTaskConfig = (): TaskConfig => deps.getGlobal<TaskConfig>('globalTaskConfig') || defaultTaskConfig();
  const getGlobalRules = (): ListingRulesConfig => ({
    blacklistRules: mergeByCode(deps.getGlobal<BlacklistRule[]>('blacklistRules')),
    skipKeywords: deps.getGlobal<string[]>('skipKeywords') || [],
    statusRules: mergeByEditStatus(deps.getGlobal<StatusRule[]>('statusRules')),
  });
  const getAccountTaskConfig = (accountId: string): TaskConfig => getAccount(accountId)?.taskConfig || getGlobalTaskConfig();
  const getAccountRules = (accountId: string): ListingRulesConfig => {
    const account = getAccount(accountId);
    return account?.listingRules || getGlobalRules();
  };
  const updateAccountListingSettings = (
    accountId: string,
    patch: NonNullable<FullAccount['listingSettings']>,
    extra?: Partial<Pick<FullAccount, 'taskConfig' | 'listingRules'>>,
  ): void => {
    const accounts = deps.getAccounts();
    deps.setAccounts(accounts.map(account => (
      account.id === accountId
        ? {
            ...account,
            ...extra,
            listingSettings: {
              globalScheduledEnabled: true,
              ...(account.listingSettings || {}),
              ...patch,
            },
          }
        : account
    )));
  };

  return {
    getDefaultBlacklistCodes(): number[] {
      return DEFAULT_BLACKLIST.map(rule => rule.code);
    },

    getDefaultStatusRules(): StatusRule[] {
      return DEFAULT_STATUS_RULES;
    },

    getGlobalTaskConfig(): TaskConfig {
      return getGlobalTaskConfig();
    },

    setGlobalTaskConfig(taskConfig: TaskConfig): void {
      deps.setGlobal('globalTaskConfig', taskConfig);
    },

    getTaskConfig(accountId: string): TaskConfig {
      return getAccountTaskConfig(accountId);
    },

    setTaskConfig(accountId: string, taskConfig: TaskConfig): void {
      const accounts = deps.getAccounts();
      deps.setAccounts(accounts.map(account => (
        account.id === accountId
          ? {
              ...account,
              taskConfig,
              listingSettings: {
                globalScheduledEnabled: true,
                ...(account.listingSettings || {}),
                useAccountTaskConfig: true,
              },
            }
          : account
      )));
    },

    setAccountTaskConfigEnabled(accountId: string, enabled: boolean): void {
      updateAccountListingSettings(accountId, { useAccountTaskConfig: enabled });
    },

    getEffectiveTaskConfig(accountId: string): TaskConfig {
      const account = getAccount(accountId);
      return account?.listingSettings?.useAccountTaskConfig
        ? getAccountTaskConfig(accountId)
        : getGlobalTaskConfig();
    },

    getListingSettings(accountId: string): ListingSettings {
      const account = getAccount(accountId);
      const useAccountTaskConfig = !!account?.listingSettings?.useAccountTaskConfig;
      const useAccountRules = !!account?.listingSettings?.useAccountRules;
      const globalScheduledEnabled = account?.listingSettings?.globalScheduledEnabled !== false;
      const globalRules = getGlobalRules();
      const accountRules = getAccountRules(accountId);
      const effectiveRules = useAccountRules
        ? { ...accountRules, source: 'account' as const }
        : { ...globalRules, source: 'global' as const };
      return {
        globalTaskConfig: getGlobalTaskConfig(),
        accountTaskConfig: getAccountTaskConfig(accountId),
        effectiveTaskConfig: useAccountTaskConfig ? getAccountTaskConfig(accountId) : getGlobalTaskConfig(),
        taskConfigSource: useAccountTaskConfig ? 'account' : 'global',
        useAccountTaskConfig,
        globalScheduledEnabled,
        globalRules,
        accountRules,
        effectiveRules,
        useAccountRules,
      };
    },

    setAccountGlobalScheduledEnabled(accountId: string, enabled: boolean): void {
      updateAccountListingSettings(accountId, { globalScheduledEnabled: enabled });
    },

    isAccountGlobalScheduledEnabled(accountId: string): boolean {
      return getAccount(accountId)?.listingSettings?.globalScheduledEnabled !== false;
    },

    getLogs(accountId: string): LogEntry[] {
      const account = getAccount(accountId);
      if (!account) return [];
      return account.logs.filter(log => log.timestamp > recentCutoff(deps.now()));
    },

    addLog(accountId: string, log: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry | null {
      const now = deps.now();
      const entry: LogEntry = {
        ...log,
        id: deps.createId(),
        timestamp: now,
      };
      const accounts = deps.getAccounts();
      const account = accounts.find(item => item.id === accountId);
      if (!account) return null;
      const nextAccount: FullAccount = {
        ...account,
        logs: [
          ...account.logs.filter(item => item.timestamp > recentCutoff(now)),
          entry,
        ],
      };
      deps.setAccounts(accounts.map(item => item.id === accountId ? nextAccount : item));
      return entry;
    },

    clearLogs(accountId: string): void {
      const accounts = deps.getAccounts();
      deps.setAccounts(accounts.map(account => account.id === accountId ? { ...account, logs: [] } : account));
    },

    cleanOldLogs(): void {
      const now = deps.now();
      const accounts = deps.getAccounts();
      let changed = false;
      const next = accounts.map(account => {
        const logs = account.logs.filter(log => log.timestamp > recentCutoff(now));
        if (logs.length !== account.logs.length) changed = true;
        return logs.length === account.logs.length ? account : { ...account, logs };
      });
      if (changed) deps.setAccounts(next);
    },

    getBlacklistRules(): BlacklistRule[] {
      return getGlobalRules().blacklistRules;
    },

    setBlacklistRules(rules: BlacklistRule[]): void {
      const defaultCodes = new Set(DEFAULT_BLACKLIST.map(rule => rule.code));
      deps.setGlobal('blacklistRules', rules.filter(rule => !defaultCodes.has(rule.code)));
    },

    getSkipKeywords(): string[] {
      return getGlobalRules().skipKeywords;
    },

    setSkipKeywords(keywords: string[]): void {
      deps.setGlobal('skipKeywords', keywords);
    },

    getStatusRules(): StatusRule[] {
      return getGlobalRules().statusRules;
    },

    setStatusRules(rules: StatusRule[]): void {
      deps.setGlobal('statusRules', rules);
    },

    getAccountRules(accountId: string): ListingRulesConfig {
      return getAccountRules(accountId);
    },

    setAccountRules(accountId: string, rules: ListingRulesConfig): void {
      updateAccountListingSettings(accountId, { useAccountRules: true }, { listingRules: rules });
    },

    setAccountRulesEnabled(accountId: string, enabled: boolean): void {
      const account = getAccount(accountId);
      updateAccountListingSettings(
        accountId,
        { useAccountRules: enabled },
        enabled && !account?.listingRules ? { listingRules: getGlobalRules() } : undefined,
      );
    },

    getEffectiveRules(accountId: string) {
      const account = getAccount(accountId);
      if (account?.listingSettings?.useAccountRules) {
        return { ...getAccountRules(accountId), source: 'account' as const };
      }
      return { ...getGlobalRules(), source: 'global' as const };
    },

    getEffectiveBlacklistRules(accountId: string): BlacklistRule[] {
      return this.getEffectiveRules(accountId).blacklistRules;
    },

    getEffectiveSkipKeywords(accountId: string): string[] {
      return this.getEffectiveRules(accountId).skipKeywords;
    },

    getEffectiveStatusRules(accountId: string): StatusRule[] {
      return this.getEffectiveRules(accountId).statusRules;
    },
  };
}
