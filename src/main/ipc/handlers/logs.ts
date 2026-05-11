import { ipcMain } from 'electron';
import { getLogs, clearLogs } from '../../store';
import type { LogEntry } from '../../../shared/types';

export function registerLogHandlers(): void {
  ipcMain.handle('logs:get', (_, accountId: string): LogEntry[] => {
    return getLogs(accountId);
  });

  ipcMain.handle('logs:clear', (_, accountId: string): void => {
    clearLogs(accountId);
  });
}
