import { z } from 'zod';

export const syncModuleKeySchema = z.enum([
  'accounts',
  'orders',
  'listing',
  'violations',
  'scheduling',
  'settings',
  'taobao',
]);

export type SyncModuleKey = z.infer<typeof syncModuleKeySchema>;

export const syncModeSchema = z.enum(['localOnly', 'syncEnabled', 'cloudExecutionEnabled']);
export type SyncMode = z.infer<typeof syncModeSchema>;

export const syncModuleSettingSchema = z.object({
  mode: syncModeSchema,
  syncEnabled: z.boolean(),
  cloudExecutionEnabled: z.boolean(),
});

export type SyncModuleSetting = z.infer<typeof syncModuleSettingSchema>;

export const syncSettingsSchema = z.object({
  modules: z.record(syncModuleKeySchema, syncModuleSettingSchema),
  updatedAt: z.number(),
});

export type SyncSettings = z.infer<typeof syncSettingsSchema>;

export type SyncDataCategory = 'source' | 'secret' | 'cache' | 'runtime';

export interface SyncClassification {
  category: SyncDataCategory;
  syncable: boolean;
  reason: string;
}

export const DEFAULT_SYNC_MODULE_SETTING: SyncModuleSetting = {
  mode: 'localOnly',
  syncEnabled: false,
  cloudExecutionEnabled: false,
};

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  modules: {
    accounts: { ...DEFAULT_SYNC_MODULE_SETTING },
    orders: { ...DEFAULT_SYNC_MODULE_SETTING },
    listing: { ...DEFAULT_SYNC_MODULE_SETTING },
    violations: { ...DEFAULT_SYNC_MODULE_SETTING },
    scheduling: { ...DEFAULT_SYNC_MODULE_SETTING },
    settings: { ...DEFAULT_SYNC_MODULE_SETTING },
    taobao: { ...DEFAULT_SYNC_MODULE_SETTING },
  },
  updatedAt: 0,
};

const SYNC_CLASSIFICATIONS: Record<string, SyncClassification> = {
  accounts: { category: 'source', syncable: true, reason: '店铺元数据是用户创建的重要配置' },
  credentials: { category: 'secret', syncable: true, reason: '用户授权后可上传给云端任务使用' },
  orders: { category: 'cache', syncable: false, reason: '微信订单可通过 API 重新获取' },
  orderAssociations: { category: 'source', syncable: true, reason: '订单关联和内部备注是用户维护数据' },
  productSources: { category: 'source', syncable: true, reason: '货源信息是用户维护数据' },
  realAddresses: { category: 'cache', syncable: false, reason: '真实地址敏感且可重新获取' },
  listingRules: { category: 'source', syncable: true, reason: '提审规则是用户配置' },
  taskRuntime: { category: 'runtime', syncable: false, reason: '运行状态只属于当前设备会话' },
  taobaoSnapshots: { category: 'cache', syncable: false, reason: '淘宝页面快照可重新获取' },
  logs: { category: 'runtime', syncable: false, reason: '日志不作为云同步核心数据' },
};

export function getSyncClassification(recordType: string): SyncClassification {
  return SYNC_CLASSIFICATIONS[recordType] || {
    category: 'cache',
    syncable: false,
    reason: '未明确分类的数据默认不进入云同步',
  };
}

export function normalizeSyncSettings(input: unknown, now = Date.now()): SyncSettings {
  const parsed = syncSettingsSchema.safeParse(input);
  if (parsed.success) {
    return {
      modules: {
        ...DEFAULT_SYNC_SETTINGS.modules,
        ...parsed.data.modules,
      },
      updatedAt: parsed.data.updatedAt || now,
    };
  }

  return {
    ...DEFAULT_SYNC_SETTINGS,
    modules: { ...DEFAULT_SYNC_SETTINGS.modules },
    updatedAt: now,
  };
}

