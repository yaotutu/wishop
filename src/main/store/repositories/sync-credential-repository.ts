import type { CredentialMeta } from '../../../shared/credentials';
import { authorizeCredentialForCloud, createCredentialMeta, revokeCredentialCloudAuthorization } from '../../../shared/credentials';
import type { SyncModuleKey, SyncModuleSetting, SyncSettings } from '../../../shared/sync';
import { DEFAULT_SYNC_SETTINGS, normalizeSyncSettings } from '../../../shared/sync';

export interface SyncCredentialRepositoryDeps {
  getSyncSettings: () => SyncSettings | undefined;
  setSyncSettings: (settings: SyncSettings) => void;
  getCredentialMetas: () => CredentialMeta[];
  setCredentialMetas: (metas: CredentialMeta[]) => void;
  now: () => number;
}

export function createSyncCredentialRepository(deps: SyncCredentialRepositoryDeps) {
  return {
    getSyncSettings(): SyncSettings {
      return normalizeSyncSettings(deps.getSyncSettings() || DEFAULT_SYNC_SETTINGS);
    },

    updateSyncModuleSetting(module: SyncModuleKey, patch: Partial<SyncModuleSetting>): SyncSettings {
      const current = this.getSyncSettings();
      const currentModule = current.modules[module] || DEFAULT_SYNC_SETTINGS.modules[module];
      const nextModule: SyncModuleSetting = {
        ...currentModule,
        ...patch,
      };
      if (!nextModule.syncEnabled && !nextModule.cloudExecutionEnabled) {
        nextModule.mode = 'localOnly';
      } else if (nextModule.cloudExecutionEnabled) {
        nextModule.mode = 'cloudExecutionEnabled';
        nextModule.syncEnabled = true;
      } else {
        nextModule.mode = 'syncEnabled';
      }
      const next: SyncSettings = {
        modules: {
          ...current.modules,
          [module]: nextModule,
        },
        updatedAt: deps.now(),
      };
      deps.setSyncSettings(next);
      return next;
    },

    getCredentialMetas(accountId?: string): CredentialMeta[] {
      const metas = deps.getCredentialMetas();
      return accountId ? metas.filter(meta => meta.accountId === accountId) : metas;
    },

    saveLocalCredentialMeta(input: {
      accountId: string;
      platform: CredentialMeta['platform'];
      scope: CredentialMeta['scope'];
    }): CredentialMeta {
      const meta = createCredentialMeta(input);
      deps.setCredentialMetas([...deps.getCredentialMetas(), meta]);
      return meta;
    },

    authorizeCredentialMetaForCloud(credentialId: string): CredentialMeta {
      const metas = deps.getCredentialMetas();
      const existing = metas.find(meta => meta.credentialId === credentialId);
      if (!existing) throw new Error(`凭据不存在: ${credentialId}`);
      const next = authorizeCredentialForCloud(existing);
      deps.setCredentialMetas(metas.map(meta => meta.credentialId === credentialId ? next : meta));
      return next;
    },

    revokeCredentialMetaCloudAuthorization(credentialId: string): CredentialMeta {
      const metas = deps.getCredentialMetas();
      const existing = metas.find(meta => meta.credentialId === credentialId);
      if (!existing) throw new Error(`凭据不存在: ${credentialId}`);
      const next = revokeCredentialCloudAuthorization(existing);
      deps.setCredentialMetas(metas.map(meta => meta.credentialId === credentialId ? next : meta));
      return next;
    },
  };
}
