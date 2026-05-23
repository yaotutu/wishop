import { ipcMain } from 'electron';
import {
  getListingSettings,
  setAccountGlobalScheduledEnabled,
  setAccountRules,
  setAccountRulesEnabled,
  setAccountTaskConfigEnabled,
  setGlobalTaskConfig,
} from '../../store';
import type { ListingRulesConfig, ListingSettings, TaskConfig } from '../../../shared/types';

export function registerListingSettingsHandlers(): void {
  ipcMain.handle('listingSettings:get', (_, accountId: string): ListingSettings => {
    return getListingSettings(accountId);
  });

  ipcMain.handle('listingSettings:setGlobalTaskConfig', (_, config: TaskConfig): void => {
    setGlobalTaskConfig(config);
  });

  ipcMain.handle('listingSettings:setAccountTaskConfigEnabled', (_, accountId: string, enabled: boolean): void => {
    setAccountTaskConfigEnabled(accountId, enabled);
  });

  ipcMain.handle('listingSettings:setGlobalScheduledEnabled', (_, accountId: string, enabled: boolean): void => {
    setAccountGlobalScheduledEnabled(accountId, enabled);
  });

  ipcMain.handle('listingSettings:setAccountRulesEnabled', (_, accountId: string, enabled: boolean): void => {
    setAccountRulesEnabled(accountId, enabled);
  });

  ipcMain.handle('listingSettings:setAccountRules', (_, accountId: string, rules: ListingRulesConfig): void => {
    setAccountRules(accountId, rules);
  });
}
