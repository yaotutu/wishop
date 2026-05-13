import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { createScopedAddLog, getViolationWords, setViolationWords, getAccount } from '../../store';
import type { ViolationMatch, ViolationScanResult } from '../../../shared/types';
import { getClient } from '../../wxshop/client-registry';
import { batchScan, scanOneByOne, batchDeleteViolations } from '../../modules/violation-detect';
import { createLogForwarder, withLogForwarding, LogForwarder } from '../utils/log-forwarding';
import { SessionManager } from '../utils/session-manager';

interface ScanSessionState {
  generator: AsyncGenerator<ViolationMatch & { scanned: number }> | null;
  current: (ViolationMatch & { scanned: number }) | null;
  done: boolean;
  logForwarder: LogForwarder;
}

export function registerViolationHandlers(context: {
  scanSessions: SessionManager<ScanSessionState>;
}): void {

  ipcMain.handle('violation:getWords', (_, accountId: string): string[] => {
    return getViolationWords(accountId);
  });

  ipcMain.handle('violation:setWords', (_, accountId: string, words: string[]): void => {
    setViolationWords(accountId, words);
  });

  ipcMain.handle('violation:batchScan', async (event: IpcMainInvokeEvent, accountId: string, limit?: number): Promise<ViolationScanResult> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = getClient(accountId);
    const words = getViolationWords(accountId);

    const account = getAccount(accountId);
    console.log(`[Violation] 批量扫描开始 店铺=${account?.name || '未知'} appId=${api.config.appId} 词库=${words.length}个 上限=${limit || '全部'}`);

    if (words.length === 0) {
      console.log(`[Violation] 词库为空，跳过`);
      return { scanned: 0, violations: [], errors: 0, stopped: false, reason: '词库为空' };
    }

    const logForwarder = createLogForwarder(event, accountId, `violation:log:${accountId}`);
    const signal = context.scanSessions.start(accountId, { generator: null, current: null, done: false, logForwarder });
    logForwarder.start();

    try {
      return await batchScan(api, scopedAddLog, words, runId, signal, limit);
    } finally {
      context.scanSessions.complete(accountId);
      logForwarder.stop();
    }
  });

  ipcMain.handle('violation:scanStep', async (event: IpcMainInvokeEvent, accountId: string, action: 'next' | 'skip' | 'delete'): Promise<any> => {
    let session = context.scanSessions.get(accountId);

    if (!session || session.state.done) {
      const words = getViolationWords(accountId);
      if (words.length === 0) {
        return { type: 'done', reason: '词库为空' };
      }
      const account = getAccount(accountId);
      const api = getClient(accountId);
      console.log(`[Violation] 逐个扫描开始 店铺=${account?.name || '未知'} appId=${api.config.appId} 词库=${words.length}个`);
      const scopedAddLog = createScopedAddLog(accountId);
      const runId = Date.now().toString();
      const logForwarder = createLogForwarder(event, accountId, `violation:log:${accountId}`);
      logForwarder.start();

      const signal = context.scanSessions.start(accountId, { generator: null, current: null, done: false, logForwarder });
      const generator = scanOneByOne(api, scopedAddLog, words, runId, signal);
      session = context.scanSessions.get(accountId)!;
      session.state.generator = generator;
    }

    if (action === 'delete' && session.state.current) {
      const scopedAddLog = createScopedAddLog(accountId);
      const runId = Date.now().toString();
      const api = getClient(accountId);

      try {
        const result = await batchDeleteViolations(api, scopedAddLog, [session.state.current], runId);
        if (result.stopped) {
          session.state.done = true;
          session.state.logForwarder.stop();
          context.scanSessions.stop(accountId);
          return { type: 'stopped', reason: '删除触发全局限制' };
        }
      } catch {}
    }

    const next = await session.state.generator!.next();
    if (next.done) {
      session.state.done = true;
      session.state.logForwarder.stop();
      context.scanSessions.complete(accountId);
      return { type: 'done', scanned: session.state.current?.scanned || 0 };
    }

    session.state.current = next.value;
    return { type: 'violation', ...next.value };
  });

  ipcMain.handle('violation:batchDelete', async (event: IpcMainInvokeEvent, accountId: string, violations: ViolationMatch[]): Promise<{ deleted: number; errors: number; stopped: boolean }> => {
    const runId = Date.now().toString();
    const scopedAddLog = createScopedAddLog(accountId);
    const api = getClient(accountId);

    return withLogForwarding(event, accountId, `violation:log:${accountId}`, async () => {
      return await batchDeleteViolations(api, scopedAddLog, violations, runId);
    });
  });

  ipcMain.handle('violation:stop', (_, accountId: string): void => {
    const session = context.scanSessions.get(accountId);
    if (session) {
      session.state.logForwarder.stop();
      context.scanSessions.stop(accountId);
    }
  });
}
