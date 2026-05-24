import { describe, expect, it } from 'vitest';
import { createAppSettingsRepository } from './app-settings-repository';
import type { AppSettings } from '../../../shared/settings';
import { DEFAULT_APP_SETTINGS } from '../../../shared/settings';

describe('app settings repository', () => {
  it('disables an existing shipment check setting once for the safety migration', () => {
    let settings: AppSettings | undefined = {
      ...DEFAULT_APP_SETTINGS,
      shipmentCheck: {
        ...DEFAULT_APP_SETTINGS.shipmentCheck,
        enabled: true,
      },
    };
    let migrationApplied = false;
    const repo = createAppSettingsRepository({
      getSettings: () => settings,
      setSettings: next => { settings = next; },
      getShipmentCheckDefaultOffMigrationApplied: () => migrationApplied,
      setShipmentCheckDefaultOffMigrationApplied: value => { migrationApplied = value; },
    });

    expect(repo.getAppSettings().shipmentCheck.enabled).toBe(false);
    expect(migrationApplied).toBe(true);

    repo.updateAppSettings({ shipmentCheck: { enabled: true } });

    expect(repo.getAppSettings().shipmentCheck.enabled).toBe(true);
  });
});
