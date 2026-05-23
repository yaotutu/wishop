import type { GlobalLogEntry } from '../../../shared/global-log';

export const systemClient = {
  globalLogs: {
    list(): Promise<GlobalLogEntry[]> {
      return window.wishop.globalLogs.list();
    },
    clear(): Promise<void> {
      return window.wishop.globalLogs.clear();
    },
  },
};
