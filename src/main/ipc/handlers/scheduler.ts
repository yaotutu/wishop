import { ipcMain } from 'electron';
import { getScheduler, setScheduler } from '../../store';
import type { SchedulerConfig } from '../../../shared/types';
import { startScheduler, stopScheduler } from '../../scheduler/listing-scheduler';

export function registerSchedulerHandlers(): void {
  ipcMain.handle('scheduler:get', (_, accountId: string): SchedulerConfig => {
    return getScheduler(accountId);
  });

  ipcMain.handle('scheduler:set', (_, accountId: string, scheduler: SchedulerConfig): void => {
    setScheduler(accountId, scheduler);
    if (scheduler.enabled) {
      startScheduler(accountId);
    } else {
      stopScheduler(accountId);
    }
  });

  ipcMain.handle('scheduler:start', (_, accountId: string): void => {
    startScheduler(accountId);
  });

  ipcMain.handle('scheduler:stop', (_, accountId: string): void => {
    stopScheduler(accountId);
  });
}
