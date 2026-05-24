import type { AppSettings, AppSettingsPatch } from '../../../shared/settings';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from '../../../shared/settings';

export interface AppSettingsRepositoryDeps {
  getSettings: () => AppSettings | undefined;
  setSettings: (settings: AppSettings) => void;
  getShipmentCheckDefaultOffMigrationApplied?: () => boolean | undefined;
  setShipmentCheckDefaultOffMigrationApplied?: (value: boolean) => void;
}

export function createAppSettingsRepository(deps: AppSettingsRepositoryDeps) {
  function applyShipmentCheckDefaultOffMigration(settings: AppSettings): AppSettings {
    if (
      !deps.getShipmentCheckDefaultOffMigrationApplied
      || !deps.setShipmentCheckDefaultOffMigrationApplied
      || deps.getShipmentCheckDefaultOffMigrationApplied()
    ) {
      return settings;
    }

    const next = settings.shipmentCheck.enabled
      ? normalizeAppSettings({
        ...settings,
        shipmentCheck: {
          ...settings.shipmentCheck,
          enabled: false,
        },
      })
      : settings;
    deps.setShipmentCheckDefaultOffMigrationApplied(true);
    if (next !== settings) deps.setSettings(next);
    return next;
  }

  return {
    getAppSettings(): AppSettings {
      return applyShipmentCheckDefaultOffMigration(normalizeAppSettings(deps.getSettings() || DEFAULT_APP_SETTINGS));
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
