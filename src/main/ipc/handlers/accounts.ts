import { ipcMain } from 'electron';
import { getAccounts, addAccount, removeAccount, updateAccount, getActiveAccountId, setActiveAccountId } from '../../store';
import type { Config, Account } from '../../../shared/types';
import { stopAllTasks } from '../../scheduler/listing-scheduler';
import { removeClient } from '../../wxshop/client-registry';

export function registerAccountHandlers(context: { draftPaginationMap: Map<string, unknown> }): void {
  ipcMain.handle('accounts:list', (): Account[] => {
    return getAccounts();
  });

  ipcMain.handle('accounts:add', (_, name: string, config: Config): Account => {
    return addAccount(name, config);
  });

  ipcMain.handle('accounts:remove', (_, accountId: string): void => {
    stopAllTasks();
    removeAccount(accountId);
    removeClient(accountId);
    context.draftPaginationMap.delete(accountId);
  });

  ipcMain.handle('accounts:update', (_, accountId: string, patch: Partial<Pick<Account, 'name' | 'config'>>): void => {
    updateAccount(accountId, patch);
  });

  ipcMain.handle('accounts:getActive', (): string => {
    return getActiveAccountId();
  });

  ipcMain.handle('accounts:setActive', (_, accountId: string): void => {
    setActiveAccountId(accountId);
  });
}
