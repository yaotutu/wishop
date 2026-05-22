import { ipcMain } from 'electron';
import { addGlobalLog, clearGlobalLogs, getGlobalLogs } from '../../store';
import type { GlobalLogEntry, GlobalLogInput } from '../../../shared/global-log';

export function registerGlobalLogHandlers(): void {
  ipcMain.handle('globalLogs:list', (): GlobalLogEntry[] => {
    return getGlobalLogs();
  });

  ipcMain.handle('globalLogs:add', (_, input: GlobalLogInput): GlobalLogEntry => {
    return addGlobalLog(input);
  });

  ipcMain.handle('globalLogs:clear', (): void => {
    clearGlobalLogs();
  });
}
