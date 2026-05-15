import { ipcMain } from 'electron';
import { getBlacklistRules, setBlacklistRules } from '../../store';
import type { BlacklistRule } from '../../../shared/types';

export function registerBlacklistRulesHandlers(): void {
  ipcMain.handle('blacklistRules:get', (): BlacklistRule[] => {
    return getBlacklistRules();
  });

  ipcMain.handle('blacklistRules:set', (_, rules: BlacklistRule[]): void => {
    setBlacklistRules(rules);
  });
}
