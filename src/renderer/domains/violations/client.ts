import type { LogEntry } from '../../../shared/listing';
import type { ViolationMatch, ViolationScanResult, ViolationScanStepResult } from '../../../shared/violations';

export const violationsClient = {
  getWords(accountId: string): Promise<string[]> {
    return window.wishop.violation.getWords(accountId);
  },
  saveWords(accountId: string, words: string[]): Promise<void> {
    return window.wishop.violation.setWords(accountId, words);
  },
  batchScan(accountId: string, limit?: number): Promise<ViolationScanResult> {
    return window.wishop.violation.batchScan(accountId, limit);
  },
  scanStep(accountId: string, action: 'next' | 'skip' | 'delete'): Promise<ViolationScanStepResult> {
    return window.wishop.violation.scanStep(accountId, action);
  },
  batchDelete(accountId: string, violations: ViolationMatch[]): Promise<{ deleted: number; errors: number; stopped: boolean }> {
    return window.wishop.violation.batchDelete(accountId, violations);
  },
  stop(accountId: string): Promise<void> {
    return window.wishop.violation.stop(accountId);
  },
  onLog(accountId: string, callback: (log: LogEntry) => void): () => void {
    return window.wishop.violation.onLog(accountId, callback);
  },
};
