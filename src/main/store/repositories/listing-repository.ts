import type { BlacklistRule, FullAccount, LogEntry, StatusRule, TaskConfig } from '../../../shared/types';

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

  return {
    getDefaultBlacklistCodes(): number[] {
      return DEFAULT_BLACKLIST.map(rule => rule.code);
    },

    getDefaultStatusRules(): StatusRule[] {
      return DEFAULT_STATUS_RULES;
    },

    getTaskConfig(accountId: string): TaskConfig {
      return getAccount(accountId)?.taskConfig || DEFAULT_TASK_CONFIG;
    },

    setTaskConfig(accountId: string, taskConfig: TaskConfig): void {
      const accounts = deps.getAccounts();
      deps.setAccounts(accounts.map(account => account.id === accountId ? { ...account, taskConfig } : account));
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
      return mergeByCode(deps.getGlobal<BlacklistRule[]>('blacklistRules'));
    },

    setBlacklistRules(rules: BlacklistRule[]): void {
      const defaultCodes = new Set(DEFAULT_BLACKLIST.map(rule => rule.code));
      deps.setGlobal('blacklistRules', rules.filter(rule => !defaultCodes.has(rule.code)));
    },

    getSkipKeywords(): string[] {
      return deps.getGlobal<string[]>('skipKeywords') || [];
    },

    setSkipKeywords(keywords: string[]): void {
      deps.setGlobal('skipKeywords', keywords);
    },

    getStatusRules(): StatusRule[] {
      return mergeByEditStatus(deps.getGlobal<StatusRule[]>('statusRules'));
    },

    setStatusRules(rules: StatusRule[]): void {
      deps.setGlobal('statusRules', rules);
    },
  };
}

