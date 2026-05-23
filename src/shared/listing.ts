export interface LogEntry {
  id: string;
  timestamp: number;
  runId: string;
  productId: string;
  productTitle: string;
  action: 'list' | 'delete' | 'check' | 'skip';
  status: 'success' | 'failed';
  errorCode?: number;
  errorMsg?: string;
}

export interface TaskConfig {
  listUnreviewed: boolean;
  listUnreviewedQuantity: number;
  autoDeleteFailed: boolean;
}

export type ListingConfigSource = 'global' | 'account';

export interface DraftProduct {
  productId: string;
  title: string;
  headImgs: string[];
  status: number;
  editStatus: number;
}

export interface QuotaResult {
  quota: number;
  total: number;
}

export interface ErrorCodeSummary {
  code: number;
  count: number;
  msg: string;
}

export interface TaskCycleResult {
  scanned: number;
  deleted: number;
  listed: number;
  errors: number;
  skipped: number;
  stopped: boolean;
  reason?: string;
  errorCodes?: ErrorCodeSummary[];
  pendingCount?: number;
}

export type AddLogFn = (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;

export interface BlacklistRule {
  code: number;
  description?: string;
}

export type StatusAction = 'submit' | 'delete' | 'skip';

export interface StatusRule {
  editStatus: number;
  label: string;
  action: StatusAction;
}

export interface ListingRulesConfig {
  blacklistRules: BlacklistRule[];
  skipKeywords: string[];
  statusRules: StatusRule[];
}

export interface EffectiveListingRules extends ListingRulesConfig {
  source: ListingConfigSource;
}

export interface ListingSettings {
  globalTaskConfig: TaskConfig;
  accountTaskConfig: TaskConfig;
  effectiveTaskConfig: TaskConfig;
  taskConfigSource: ListingConfigSource;
  useAccountTaskConfig: boolean;
  globalScheduledEnabled: boolean;
  globalRules: ListingRulesConfig;
  accountRules: ListingRulesConfig;
  effectiveRules: EffectiveListingRules;
  useAccountRules: boolean;
}
