import type { AppSettings, AppSettingsPatch } from '../../../shared/settings';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from '../../../shared/settings';

export interface AppSettingsRepositoryDeps {
  getSettings: () => AppSettings | undefined;
  setSettings: (settings: AppSettings) => void;
}

export function createAppSettingsRepository(deps: AppSettingsRepositoryDeps) {
  return {
    getAppSettings(): AppSettings {
      return normalizeAppSettings(deps.getSettings() || DEFAULT_APP_SETTINGS);
    },

    updateAppSettings(patch: AppSettingsPatch): AppSettings {
      const current = this.getAppSettings();
      const next = normalizeAppSettings({
        ...current,
        ...patch,
        shipmentCheck: {
          ...current.shipmentCheck,
          ...patch.shipmentCheck,
        },
      });
      deps.setSettings(next);
      return next;
    },
  };
}
