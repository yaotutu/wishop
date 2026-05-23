import type { LicenseActivationInput, LicenseState } from '../../../shared/types';
import type { AppSettings, AppSettingsPatch } from '../../../shared/settings';
import type { CredentialMeta, CredentialSecretInput } from '../../../shared/credentials';
import type { SyncModuleKey, SyncModuleSetting, SyncSettings } from '../../../shared/sync';

export const settingsClient = {
  license: {
    get(): Promise<LicenseState> {
      return window.wishop.license.get();
    },
    activate(input: LicenseActivationInput): Promise<LicenseState> {
      return window.wishop.license.activate(input);
    },
    clear(): Promise<LicenseState> {
      return window.wishop.license.clear();
    },
  },
  appSettings: {
    get(): Promise<AppSettings> {
      return window.wishop.settings.get();
    },
    update(patch: AppSettingsPatch): Promise<AppSettings> {
      return window.wishop.settings.update(patch);
    },
  },
  sync: {
    getSettings(): Promise<SyncSettings> {
      return window.wishop.sync.getSettings();
    },
    updateModuleSetting(module: SyncModuleKey, patch: Partial<SyncModuleSetting>): Promise<SyncSettings> {
      return window.wishop.sync.updateModuleSetting(module, patch);
    },
  },
  credentials: {
    getMeta(): Promise<CredentialMeta[]> {
      return window.wishop.credentials.getMeta();
    },
    saveLocal(input: CredentialSecretInput): Promise<CredentialMeta> {
      return window.wishop.credentials.saveLocal(input);
    },
    authorizeCloud(credentialId: string): Promise<CredentialMeta> {
      return window.wishop.credentials.authorizeCloud(credentialId);
    },
    revokeCloud(credentialId: string): Promise<CredentialMeta> {
      return window.wishop.credentials.revokeCloud(credentialId);
    },
  },
};
